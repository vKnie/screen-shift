<?php
namespace App\Repository;

use App\Entity\Picture;
use App\Entity\Screen;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Picture>
 */
class PictureRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Picture::class);
    }

    /**
     * Récupère toutes les pictures avec leurs screens et groupes en une seule requête
     * Évite le problème N+1
     */
    public function findAllWithScreensAndGroups(): array
    {
        return $this->createQueryBuilder('p')
            ->leftJoin('p.screens', 's')
            ->leftJoin('s.groupeScreen', 'g')
            ->addSelect('s', 'g')
            ->orderBy('p.id', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Récupère les pictures accessibles selon les rôles de l'utilisateur
     * Optimisé pour éviter N+1
     */
    public function findByUserRoles(array $userRoles): array
    {
        return $this->createQueryBuilder('p')
            ->leftJoin('p.screens', 's')
            ->leftJoin('s.groupeScreen', 'g')
            ->addSelect('s', 'g')
            ->where('g.role IN (:roles)')
            ->setParameter('roles', $userRoles)
            ->orderBy('p.id', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Récupère une picture avec ses screens et groupes
     * Pour les actions edit/delete
     */
    public function findOneWithScreensAndGroups(int $id): ?Picture
    {
        return $this->createQueryBuilder('p')
            ->leftJoin('p.screens', 's')
            ->leftJoin('s.groupeScreen', 'g')
            ->addSelect('s', 'g')
            ->where('p.id = :id')
            ->setParameter('id', $id)
            ->getQuery()
            ->getOneOrNullResult();
    }

    /**
     * Vérifie si l'utilisateur a accès à une picture donnée
     */
    public function userHasAccessToPicture(int $pictureId, array $userRoles): bool
    {
        $result = $this->createQueryBuilder('p')
            ->select('COUNT(p.id)')
            ->leftJoin('p.screens', 's')
            ->leftJoin('s.groupeScreen', 'g')
            ->where('p.id = :pictureId')
            ->andWhere('g.role IN (:roles)')
            ->setParameter('pictureId', $pictureId)
            ->setParameter('roles', $userRoles)
            ->getQuery()
            ->getSingleScalarResult();

        return $result > 0;
    }

    // === MÉTHODES EXISTANTES POUR LA GESTION DES POSITIONS ===

    /**
     * Trouve toutes les images d'un écran triées par position
     */
    public function findByScreenOrderedByPosition(Screen $screen): array
    {
        return $this->createQueryBuilder('p')
            ->where('p.screenPicture = :screen')
            ->setParameter('screen', $screen)
            ->orderBy('p.position', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Trouve la prochaine position disponible pour un écran donné
     */
    public function getNextPosition(Screen $screen): int
    {
        $result = $this->createQueryBuilder('p')
            ->select('MAX(p.position)')
            ->where('p.screenPicture = :screen')
            ->setParameter('screen', $screen)
            ->getQuery()
            ->getSingleScalarResult();
        
        return ($result ?? 0) + 1;
    }

    /**
     * Vérifie si une position est déjà utilisée pour un écran donné
     */
    public function isPositionUsed(Screen $screen, int $position, ?Picture $excludePicture = null): bool
    {
        $qb = $this->createQueryBuilder('p')
            ->select('COUNT(p.id)')
            ->where('p.screenPicture = :screen')
            ->andWhere('p.position = :position')
            ->setParameter('screen', $screen)
            ->setParameter('position', $position);
        
        if ($excludePicture) {
            $qb->andWhere('p.id != :excludeId')
               ->setParameter('excludeId', $excludePicture->getId());
        }
        
        return $qb->getQuery()->getSingleScalarResult() > 0;
    }

    /**
     * Réorganise les positions après suppression d'une image
     */
    public function reorderPositionsAfterDeletion(Screen $screen, int $deletedPosition): void
    {
        $this->createQueryBuilder('p')
            ->update()
            ->set('p.position', 'p.position - 1')
            ->where('p.screenPicture = :screen')
            ->andWhere('p.position > :deletedPosition')
            ->setParameter('screen', $screen)
            ->setParameter('deletedPosition', $deletedPosition)
            ->getQuery()
            ->execute();
    }

    /**
     * Déplace une image d'une position à une autre
     */
    public function moveToPosition(Picture $picture, int $newPosition): void
    {
        $screen = $picture->getScreenPicture();
        $oldPosition = $picture->getPosition();
        
        if ($oldPosition === $newPosition) {
            return;
        }
        
        $entityManager = $this->getEntityManager();
        
        if ($newPosition > $oldPosition) {
            // Déplacer vers le bas : décrémenter les positions entre old et new
            $this->createQueryBuilder('p')
                ->update()
                ->set('p.position', 'p.position - 1')
                ->where('p.screenPicture = :screen')
                ->andWhere('p.position > :oldPosition')
                ->andWhere('p.position <= :newPosition')
                ->setParameter('screen', $screen)
                ->setParameter('oldPosition', $oldPosition)
                ->setParameter('newPosition', $newPosition)
                ->getQuery()
                ->execute();
        } else {
            // Déplacer vers le haut : incrémenter les positions entre new et old
            $this->createQueryBuilder('p')
                ->update()
                ->set('p.position', 'p.position + 1')
                ->where('p.screenPicture = :screen')
                ->andWhere('p.position >= :newPosition')
                ->andWhere('p.position < :oldPosition')
                ->setParameter('screen', $screen)
                ->setParameter('newPosition', $newPosition)
                ->setParameter('oldPosition', $oldPosition)
                ->getQuery()
                ->execute();
        }
        
        // Mettre à jour la position de l'image
        $picture->setPosition($newPosition);
        $entityManager->flush();
    }

    /**
     * Trouve toutes les positions utilisées pour un écran donné
     */
    public function getUsedPositions(Screen $screen): array
    {
        $result = $this->createQueryBuilder('p')
            ->select('p.position')
            ->where('p.screenPicture = :screen')
            ->setParameter('screen', $screen)
            ->orderBy('p.position', 'ASC')
            ->getQuery()
            ->getArrayResult();
        
        return array_column($result, 'position');
    }

    /**
     * Trouve les gaps dans les positions (positions manquantes)
     */
    public function findPositionGaps(Screen $screen): array
    {
        $usedPositions = $this->getUsedPositions($screen);
        if (empty($usedPositions)) {
            return [];
        }
        
        $gaps = [];
        $maxPosition = max($usedPositions);
        
        for ($i = 1; $i < $maxPosition; $i++) {
            if (!in_array($i, $usedPositions)) {
                $gaps[] = $i;
            }
        }
        
        return $gaps;
    }

    /**
     * Compacte les positions en supprimant les gaps
     */
    public function compactPositions(Screen $screen): void
    {
        $pictures = $this->findByScreenOrderedByPosition($screen);
        $entityManager = $this->getEntityManager();
        
        $newPosition = 1;
        foreach ($pictures as $picture) {
            if ($picture->getPosition() !== $newPosition) {
                $picture->setPosition($newPosition);
            }
            $newPosition++;
        }
        
        $entityManager->flush();
    }
}