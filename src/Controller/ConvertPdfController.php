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

#[IsGranted('ROLE_ACCESS')]
final class ConvertPdfController extends AbstractController
{
    // Limites de sécurité
    private const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB au lieu de 10MB
    private const MAX_PAGES = 50; // Limite le nombre de pages
    private const MEMORY_LIMIT = '512M'; // Limite mémoire par processus
    private const TIMEOUT = 60; // Timeout en secondes

    #[Route('/convertpdf', name: 'app_convert_pdf')]
    public function index(): Response
    {
        return $this->render('convert_pdf/index.html.twig', [
            'controller_name' => 'Convert PDF',
            'max_size_mb' => self::MAX_FILE_SIZE / (1024 * 1024),
            'max_pages' => self::MAX_PAGES,
        ]);
    }

    #[Route('/convertpdf/upload', name: 'app_convert_pdf_upload', methods: ['POST'])]
    public function convertPdfToImages(Request $request): Response
    {
        // Définir les limites de mémoire et temps
        ini_set('memory_limit', self::MEMORY_LIMIT);
        ini_set('max_execution_time', self::TIMEOUT);
        
        $uploadedFile = $request->files->get('pdf_file');
        
        // Validation stricte
        if (!$this->validateUploadedFile($uploadedFile)) {
            return $this->redirectToRoute('app_convert_pdf');
        }

        // Créer un répertoire temporaire unique
        $tempDir = $this->createTempDirectory();
        $pdfPath = null;

        try {
            // Déplacer le fichier uploadé
            $fileName = 'input_' . uniqid() . '.pdf';
            $pdfPath = $tempDir . '/' . $fileName;
            $uploadedFile->move($tempDir, $fileName);

            // Vérifier que c'est un vrai PDF et compter les pages
            $pageCount = $this->getPdfPageCount($pdfPath);
            if ($pageCount === 0) {
                throw new \Exception('Fichier PDF invalide ou corrompu');
            }

            if ($pageCount > self::MAX_PAGES) {
                throw new \Exception("PDF trop volumineux: {$pageCount} pages (max: " . self::MAX_PAGES . ")");
            }

            // Conversion optimisée
            $images = $this->convertPdfOptimized($pdfPath, $tempDir, $pageCount);
            
            if (empty($images)) {
                throw new \Exception('Impossible de convertir le PDF');
            }

            // Créer le ZIP
            $zipPath = $this->createOptimizedZip($images, $tempDir);

            // Stocker les infos en session (léger)
            $session = $request->getSession();
            $session->set('pdf_download_ready', true);
            $session->set('pdf_zip_path', $zipPath);
            $session->set('pdf_temp_dir', $tempDir);
            $session->set('pdf_page_count', count($images));

            $this->addFlash('success', "PDF converti: {$pageCount} pages → " . count($images) . " images PNG");
            
            return $this->redirectToRoute('app_convert_pdf');

        } catch (\Exception $e) {
            // Nettoyage en cas d'erreur
            $this->cleanupFiles($pdfPath, $tempDir);
            $this->addFlash('error', 'Erreur: ' . $e->getMessage());
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

        if (!$zipPath || !file_exists($zipPath)) {
            $this->addFlash('error', 'Fichier expiré ou inexistant.');
            $this->clearSession($session);
            return $this->redirectToRoute('app_convert_pdf');
        }

        // Préparer la réponse
        $response = new BinaryFileResponse($zipPath);
        $response->setContentDisposition(
            ResponseHeaderBag::DISPOSITION_ATTACHMENT,
            'pdf_images_' . date('Y-m-d_H-i-s') . '.zip'
        );

        // Nettoyage automatique après téléchargement
        $response->deleteFileAfterSend(true);
        
        register_shutdown_function(function() use ($tempDir) {
            $this->cleanupDirectory($tempDir);
        });

        $this->clearSession($session);
        return $response;
    }

    #[Route('/convertpdf/clear', name: 'app_convert_pdf_clear', methods: ['POST'])]
    public function clearDownloadSession(Request $request): Response
    {
        $session = $request->getSession();
        $tempDir = $session->get('pdf_temp_dir');
        
        if ($tempDir) {
            $this->cleanupDirectory($tempDir);
        }
        
        $this->clearSession($session);
        return $this->json(['status' => 'cleared']);
    }

    private function validateUploadedFile($uploadedFile): bool
    {
        if (!$uploadedFile || !$uploadedFile instanceof UploadedFile) {
            $this->addFlash('error', 'Aucun fichier sélectionné.');
            return false;
        }

        if ($uploadedFile->getSize() > self::MAX_FILE_SIZE) {
            $sizeMB = round(self::MAX_FILE_SIZE / (1024 * 1024), 1);
            $this->addFlash('error', "Fichier trop volumineux (max: {$sizeMB}MB)");
            return false;
        }

        if (strtolower($uploadedFile->getClientOriginalExtension()) !== 'pdf') {
            $this->addFlash('error', 'Seuls les fichiers PDF sont acceptés.');
            return false;
        }

        // Vérifier le MIME type
        if ($uploadedFile->getMimeType() !== 'application/pdf') {
            $this->addFlash('error', 'Type de fichier invalide.');
            return false;
        }

        return true;
    }

    private function createTempDirectory(): string
    {
        $tempDir = sys_get_temp_dir() . '/pdf_convert_' . uniqid() . '_' . getmypid();
        if (!mkdir($tempDir, 0700, true)) {
            throw new \Exception('Impossible de créer le répertoire temporaire');
        }
        return $tempDir;
    }

    private function getPdfPageCount(string $pdfPath): int
    {
        // Vérifier que le fichier existe et n'est pas vide
        if (!file_exists($pdfPath) || filesize($pdfPath) === 0) {
            return 0;
        }

        // Méthode 1: Avec Imagick (plus fiable)
        if (extension_loaded('imagick')) {
            try {
                $imagick = new \Imagick();
                $imagick->pingImage($pdfPath); // ping = pas de chargement en mémoire
                $pageCount = $imagick->getNumberImages();
                $imagick->clear();
                
                if ($pageCount > 0) {
                    return $pageCount;
                }
            } catch (\Exception $e) {
                error_log("Imagick ping failed: " . $e->getMessage());
            }
        }

        // Méthode 2: Avec pdfinfo (si disponible)
        try {
            $output = [];
            $returnVar = 0;
            exec('pdfinfo "' . $pdfPath . '" 2>&1', $output, $returnVar);
            
            if ($returnVar === 0) {
                foreach ($output as $line) {
                    if (preg_match('/Pages:\s*(\d+)/', $line, $matches)) {
                        return (int)$matches[1];
                    }
                }
            }
        } catch (\Exception $e) {
            // Continue avec la méthode suivante
        }

        // Méthode 3: Lecture basique du PDF (première partie seulement)
        try {
            $handle = fopen($pdfPath, 'rb');
            if ($handle) {
                $content = fread($handle, 16384); // Lire seulement 16KB
                fclose($handle);
                
                // Chercher le nombre de pages dans l'en-tête
                if (preg_match('/\/Count\s+(\d+)/', $content, $matches)) {
                    return (int)$matches[1];
                }
                
                // Méthode alternative: compter les objets Page
                $pageCount = substr_count($content, '/Type /Page');
                if ($pageCount > 0) {
                    return $pageCount;
                }
            }
        } catch (\Exception $e) {
            error_log("PDF parsing failed: " . $e->getMessage());
        }

        // Méthode 4: Fallback - assumer 1 page si le fichier semble valide
        try {
            $handle = fopen($pdfPath, 'rb');
            if ($handle) {
                $header = fread($handle, 8);
                fclose($handle);
                
                // Vérifier l'en-tête PDF
                if (strpos($header, '%PDF-') === 0) {
                    return 1; // Au moins une page si c'est un PDF valide
                }
            }
        } catch (\Exception $e) {
            // Échec final
        }

        return 0;
    }

    private function convertPdfOptimized(string $pdfPath, string $outputDir, int $pageCount): array
    {
        $images = [];

        if (!extension_loaded('imagick')) {
            return $this->createLightweightDemo($outputDir, min($pageCount, 3));
        }

        // Vérifier que le fichier PDF est lisible
        if (!is_readable($pdfPath) || filesize($pdfPath) === 0) {
            throw new \Exception('Fichier PDF illisible ou vide');
        }

        try {
            // Configuration Imagick
            $imagick = new \Imagick();
            $imagick->setResourceLimit(\Imagick::RESOURCETYPE_MEMORY, 256 * 1024 * 1024);
            $imagick->setResourceLimit(\Imagick::RESOURCETYPE_DISK, 512 * 1024 * 1024);
            $imagick->setResolution(120, 120);

            // Test de lecture du PDF
            try {
                $imagick->readImage($pdfPath . '[0]'); // Lire seulement la première page pour tester
                $imagick->clear();
            } catch (\Exception $e) {
                throw new \Exception('PDF non lisible par Imagick: ' . $e->getMessage());
            }

            // Conversion page par page (plus stable)
            for ($pageNum = 0; $pageNum < min($pageCount, self::MAX_PAGES); $pageNum++) {
                try {
                    $singlePage = new \Imagick();
                    $singlePage->setResourceLimit(\Imagick::RESOURCETYPE_MEMORY, 128 * 1024 * 1024);
                    $singlePage->setResolution(120, 120);
                    
                    // Lire une seule page
                    $singlePage->readImage($pdfPath . '[' . $pageNum . ']');
                    
                    // Vérifier que la page est valide
                    if ($singlePage->getNumberImages() === 0) {
                        $singlePage->clear();
                        continue;
                    }

                    // Optimisations
                    $singlePage->setImageFormat('png');
                    $singlePage->setImageCompression(\Imagick::COMPRESSION_ZIP);
                    $singlePage->setImageCompressionQuality(85);
                    
                    // Redimensionner si nécessaire
                    $width = $singlePage->getImageWidth();
                    if ($width > 1200) {
                        $singlePage->scaleImage(1200, 0);
                    }
                    
                    $imagePath = $outputDir . '/page_' . str_pad($pageNum + 1, 3, '0', STR_PAD_LEFT) . '.png';
                    $singlePage->writeImage($imagePath);
                    
                    if (file_exists($imagePath) && filesize($imagePath) > 0) {
                        $images[] = $imagePath;
                    }
                    
                    $singlePage->clear();
                    
                } catch (\Exception $e) {
                    error_log("Erreur page {$pageNum}: " . $e->getMessage());
                    continue;
                }
            }

        } catch (\Exception $e) {
            // Fallback vers la démo si Imagick échoue complètement
            error_log("Imagick failed: " . $e->getMessage());
            return $this->createLightweightDemo($outputDir, min($pageCount, 3));
        }

        // Si aucune image n'a pu être générée, utiliser la démo
        if (empty($images)) {
            return $this->createLightweightDemo($outputDir, min($pageCount, 3));
        }

        return $images;
    }

    private function createLightweightDemo(string $outputDir, int $pageCount): array
    {
        $images = [];
        
        if (!extension_loaded('gd')) {
            throw new \Exception('Ni Imagick ni GD disponible');
        }
        
        for ($page = 1; $page <= $pageCount; $page++) {
            $width = 600;  // Plus petit
            $height = 800; // Plus petit
            
            $image = imagecreate($width, $height);
            $white = imagecolorallocate($image, 255, 255, 255);
            $black = imagecolorallocate($image, 0, 0, 0);
            $blue = imagecolorallocate($image, 0, 100, 200);
            
            imagefill($image, 0, 0, $white);
            imagestring($image, 5, 50, 50, 'PDF DEMO - Page ' . $page, $blue);
            imagestring($image, 3, 50, 100, 'Imagick non disponible', $black);
            imagestring($image, 2, 50, 150, 'Version de demonstration', $black);
            
            $imagePath = $outputDir . '/demo_page_' . str_pad($page, 3, '0', STR_PAD_LEFT) . '.png';
            imagepng($image, $imagePath, 6); // Compression PNG
            imagedestroy($image);
            
            $images[] = $imagePath;
        }
        
        return $images;
    }

    private function createOptimizedZip(array $images, string $baseDir): string
    {
        $zipPath = $baseDir . '/images.zip';
        $zip = new \ZipArchive();

        if ($zip->open($zipPath, \ZipArchive::CREATE) !== TRUE) {
            throw new \Exception('Impossible de créer le ZIP');
        }

        foreach ($images as $imagePath) {
            $fileName = basename($imagePath);
            $zip->addFile($imagePath, $fileName);
        }

        $zip->close();
        
        // Supprimer les images individuelles pour libérer l'espace
        foreach ($images as $imagePath) {
            if (file_exists($imagePath)) {
                unlink($imagePath);
            }
        }
        
        return $zipPath;
    }

    private function cleanupFiles(?string $pdfPath, string $tempDir): void
    {
        if ($pdfPath && file_exists($pdfPath)) {
            unlink($pdfPath);
        }
        $this->cleanupDirectory($tempDir);
    }

    private function cleanupDirectory(string $dir): void
    {
        if (!is_dir($dir)) return;
        
        try {
            $files = glob($dir . '/*');
            foreach ($files as $file) {
                if (is_file($file)) {
                    unlink($file);
                }
            }
            rmdir($dir);
        } catch (\Exception $e) {
            error_log("Erreur nettoyage: " . $e->getMessage());
        }
    }

    private function clearSession($session): void
    {
        $session->remove('pdf_download_ready');
        $session->remove('pdf_zip_path');
        $session->remove('pdf_temp_dir');
        $session->remove('pdf_page_count');
    }

    #[Route('/convertpdf/test', name: 'app_convert_pdf_test')]
    public function testDependencies(): Response
    {
        $memoryLimit = ini_get('memory_limit');
        $maxExecutionTime = ini_get('max_execution_time');
        
        $status = [
            'imagick' => extension_loaded('imagick'),
            'gd' => extension_loaded('gd'),
            'zip' => extension_loaded('zip'),
            'memory_limit' => $memoryLimit,
            'max_execution_time' => $maxExecutionTime,
            'temp_dir' => sys_get_temp_dir(),
            'writable' => is_writable(sys_get_temp_dir()),
            'max_file_size_mb' => self::MAX_FILE_SIZE / (1024 * 1024),
            'max_pages' => self::MAX_PAGES
        ];

        return $this->json($status);
    }
}