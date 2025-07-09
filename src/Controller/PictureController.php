<?php
namespace App\Controller;

use App\Entity\Picture;
use App\Entity\Screen;
use App\Entity\Group;
use App\Entity\User;
use App\Form\PictureForm;
use App\Repository\PictureRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[IsGranted('ROLE_ACCESS')]
final class PictureController extends AbstractController
{
    #[Route('/picture', name: 'app_picture')]
    public function index(PictureRepository $pictureRepository): Response
    {
        $currentUser = $this->getUser();
        
        // Si l'utilisateur est admin, afficher toutes les pictures
        if ($this->isGranted('ROLE_ADMIN')) {
            $pictures = $pictureRepository->findAll();
        } else {
            // Filtrer les pictures selon les permissions de l'utilisateur
            $allPictures = $pictureRepository->findAll();
            $pictures = [];
            
            foreach ($allPictures as $picture) {
                $hasAccess = false;
                
                // Vérifier si l'utilisateur a accès à au moins un des screens de la picture
                foreach ($picture->getScreens() as $screen) {
                    if ($this->userHasGroupeRole($currentUser, $screen->getGroupeScreen())) {
                        $hasAccess = true;
                        break;
                    }
                }
                
                if ($hasAccess) {
                    $pictures[] = $picture;
                }
            }
        }
        
        return $this->render('picture/index.html.twig', [
            'pictures' => $pictures,
        ]);
    }
    
    #[Route('/picture/create', name: 'create_picture')]
    public function create(Request $request, EntityManagerInterface $em): Response
    {
        $picture = new Picture();
        $form = $this->createForm(PictureForm::class, $picture);
        $form->handleRequest($request);
        
        if ($form->isSubmitted() && $form->isValid()) {
            try {
                $selectedScreens = $picture->getScreens();
                $currentUser = $this->getUser();
                
                // Vérifier si l'utilisateur a le rôle pour tous les screens sélectionnés
                $unauthorizedScreens = [];
                foreach ($selectedScreens as $screen) {
                    if (!$this->userHasGroupeRole($currentUser, $screen->getGroupeScreen())) {
                        $unauthorizedScreens[] = sprintf('%s (groupe "%s", rôle requis : %s)', 
                            $screen->getName(),
                            $screen->getGroupeScreen()->getName(),
                            $screen->getGroupeScreen()->getRole()
                        );
                    }
                }
                
                if (!empty($unauthorizedScreens)) {
                    $this->addFlash('error', sprintf('Vous n\'avez pas les permissions pour les écrans suivants : %s', 
                        implode(', ', $unauthorizedScreens)
                    ));
                    return $this->render('picture/form.html.twig', [
                        'form' => $form->createView(),
                    ]);
                }
                
                $em->persist($picture);
                $em->flush();
                
                $screenNames = [];
                foreach ($selectedScreens as $screen) {
                    $screenNames[] = $screen->getName();
                }
                
                $this->addFlash('success', sprintf('Image ajoutée avec succès aux écrans : %s', 
                    implode(', ', $screenNames)
                ));
                
                return $this->redirectToRoute('app_picture');
            } catch (\Exception $e) {
                $this->addFlash('error', 'Erreur lors de l\'ajout de l\'image : ' . $e->getMessage());
            }
        }
        
        return $this->render('picture/form.html.twig', [
            'form' => $form->createView(),
        ]);
    }
    
    #[Route('/picture/edit/{id}', name: 'edit_picture')]
    public function edit(Picture $picture, Request $request, EntityManagerInterface $em): Response
    {
        // Vérifier que l'utilisateur peut modifier cette picture
        $currentUser = $this->getUser();
        
        // Vérifier l'accès à au moins un des screens actuels
        $hasAccess = false;
        foreach ($picture->getScreens() as $screen) {
            if ($this->userHasGroupeRole($currentUser, $screen->getGroupeScreen())) {
                $hasAccess = true;
                break;
            }
        }
        
        if (!$hasAccess) {
            $this->addFlash('error', 'Vous n\'avez pas les permissions pour modifier cette image.');
            return $this->redirectToRoute('app_picture');
        }
        
        $form = $this->createForm(PictureForm::class, $picture);
        $form->handleRequest($request);
        
        if ($form->isSubmitted() && $form->isValid()) {
            try {
                $selectedScreens = $picture->getScreens();
                
                // Vérifier si l'utilisateur a le rôle pour tous les nouveaux screens sélectionnés
                $unauthorizedScreens = [];
                foreach ($selectedScreens as $screen) {
                    if (!$this->userHasGroupeRole($currentUser, $screen->getGroupeScreen())) {
                        $unauthorizedScreens[] = sprintf('%s (groupe "%s", rôle requis : %s)', 
                            $screen->getName(),
                            $screen->getGroupeScreen()->getName(),
                            $screen->getGroupeScreen()->getRole()
                        );
                    }
                }
                
                if (!empty($unauthorizedScreens)) {
                    $this->addFlash('error', sprintf('Vous n\'avez pas les permissions pour les écrans suivants : %s', 
                        implode(', ', $unauthorizedScreens)
                    ));
                    return $this->render('picture/form.html.twig', [
                        'form' => $form->createView(),
                        'edit' => true,
                    ]);
                }
                
                $em->flush();
                
                $screenNames = [];
                foreach ($selectedScreens as $screen) {
                    $screenNames[] = $screen->getName();
                }
                
                $this->addFlash('success', sprintf('Image modifiée avec succès pour les écrans : %s', 
                    implode(', ', $screenNames)
                ));
                
                return $this->redirectToRoute('app_picture');
            } catch (\Exception $e) {
                $this->addFlash('error', 'Erreur lors de la modification de l\'image : ' . $e->getMessage());
            }
        }
        
        return $this->render('picture/form.html.twig', [
            'form' => $form->createView(),
            'edit' => true,
        ]);
    }
    
    #[Route('/picture/delete/{id}', name: 'delete_picture')]
    public function delete(Picture $picture, EntityManagerInterface $em, Request $request): Response
    {
        // Vérifier que l'utilisateur peut supprimer cette picture
        $currentUser = $this->getUser();
        
        // Vérifier l'accès à au moins un des screens
        $hasAccess = false;
        foreach ($picture->getScreens() as $screen) {
            if ($this->userHasGroupeRole($currentUser, $screen->getGroupeScreen())) {
                $hasAccess = true;
                break;
            }
        }
        
        if (!$hasAccess) {
            $this->addFlash('error', 'Vous n\'avez pas les permissions pour supprimer cette image.');
            return $this->redirectToRoute('app_picture');
        }
        
        try {
            $screenNames = [];
            foreach ($picture->getScreens() as $screen) {
                $screenNames[] = $screen->getName();
            }
            
            $imageName = $picture->getImageName() ?: 'Image sans nom';
            
            $em->remove($picture);
            $em->flush();
            
            $this->addFlash('success', sprintf('Image "%s" supprimée avec succès des écrans : %s', 
                $imageName, 
                implode(', ', $screenNames)
            ));
        } catch (\Exception $e) {
            $this->addFlash('error', 'Erreur lors de la suppression de l\'image : ' . $e->getMessage());
        }
        
        return $this->redirectToRoute('app_picture');
    }
    
    /**
     * Vérifie si l'utilisateur a le rôle correspondant au groupe
     * ou s'il est administrateur
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
}