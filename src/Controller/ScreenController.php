<?php

namespace App\Controller;

use App\Entity\Screen;
use App\Entity\Group;
use App\Entity\User;
use App\Form\ScreenForm;
use App\Repository\ScreenRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Cache\Adapter\FilesystemAdapter;
use Psr\Log\LoggerInterface;

final class ScreenController extends AbstractController
{
    private $requestStack;
    private $cache;
    private $logger;

    public function __construct(RequestStack $requestStack, LoggerInterface $logger)
    {
        $this->requestStack = $requestStack;
        $this->cache = new FilesystemAdapter('screen_cache', 3600); // Cache 1h
        $this->logger = $logger;
    }

    #[IsGranted('ROLE_ACCESS')]
    #[Route('/screen', name: 'app_screen')]
    public function index(ScreenRepository $screenRepository): Response
    {
        return $this->render('screen/index.html.twig', [
            'screens' => $screenRepository->findAll(),
        ]);
    }

    #[IsGranted('ROLE_ACCESS')]
    #[Route('/screen/create', name: 'create_screen')]
    public function create(Request $request, EntityManagerInterface $em): Response
    {
        $screen = new Screen();
        $form = $this->createForm(ScreenForm::class, $screen);
        $form->handleRequest($request);
       
        if ($form->isSubmitted() && $form->isValid()) {
            try {
                $selectedGroupe = $screen->getGroupeScreen();
                $currentUser = $this->getUser();
               
                // Vérifier si l'utilisateur a le rôle du groupe sélectionné
                if (!$this->userHasGroupeRole($currentUser, $selectedGroupe)) {
                    $this->addFlash('error', sprintf('Vous n\'avez pas les permissions pour créer un screen pour le groupe "%s". Rôle requis : %s', 
                        $selectedGroupe->getName(), 
                        $selectedGroupe->getRole()
                    ));
                    return $this->render('screen/form.html.twig', [
                        'form' => $form->createView(),
                    ]);
                }
               
                $em->persist($screen);
                $em->flush();
                
                // Invalider le cache pour ce screen
                $this->invalidateScreenCache($screen->getId());
                
                $this->addFlash('success', sprintf('Screen "%s" créé avec succès pour le groupe "%s".', 
                    $screen->getName(), 
                    $selectedGroupe->getName()
                ));
                return $this->redirectToRoute('app_screen');
            } catch (\Exception $e) {
                $this->logger->error('Erreur création screen: ' . $e->getMessage());
                $this->addFlash('error', 'Erreur lors de la création du screen : ' . $e->getMessage());
            }
        }
       
        return $this->render('screen/form.html.twig', [
            'form' => $form->createView(),
        ]);
    }

    #[IsGranted('ROLE_ACCESS')]
    #[Route('/screen/edit/{id}', name: 'edit_screen')]
    public function edit(Screen $screen, Request $request, EntityManagerInterface $em): Response
    {
        // Vérifier que l'utilisateur peut modifier ce screen
        $currentUser = $this->getUser();
        if (!$this->userHasGroupeRole($currentUser, $screen->getGroupeScreen())) {
            $this->addFlash('error', sprintf('Vous n\'avez pas les permissions pour modifier ce screen. Rôle requis : %s', 
                $screen->getGroupeScreen()->getRole()
            ));
            return $this->redirectToRoute('app_screen');
        }
       
        $form = $this->createForm(ScreenForm::class, $screen);
        $form->handleRequest($request);
       
        if ($form->isSubmitted() && $form->isValid()) {
            try {
                $selectedGroupe = $screen->getGroupeScreen();
               
                // Vérifier si l'utilisateur a le rôle du nouveau groupe sélectionné
                if (!$this->userHasGroupeRole($currentUser, $selectedGroupe)) {
                    $this->addFlash('error', sprintf('Vous n\'avez pas les permissions pour assigner ce screen au groupe "%s". Rôle requis : %s', 
                        $selectedGroupe->getName(), 
                        $selectedGroupe->getRole()
                    ));
                    return $this->render('screen/form.html.twig', [
                        'form' => $form->createView(),
                        'edit' => true,
                    ]);
                }
               
                $em->flush();
                
                // Invalider le cache pour ce screen
                $this->invalidateScreenCache($screen->getId());
                
                $this->addFlash('success', sprintf('Screen "%s" modifié avec succès.', $screen->getName()));
                return $this->redirectToRoute('app_screen');
            } catch (\Exception $e) {
                $this->logger->error('Erreur modification screen: ' . $e->getMessage());
                $this->addFlash('error', 'Erreur lors de la modification du screen : ' . $e->getMessage());
            }
        }
       
        return $this->render('screen/form.html.twig', [
            'form' => $form->createView(),
            'edit' => true,
        ]);
    }

    #[IsGranted('ROLE_ACCESS')]
    #[Route('/screen/delete/{id}', name: 'delete_screen')]
    public function delete(Screen $screen, EntityManagerInterface $em): Response
    {
        // Vérifier que l'utilisateur peut supprimer ce screen
        $currentUser = $this->getUser();
        if (!$this->userHasGroupeRole($currentUser, $screen->getGroupeScreen())) {
            $this->addFlash('error', sprintf('Vous n\'avez pas les permissions pour supprimer ce screen. Rôle requis : %s', 
                $screen->getGroupeScreen()->getRole()
            ));
            return $this->redirectToRoute('app_screen');
        }

        try {
            $screenId = $screen->getId();
            $screenName = $screen->getName();
            $groupName = $screen->getGroupeScreen()->getName();
            
            $em->remove($screen);
            $em->flush();
            
            // Invalider le cache pour ce screen
            $this->invalidateScreenCache($screenId);
            
            $this->addFlash('success', sprintf('Screen "%s" du groupe "%s" supprimé avec succès.', $screenName, $groupName));
        } catch (\Exception $e) {
            $this->logger->error('Erreur suppression screen: ' . $e->getMessage());
            $this->addFlash('error', 'Erreur lors de la suppression du screen : ' . $e->getMessage());
        }
        
        return $this->redirectToRoute('app_screen');
    }

    /**
     * Affichage du slideshow - Optimisé pour MagicInfo Server
     */
    #[Route('/screen/{id}', name: 'screen_show', requirements: ['id' => '\d+'])]
    public function show(int $id, ScreenRepository $screenRepository): Response
    {
        try {
            $screen = $screenRepository->find($id);
           
            if (!$screen) {
                // Retourner une page d'erreur simple pour MagicInfo
                return $this->render('screen/error.html.twig', [
                    'message' => 'Screen non trouvé',
                    'screenId' => $id
                ]);
            }

            // Filtrer les pictures actives
            $activePictures = $this->getActivePictures($screen);

            // Stocker le hash initial dans le cache au lieu de la session
            $this->storeScreenHash($id, $activePictures);

            // Headers optimisés pour MagicInfo
            $response = $this->render('screen/show.html.twig', [
                'screen' => $screen,
                'pictures' => $activePictures,
            ]);

            // Headers spécifiques pour MagicInfo Server
            $response->headers->set('Cache-Control', 'no-cache, no-store, must-revalidate');
            $response->headers->set('Pragma', 'no-cache');
            $response->headers->set('Expires', '0');
            $response->headers->set('X-Content-Type-Options', 'nosniff');

            return $response;
            
        } catch (\Exception $e) {
            $this->logger->error('Erreur affichage screen: ' . $e->getMessage());
            
            // Page d'erreur simple pour MagicInfo
            return $this->render('screen/error.html.twig', [
                'message' => 'Erreur de chargement',
                'screenId' => $id
            ]);
        }
    }

    /**
     * Vérification des mises à jour - Optimisé pour MagicInfo
     */
    #[Route('/screen/{id}/check-updates', name: 'screen_check_updates', requirements: ['id' => '\d+'], methods: ['GET'])]
    public function checkUpdates(int $id, ScreenRepository $screenRepository, Request $request): JsonResponse
    {
        // Vérifier que c'est une requête AJAX
        if (!$request->isXmlHttpRequest()) {
            return new JsonResponse(['error' => 'Requête invalide'], 400);
        }

        try {
            $screen = $screenRepository->find($id);
            if (!$screen) {
                return new JsonResponse(['hasUpdates' => false, 'error' => 'Screen non trouvé'], 404);
            }
            
            // Récupérer les images actuellement actives
            $currentActivePictures = $this->getActivePictures($screen);
            
            // Créer un hash des données importantes
            $currentHash = $this->generatePicturesHash($currentActivePictures);
            
            // Récupérer le hash précédent depuis le cache
            $lastHash = $this->getStoredScreenHash($id);
            
            // Vérifier s'il y a des changements
            $hasUpdates = ($currentHash !== $lastHash);
            
            if ($hasUpdates) {
                // Mettre à jour le hash stocké
                $this->storeScreenHash($id, $currentActivePictures);
                $this->logger->info("Screen $id: Mise à jour détectée");
            }

            $response = new JsonResponse([
                'hasUpdates' => $hasUpdates,
                'timestamp' => time(),
                'screenId' => $id,
                'pictureCount' => count($currentActivePictures)
            ]);

            // Headers pour éviter le cache
            $response->headers->set('Cache-Control', 'no-cache, no-store, must-revalidate');
            $response->headers->set('Pragma', 'no-cache');
            $response->headers->set('Content-Type', 'application/json; charset=utf-8');

            return $response;
            
        } catch (\Exception $e) {
            $this->logger->error("Erreur check-updates screen $id: " . $e->getMessage());
            return new JsonResponse(['error' => 'Erreur serveur'], 500);
        }
    }

    /**
     * Récupération des slides - Optimisé pour MagicInfo
     */
    #[Route('/screen/{id}/get-slides', name: 'screen_get_slides', requirements: ['id' => '\d+'], methods: ['GET'])]
    public function getSlides(int $id, ScreenRepository $screenRepository, Request $request): Response
    {
        // Vérifier que c'est une requête AJAX
        if (!$request->isXmlHttpRequest()) {
            return new Response('Requête invalide', 400);
        }

        try {
            $screen = $screenRepository->find($id);
            
            if (!$screen) {
                return new Response('Screen non trouvé', 404);
            }
            
            // Filtrer les pictures actives
            $activePictures = $this->getActivePictures($screen);
            
            $response = $this->render('screen/slides.html.twig', [
                'pictures' => $activePictures,
            ]);

            // Headers pour éviter le cache
            $response->headers->set('Cache-Control', 'no-cache, no-store, must-revalidate');
            $response->headers->set('Pragma', 'no-cache');

            return $response;
            
        } catch (\Exception $e) {
            $this->logger->error("Erreur get-slides screen $id: " . $e->getMessage());
            return new Response('Erreur serveur', 500);
        }
    }

    /**
     * Endpoint de statut pour debugging
     */
    #[Route('/screen/{id}/status', name: 'screen_status', requirements: ['id' => '\d+'], methods: ['GET'])]
    public function getStatus(int $id, ScreenRepository $screenRepository, Request $request): JsonResponse
    {
        if (!$request->isXmlHttpRequest()) {
            return new JsonResponse(['error' => 'Requête invalide'], 400);
        }

        try {
            $screen = $screenRepository->find($id);
            
            if (!$screen) {
                return new JsonResponse(['error' => 'Screen non trouvé'], 404);
            }

            $activePictures = $this->getActivePictures($screen);
            
            $response = new JsonResponse([
                'screenId' => $screen->getId(),
                'screenName' => $screen->getName(),
                'groupName' => $screen->getGroupeScreen() ? $screen->getGroupeScreen()->getName() : null,
                'pictureCount' => count($activePictures),
                'totalPictures' => count($screen->getPictures()),
                'lastUpdate' => $screen->getUpdatedAt() ? $screen->getUpdatedAt()->format('Y-m-d H:i:s') : null,
                'currentHash' => $this->generatePicturesHash($activePictures),
                'timestamp' => time(),
                'serverTime' => date('Y-m-d H:i:s')
            ]);

            $response->headers->set('Cache-Control', 'no-cache, no-store, must-revalidate');
            return $response;
            
        } catch (\Exception $e) {
            $this->logger->error("Erreur status screen $id: " . $e->getMessage());
            return new JsonResponse(['error' => 'Erreur serveur'], 500);
        }
    }

    /**
     * Ping endpoint pour vérifier la connectivité
     */
    #[Route('/screen/ping', name: 'screen_ping', methods: ['GET'])]
    public function ping(Request $request): JsonResponse
    {
        $response = new JsonResponse([
            'status' => 'ok',
            'timestamp' => time(),
            'server_time' => date('Y-m-d H:i:s'),
            'user_agent' => $request->headers->get('User-Agent'),
            'ip' => $request->getClientIp(),
            'is_ajax' => $request->isXmlHttpRequest()
        ]);

        $response->headers->set('Cache-Control', 'no-cache, no-store, must-revalidate');
        return $response;
    }

    /**
     * Forcer le rechargement du cache
     */
    #[Route('/screen/{id}/refresh-cache', name: 'screen_refresh_cache', requirements: ['id' => '\d+'], methods: ['POST'])]
    public function refreshCache(int $id, ScreenRepository $screenRepository, Request $request): JsonResponse
    {
        if (!$request->isXmlHttpRequest()) {
            return new JsonResponse(['error' => 'Requête invalide'], 400);
        }

        try {
            $screen = $screenRepository->find($id);
            
            if (!$screen) {
                return new JsonResponse(['error' => 'Screen non trouvé'], 404);
            }

            // Invalider le cache
            $this->invalidateScreenCache($id);
            
            // Recréer le cache
            $activePictures = $this->getActivePictures($screen);
            $this->storeScreenHash($id, $activePictures);
            
            return new JsonResponse([
                'success' => true,
                'message' => 'Cache rafraîchi',
                'screenId' => $id,
                'timestamp' => time()
            ]);
            
        } catch (\Exception $e) {
            $this->logger->error("Erreur refresh-cache screen $id: " . $e->getMessage());
            return new JsonResponse(['error' => 'Erreur serveur'], 500);
        }
    }

    /**
     * Vérifie si l'utilisateur a le rôle correspondant au groupe
     */
    private function userHasGroupeRole(?User $user, ?Group $group): bool
    {
        if (!$user || !$group) {
            return false;
        }

        // Les administrateurs ont accès à tout
        if ($this->isGranted('ROLE_ADMIN')) {
            return true;
        }

        // Vérifier si l'utilisateur a le rôle spécifique du groupe
        return $this->isGranted($group->getRole());
    }

    /**
     * Récupère les images actives selon leurs dates
     */
    private function getActivePictures(Screen $screen): array
    {
        $now = new \DateTime();
        $activePictures = [];
        
        foreach ($screen->getPictures() as $picture) {
            // Vérifier si l'image est dans sa période d'affichage
            if ($picture->getStartDate() && $picture->getEndDate()) {
                if ($now >= $picture->getStartDate() && $now <= $picture->getEndDate()) {
                    $activePictures[] = $picture;
                }
            } else {
                // Si pas de dates définies, considérer comme active
                $activePictures[] = $picture;
            }
        }
        
        return $activePictures;
    }

    /**
     * Génère un hash basé sur les données des images
     */
    private function generatePicturesHash(array $pictures): string
    {
        $data = [];
        
        foreach ($pictures as $picture) {
            $data[] = [
                'id' => $picture->getId(),
                'delay' => $picture->getDelay(),
                'imageName' => $picture->getImageName(),
                'position' => $picture->getPosition(),
                'backgroundColor' => $picture->getBackgroundColor(),
                'startDate' => $picture->getStartDate() ? $picture->getStartDate()->format('Y-m-d H:i:s') : null,
                'endDate' => $picture->getEndDate() ? $picture->getEndDate()->format('Y-m-d H:i:s') : null,
                'updatedAt' => $picture->getUpdatedAt() ? $picture->getUpdatedAt()->format('Y-m-d H:i:s') : null,
            ];
        }
        
        return md5(json_encode($data));
    }

    /**
     * Stocke le hash d'un screen dans le cache
     */
    private function storeScreenHash(int $screenId, array $pictures): void
    {
        try {
            $hash = $this->generatePicturesHash($pictures);
            $cacheKey = 'screen_hash_' . $screenId;
            
            $cacheItem = $this->cache->getItem($cacheKey);
            $cacheItem->set($hash);
            $cacheItem->expiresAfter(3600); // 1 heure
            
            $this->cache->save($cacheItem);
        } catch (\Exception $e) {
            $this->logger->error("Erreur stockage hash screen $screenId: " . $e->getMessage());
        }
    }

    /**
     * Récupère le hash stocké d'un screen
     */
    private function getStoredScreenHash(int $screenId): string
    {
        try {
            $cacheKey = 'screen_hash_' . $screenId;
            $cacheItem = $this->cache->getItem($cacheKey);
            
            return $cacheItem->get() ?? '';
        } catch (\Exception $e) {
            $this->logger->error("Erreur récupération hash screen $screenId: " . $e->getMessage());
            return '';
        }
    }

    /**
     * Invalide le cache d'un screen
     */
    private function invalidateScreenCache(int $screenId): void
    {
        try {
            $cacheKey = 'screen_hash_' . $screenId;
            $this->cache->deleteItem($cacheKey);
        } catch (\Exception $e) {
            $this->logger->error("Erreur invalidation cache screen $screenId: " . $e->getMessage());
        }
    }
}