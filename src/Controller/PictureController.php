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
                $screen = $picture->getScreenPicture();
                if ($screen && $this->userHasGroupeRole($currentUser, $screen->getGroupeScreen())) {
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
                $selectedScreen = $picture->getScreenPicture();
                $currentUser = $this->getUser();
                
                // Vérifier si l'utilisateur a le rôle du groupe du screen sélectionné
                if (!$this->userHasGroupeRole($currentUser, $selectedScreen->getGroupeScreen())) {
                    $this->addFlash('error', sprintf('Vous n\'avez pas les permissions pour ajouter une image au screen "%s" (groupe "%s"). Rôle requis : %s', 
                        $selectedScreen->getName(),
                        $selectedScreen->getGroupeScreen()->getName(),
                        $selectedScreen->getGroupeScreen()->getRole()
                    ));
                    return $this->render('picture/form.html.twig', [
                        'form' => $form->createView(),
                    ]);
                }
                
                $em->persist($picture);
                $em->flush();
                
                $screenName = $picture->getScreenPicture() ? $picture->getScreenPicture()->getName() : 'N/A';
                $this->addFlash('success', sprintf('Image ajoutée avec succès au screen "%s".', $screenName));
                
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
        $currentScreen = $picture->getScreenPicture();
        
        if (!$this->userHasGroupeRole($currentUser, $currentScreen->getGroupeScreen())) {
            $this->addFlash('error', sprintf('Vous n\'avez pas les permissions pour modifier cette image. Rôle requis : %s', 
                $currentScreen->getGroupeScreen()->getRole()
            ));
            return $this->redirectToRoute('app_picture');
        }
        
        $form = $this->createForm(PictureForm::class, $picture);
        $form->handleRequest($request);
        
        if ($form->isSubmitted() && $form->isValid()) {
            try {
                $selectedScreen = $picture->getScreenPicture();
                
                // Vérifier si l'utilisateur a le rôle du nouveau screen sélectionné
                if (!$this->userHasGroupeRole($currentUser, $selectedScreen->getGroupeScreen())) {
                    $this->addFlash('error', sprintf('Vous n\'avez pas les permissions pour assigner cette image au screen "%s" (groupe "%s"). Rôle requis : %s', 
                        $selectedScreen->getName(),
                        $selectedScreen->getGroupeScreen()->getName(),
                        $selectedScreen->getGroupeScreen()->getRole()
                    ));
                    return $this->render('picture/form.html.twig', [
                        'form' => $form->createView(),
                        'edit' => true,
                    ]);
                }
                
                $em->flush();
                
                $screenName = $picture->getScreenPicture() ? $picture->getScreenPicture()->getName() : 'N/A';
                $this->addFlash('success', sprintf('Image modifiée avec succès pour le screen "%s".', $screenName));
                
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
        $screen = $picture->getScreenPicture();
        
        if (!$this->userHasGroupeRole($currentUser, $screen->getGroupeScreen())) {
            $this->addFlash('error', sprintf('Vous n\'avez pas les permissions pour supprimer cette image. Rôle requis : %s', 
                $screen->getGroupeScreen()->getRole()
            ));
            return $this->redirectToRoute('app_picture');
        }
        
        try {
            $screenName = $picture->getScreenPicture() ? $picture->getScreenPicture()->getName() : 'N/A';
            $imageName = $picture->getImageName() ?: 'Image sans nom';
            
            $em->remove($picture);
            $em->flush();
            
            $this->addFlash('success', sprintf('Image "%s" supprimée avec succès du screen "%s".', $imageName, $screenName));
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