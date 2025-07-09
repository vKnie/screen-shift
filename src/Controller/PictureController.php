<?php
namespace App\Controller;

use App\Entity\Picture;
use App\Entity\Screen;
use App\Entity\Group;
use App\Entity\User;
use App\Form\PictureForm;
use App\Repository\PictureRepository;
use App\Service\PdfConverterService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[IsGranted('ROLE_ACCESS')]
final class PictureController extends AbstractController
{
    private PdfConverterService $pdfConverter;

    public function __construct(PdfConverterService $pdfConverter)
    {
        $this->pdfConverter = $pdfConverter;
    }

    #[Route('/picture', name: 'app_picture')]
    public function index(PictureRepository $pictureRepository): Response
    {
        $currentUser = $this->getUser();
        
        // Si l'utilisateur est admin, afficher toutes les pictures avec optimisation
        if ($this->isGranted('ROLE_ADMIN')) {
            $pictures = $pictureRepository->findAllWithScreensAndGroups();
        } else {
            // Pour les utilisateurs non-admin, utiliser une requête optimisée
            $userRoles = $currentUser->getRoles();
            $pictures = $pictureRepository->findByUserRoles($userRoles);
            
            // Filtrer et dédupliquer côté PHP pour éviter les doublons
            $uniquePictures = [];
            $pictureIds = [];
            
            foreach ($pictures as $picture) {
                if (!in_array($picture->getId(), $pictureIds)) {
                    // Vérifier que l'utilisateur a bien accès à au moins un screen
                    $hasAccess = false;
                    foreach ($picture->getScreens() as $screen) {
                        if ($this->userHasGroupeRole($currentUser, $screen->getGroupeScreen())) {
                            $hasAccess = true;
                            break;
                        }
                    }
                    
                    if ($hasAccess) {
                        $uniquePictures[] = $picture;
                        $pictureIds[] = $picture->getId();
                    }
                }
            }
            
            $pictures = $uniquePictures;
        }
        
        return $this->render('picture/index.html.twig', [
            'pictures' => $pictures,
            'pdf_max_size_mb' => $this->pdfConverter->getMaxFileSizeMB(),
            'pdf_max_pages' => $this->pdfConverter->getMaxPages(),
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
                // Gérer la conversion PDF si nécessaire
                $this->handlePdfConversion($picture, $request);
                
                $selectedScreens = $picture->getScreens();
                $currentUser = $this->getUser();
                
                // Vérifier si l'utilisateur a le rôle pour tous les screens sélectionnés
                if (!$this->isGranted('ROLE_ADMIN')) {
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
                            'pdf_max_size_mb' => $this->pdfConverter->getMaxFileSizeMB(),
                            'pdf_max_pages' => $this->pdfConverter->getMaxPages(),
                        ]);
                    }
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
            'pdf_max_size_mb' => $this->pdfConverter->getMaxFileSizeMB(),
            'pdf_max_pages' => $this->pdfConverter->getMaxPages(),
        ]);
    }
    
    #[Route('/picture/edit/{id}', name: 'edit_picture')]
    public function edit(int $id, Request $request, EntityManagerInterface $em, PictureRepository $pictureRepository): Response
    {
        // Récupérer la picture avec ses relations en une seule requête optimisée
        $picture = $pictureRepository->findOneWithScreensAndGroups($id);
        
        if (!$picture) {
            throw $this->createNotFoundException('Picture non trouvée');
        }
        
        // Vérifier que l'utilisateur peut modifier cette picture
        $currentUser = $this->getUser();
        
        if (!$this->isGranted('ROLE_ADMIN')) {
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
        }
        
        $form = $this->createForm(PictureForm::class, $picture);
        $form->handleRequest($request);
        
        if ($form->isSubmitted() && $form->isValid()) {
            try {
                // Gérer la conversion PDF si nécessaire
                $this->handlePdfConversion($picture, $request);
                
                $selectedScreens = $picture->getScreens();
                
                // Vérifier si l'utilisateur a le rôle pour tous les nouveaux screens sélectionnés
                if (!$this->isGranted('ROLE_ADMIN')) {
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
                            'pdf_max_size_mb' => $this->pdfConverter->getMaxFileSizeMB(),
                            'pdf_max_pages' => $this->pdfConverter->getMaxPages(),
                        ]);
                    }
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
            'pdf_max_size_mb' => $this->pdfConverter->getMaxFileSizeMB(),
            'pdf_max_pages' => $this->pdfConverter->getMaxPages(),
        ]);
    }
    
    #[Route('/picture/delete/{id}', name: 'delete_picture')]
    public function delete(int $id, EntityManagerInterface $em, PictureRepository $pictureRepository): Response
    {
        // Récupérer la picture avec ses relations en une seule requête optimisée
        $picture = $pictureRepository->findOneWithScreensAndGroups($id);
        
        if (!$picture) {
            throw $this->createNotFoundException('Picture non trouvée');
        }
        
        // Vérifier que l'utilisateur peut supprimer cette picture
        $currentUser = $this->getUser();
        
        if (!$this->isGranted('ROLE_ADMIN')) {
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

    #[Route('/picture/convert-pdf-preview', name: 'convert_pdf_preview', methods: ['POST'])]
    public function convertPdfPreview(Request $request): Response
    {
        try {
            $uploadedFile = $request->files->get('pdf_file');
            
            if (!$uploadedFile instanceof UploadedFile) {
                return $this->json(['error' => 'Aucun fichier fourni'], 400);
            }

            // Vérifier si c'est un PDF
            if (strtolower($uploadedFile->getClientOriginalExtension()) !== 'pdf' && 
                $uploadedFile->getMimeType() !== 'application/pdf') {
                return $this->json(['error' => 'Le fichier doit être un PDF'], 400);
            }

            // Répertoire temporaire pour la prévisualisation
            $tempDir = sys_get_temp_dir() . '/pdf_preview_' . uniqid();
            if (!mkdir($tempDir, 0755, true)) {
                return $this->json(['error' => 'Impossible de créer le répertoire temporaire'], 500);
            }

            try {
                $convertedFile = $this->pdfConverter->convertPdfToFirstPagePng($uploadedFile, $tempDir);
                
                if ($convertedFile && file_exists($convertedFile->getPathname())) {
                    // Lire le fichier converti et l'encoder en base64
                    $imageData = file_get_contents($convertedFile->getPathname());
                    $base64Image = 'data:image/png;base64,' . base64_encode($imageData);
                    
                    // Nettoyer le fichier temporaire
                    unlink($convertedFile->getPathname());
                    rmdir($tempDir);
                    
                    return $this->json([
                        'success' => true,
                        'image' => $base64Image,
                        'message' => 'PDF converti avec succès'
                    ]);
                } else {
                    // Nettoyer le répertoire temporaire
                    $this->cleanupTempDir($tempDir);
                    return $this->json(['error' => 'Échec de la conversion PDF'], 500);
                }
            } catch (\Exception $e) {
                // Nettoyer le répertoire temporaire
                $this->cleanupTempDir($tempDir);
                return $this->json(['error' => 'Erreur de conversion: ' . $e->getMessage()], 500);
            }
            
        } catch (\Exception $e) {
            return $this->json(['error' => 'Erreur: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Gère la conversion PDF vers PNG si nécessaire
     */
    private function handlePdfConversion(Picture $picture, Request $request): void
    {
        // Récupérer le fichier uploadé via VichUploader
        $imageFile = $picture->getImageFile();
        
        if (!$imageFile instanceof UploadedFile) {
            return;
        }
        
        // Vérifier si c'est un PDF
        if (strtolower($imageFile->getClientOriginalExtension()) === 'pdf' || 
            $imageFile->getMimeType() === 'application/pdf') {
            try {
                // Convertir le PDF en PNG
                $uploadsDir = $this->getParameter('kernel.project_dir') . '/public/uploads/pictures';
                if (!is_dir($uploadsDir)) {
                    mkdir($uploadsDir, 0755, true);
                }
                
                $convertedFile = $this->pdfConverter->convertPdfToFirstPagePng($imageFile, $uploadsDir);
                
                if ($convertedFile) {
                    // Remplacer le fichier de l'entité par le PNG converti
                    $newFileName = 'converted_' . uniqid() . '.png';
                    $finalPath = $uploadsDir . '/' . $newFileName;
                    
                    // Déplacer le fichier converti vers le répertoire final
                    rename($convertedFile->getPathname(), $finalPath);
                    
                    // Créer un nouveau UploadedFile avec le PNG converti
                    $convertedUploadedFile = new UploadedFile(
                        $finalPath,
                        $newFileName,
                        'image/png',
                        null,
                        true // test mode = true pour éviter les validations
                    );
                    
                    // Remplacer le fichier dans l'entité Picture
                    $picture->setImageFile($convertedUploadedFile);
                    
                    $this->addFlash('info', 'PDF converti en PNG avec succès (première page)');
                } else {
                    throw new \Exception('Échec de la conversion PDF');
                }
            } catch (\Exception $e) {
                throw new \Exception('Erreur lors de la conversion PDF : ' . $e->getMessage());
            }
        }
    }

    /**
     * Nettoie un répertoire temporaire
     */
    private function cleanupTempDir(string $tempDir): void
    {
        if (is_dir($tempDir)) {
            $files = glob($tempDir . '/*');
            foreach ($files as $file) {
                if (is_file($file)) unlink($file);
            }
            rmdir($tempDir);
        }
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