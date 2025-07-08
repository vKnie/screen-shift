<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Spatie\PdfToImage\Pdf;
use Spatie\PdfToImage\Enums\OutputFormat;

#[IsGranted('ROLE_ACCESS')]
final class ConvertPdfController extends AbstractController
{
    #[Route('/convertpdf', name: 'app_convert_pdf')]
    public function index(): Response
    {
        return $this->render('convert_pdf/index.html.twig', [
            'controller_name' => 'Convert PDF',
        ]);
    }

    #[Route('/convertpdf/upload', name: 'app_convert_pdf_upload', methods: ['POST'])]
    public function convertPdfToImages(Request $request): Response
    {
        $uploadedFile = $request->files->get('pdf_file');
        
        if (!$uploadedFile) {
            $this->addFlash('error', 'Veuillez sélectionner un fichier PDF.');
            return $this->redirectToRoute('app_convert_pdf');
        }

        if (!$uploadedFile instanceof UploadedFile) {
            $this->addFlash('error', 'Erreur lors du téléchargement du fichier.');
            return $this->redirectToRoute('app_convert_pdf');
        }

        // Vérifier l'extension du fichier
        if ($uploadedFile->getClientOriginalExtension() !== 'pdf') {
            $this->addFlash('error', 'Le fichier doit être un PDF.');
            return $this->redirectToRoute('app_convert_pdf');
        }

        // Vérifier la taille du fichier (max 10MB)
        if ($uploadedFile->getSize() > 10 * 1024 * 1024) {
            $this->addFlash('error', 'Le fichier est trop volumineux (max 10MB).');
            return $this->redirectToRoute('app_convert_pdf');
        }

        try {
            // Créer un dossier temporaire (Windows compatible)
            $uploadDir = sys_get_temp_dir() . '/pdf_convert_' . uniqid();
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }

            // Générer un nom de fichier unique
            $fileName = uniqid() . '.pdf';
            $uploadedFile->move($uploadDir, $fileName);
            $pdfPath = $uploadDir . '/' . $fileName;

            // Vérifier les prérequis et proposer des alternatives
            $useSpatie = extension_loaded('imagick') && class_exists('Spatie\PdfToImage\Pdf');
            
            if ($useSpatie) {
                // Convertir avec Spatie (méthode préférée)
                $images = $this->convertPdfWithSpatie($pdfPath, $uploadDir);
                $this->addFlash('success', 'PDF converti avec succès en ' . count($images) . ' images PNG.');
            } else {
                // Fallback : créer des images de démonstration
                $this->addFlash('warning', '⚠️ Imagick non disponible. Génération d\'images de démonstration.');
                $images = $this->createDemoImages($pdfPath, $uploadDir);
            }

            if (empty($images)) {
                $this->addFlash('error', 'Impossible de convertir le PDF. Le fichier pourrait être corrompu ou protégé.');
                unlink($pdfPath);
                return $this->redirectToRoute('app_convert_pdf');
            }

            // Créer un ZIP avec toutes les images
            $zipPath = $this->createZipFromImages($images, $uploadDir);

            // Sauvegarder le chemin du ZIP dans la session pour le téléchargement
            $session = $request->getSession();
            $session->set('pdf_download_ready', true);
            $session->set('pdf_zip_path', $zipPath);
            $session->set('pdf_temp_dir', $uploadDir);
            $session->set('pdf_images', $images);
            $session->set('pdf_source_path', $pdfPath);

            // Rediriger vers la page principale avec le message de succès
            return $this->redirectToRoute('app_convert_pdf');

        } catch (\Exception $e) {
            // Nettoyer en cas d'erreur
            if (isset($pdfPath) && file_exists($pdfPath)) {
                unlink($pdfPath);
            }
            
            $this->addFlash('error', 'Erreur lors de la conversion : ' . $e->getMessage());
            return $this->redirectToRoute('app_convert_pdf');
        }
    }

    #[Route('/convertpdf/download', name: 'app_convert_pdf_download')]
    public function downloadConvertedPdf(Request $request): Response
    {
        $session = $request->getSession();
        
        if (!$session->get('pdf_download_ready')) {
            $this->addFlash('error', 'Aucun fichier prêt à télécharger.');
            return $this->redirectToRoute('app_convert_pdf');
        }

        $zipPath = $session->get('pdf_zip_path');
        $tempDir = $session->get('pdf_temp_dir');
        $images = $session->get('pdf_images');
        $sourcePath = $session->get('pdf_source_path');

        if (!$zipPath || !file_exists($zipPath)) {
            $this->addFlash('error', 'Le fichier de téléchargement n\'existe plus.');
            $this->clearDownloadSession($request);
            return $this->redirectToRoute('app_convert_pdf');
        }

        // Créer la réponse de téléchargement
        $response = new BinaryFileResponse($zipPath);
        $response->setContentDisposition(
            ResponseHeaderBag::DISPOSITION_ATTACHMENT,
            'pdf_converted_images.zip'
        );

        // Nettoyer les fichiers temporaires après le téléchargement
        $response->deleteFileAfterSend(true);
        
        // Nettoyer aussi les autres fichiers temporaires
        register_shutdown_function(function() use ($sourcePath, $images, $tempDir) {
            if ($sourcePath && file_exists($sourcePath)) {
                unlink($sourcePath);
            }
            
            if ($images) {
                foreach ($images as $imagePath) {
                    if (file_exists($imagePath)) {
                        unlink($imagePath);
                    }
                }
            }
            
            if ($tempDir && is_dir($tempDir)) {
                rmdir($tempDir);
            }
        });

        // Nettoyer la session
        $this->clearDownloadSession($request);

        return $response;
    }

    private function convertPdfWithSpatie(string $pdfPath, string $outputDir): array
    {
        $images = [];
        
        try {
            // Créer l'instance PDF avec Spatie
            $pdf = new Pdf($pdfPath);
            
            // Configurer la résolution
            $pdf->setResolution(150);
            
            // Obtenir le nombre de pages
            $pageCount = $pdf->getNumberOfPages();
            
            if ($pageCount === 0) {
                throw new \Exception('Le PDF ne contient aucune page valide');
            }

            // Méthode simple : convertir toutes les pages d'un coup
            try {
                $pdf->saveAllPagesAsImages($outputDir, 'page_%03d.png');
                // Récupérer les fichiers créés
                $files = glob($outputDir . '/page_*.png');
                sort($files, SORT_NATURAL);
                $images = $files;
            } catch (\Exception $e) {
                // Fallback : méthode ultra basique
                $images = [];
            }
            
            if (empty($images)) {
                // Fallback : méthode page par page ultra basique
                for ($pageNumber = 1; $pageNumber <= min($pageCount, 10); $pageNumber++) {
                    try {
                        $imagePath = $outputDir . '/page_' . str_pad($pageNumber, 3, '0', STR_PAD_LEFT) . '.png';
                        
                        // Nouvelle instance pour chaque page (plus sûr)
                        $singlePdf = new Pdf($pdfPath);
                        $singlePdf->setPage($pageNumber);
                        $singlePdf->setResolution(150);
                        $singlePdf->saveImage($imagePath);
                        
                        if (file_exists($imagePath)) {
                            $images[] = $imagePath;
                        }
                    } catch (\Exception $pageError) {
                        // Ignorer cette page et continuer
                        continue;
                    }
                }
            }
            
        } catch (\Exception $e) {
            throw new \Exception('Erreur Spatie PDF-to-Image: ' . $e->getMessage());
        }

        return $images;
    }

    private function createZipFromImages(array $images, string $baseDir): string
    {
        $zipPath = $baseDir . '/converted_images_' . uniqid() . '.zip';
        $zip = new \ZipArchive();

        if ($zip->open($zipPath, \ZipArchive::CREATE) !== TRUE) {
            throw new \Exception('Impossible de créer le fichier ZIP');
        }

        foreach ($images as $imagePath) {
            $fileName = basename($imagePath);
            $zip->addFile($imagePath, $fileName);
        }

        $zip->close();
        return $zipPath;
    }

    #[Route('/convertpdf/test', name: 'app_convert_pdf_test')]
    public function testDependencies(): Response
    {
        $status = [
            'imagick' => extension_loaded('imagick'),
            'zip' => extension_loaded('zip'),
            'spatie_class' => class_exists('Spatie\PdfToImage\Pdf'),
            'ghostscript' => $this->testGhostscript(),
            'gd' => extension_loaded('gd'),
            'temp_dir' => sys_get_temp_dir(),
            'writable' => is_writable(sys_get_temp_dir())
        ];

        return $this->json($status);
    }

    private function createDemoImages(string $pdfPath, string $outputDir): array
    {
        $images = [];
        
        if (!extension_loaded('gd')) {
            throw new \Exception('Extension GD requise mais non disponible.');
        }
        
        // Créer 3 images de démonstration
        for ($page = 1; $page <= 3; $page++) {
            $width = 800;
            $height = 1000;
            $image = imagecreate($width, $height);
            
            // Couleurs
            $white = imagecolorallocate($image, 255, 255, 255);
            $black = imagecolorallocate($image, 0, 0, 0);
            $blue = imagecolorallocate($image, 0, 100, 200);
            $gray = imagecolorallocate($image, 128, 128, 128);
            $red = imagecolorallocate($image, 200, 50, 50);
            
            // Fond
            imagefill($image, 0, 0, $white);
            
            // Bordure
            imagerectangle($image, 10, 10, $width-10, $height-10, $gray);
            
            // En-tête
            imagestring($image, 5, 50, 50, 'PDF CONVERSION DEMO', $blue);
            imagestring($image, 4, 50, 100, 'Page ' . $page . ' of 3', $black);
            
            // Informations
            $fileInfo = 'Fichier original: ' . basename($pdfPath);
            $sizeInfo = 'Taille: ' . round(filesize($pdfPath) / 1024, 2) . ' KB';
            $statusInfo = 'Status: Imagick non disponible - Mode demo';
            
            imagestring($image, 2, 50, 150, $fileInfo, $black);
            imagestring($image, 2, 50, 170, $sizeInfo, $black);
            imagestring($image, 2, 50, 190, $statusInfo, $red);
            
            // Contenu simulé
            imagestring($image, 3, 50, 250, 'CONTENU SIMULE DE LA PAGE ' . $page, $blue);
            
            for ($i = 0; $i < 20; $i++) {
                $y = 300 + ($i * 25);
                $text = 'Ligne ' . ($i + 1) . ' du contenu PDF page ' . $page;
                imagestring($image, 2, 50, $y, $text, $black);
            }
            
            // Instructions d'installation
            if ($page === 1) {
                imagestring($image, 2, 50, $height - 150, 'Pour une vraie conversion:', $red);
                imagestring($image, 2, 50, $height - 130, '1. Installez php-imagick', $black);
                imagestring($image, 2, 50, $height - 110, '2. Installez ImageMagick', $black);
                imagestring($image, 2, 50, $height - 90, '3. Redemarrez le serveur', $black);
            }
            
            // Sauvegarder
            $imagePath = $outputDir . '/demo_page_' . str_pad($page, 3, '0', STR_PAD_LEFT) . '.png';
            imagepng($image, $imagePath);
            imagedestroy($image);
            
            $images[] = $imagePath;
        }
        
        return $images;
    }

    #[Route('/convertpdf/clear', name: 'app_convert_pdf_clear', methods: ['POST'])]
    public function clearDownloadSession(Request $request): Response
    {
        $session = $request->getSession();
        $session->remove('pdf_download_ready');
        $session->remove('pdf_zip_path');
        $session->remove('pdf_temp_dir');
        $session->remove('pdf_images');
        $session->remove('pdf_source_path');
        
        return $this->json(['status' => 'cleared']);
    }

    private function testGhostscript(): bool
    {
        // Windows utilise gswin64c.exe au lieu de gs
        $commands = [
            'gswin64c -version 2>&1',
            '"C:\Program Files\gs\gs10.05.1\bin\gswin64c.exe" -version 2>&1',
            'gswin64 -version 2>&1',
            '"C:\Program Files\gs\gs10.05.1\bin\gswin64.exe" -version 2>&1',
            'gs -version 2>&1'
        ];

        foreach ($commands as $cmd) {
            try {
                exec($cmd, $output, $returnVar);
                if ($returnVar === 0 && !empty($output)) {
                    return true;
                }
                $output = [];
            } catch (\Exception $e) {
                continue;
            }
        }
        
        return false;
    }
}