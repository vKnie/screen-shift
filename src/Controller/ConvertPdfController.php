<?php

namespace App\Controller;

use App\Service\PdfConverterService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[IsGranted('ROLE_ACCESS')]
final class ConvertPdfController extends AbstractController
{
    private PdfConverterService $pdfConverter;

    public function __construct(PdfConverterService $pdfConverter)
    {
        $this->pdfConverter = $pdfConverter;
    }

    #[Route('/convertpdf', name: 'app_convert_pdf')]
    public function index(Request $request): Response
    {
        // Vérifier les paramètres GET pour la notification de succès
        if ($request->query->get('success')) {
            $pageCount = $request->query->get('pages', 0);
            $imageCount = $request->query->get('images', 0);
            $this->addFlash('success', "PDF converti avec succès ! {$pageCount} pages → {$imageCount} images PNG.");
        }

        // Vérifier s'il y a une conversion réussie en session (fallback)
        $session = $request->getSession();
        $conversionSuccess = $session->get('pdf_conversion_success');
        
        if ($conversionSuccess) {
            $this->addFlash('success', "PDF converti avec succès ! {$conversionSuccess['page_count']} pages → {$conversionSuccess['image_count']} images PNG.");
            $session->remove('pdf_conversion_success');
        }

        return $this->render('convert_pdf/index.html.twig', [
            'controller_name' => 'Convert PDF',
            'max_size_mb' => $this->pdfConverter->getMaxFileSizeMB(),
            'max_pages' => $this->pdfConverter->getMaxPages(),
        ]);
    }

    #[Route('/convertpdf/upload', name: 'app_convert_pdf_upload', methods: ['POST'])]
    public function convertPdfToImages(Request $request): Response
    {
        $uploadedFile = $request->files->get('pdf_file');
        
        // Validation basique via le service
        if (!$this->pdfConverter->validatePdfFile($uploadedFile)) {
            return $this->json(['error' => 'Fichier PDF invalide'], 400);
        }

        $tempDir = $this->createTempDirectory();
        
        try {
            // UTILISATION DU SERVICE pour la conversion
            $result = $this->pdfConverter->convertPdfToImages($uploadedFile, $tempDir);
            
            $zipPath = $result['zip_path'];
            $pageCount = $result['page_count'];
            $imageCount = $result['image_count'];
            $serviceTempDir = $result['temp_dir'];

            // Téléchargement direct
            $zipFileName = pathinfo($uploadedFile->getClientOriginalName(), PATHINFO_FILENAME) . '_images_' . date('Y-m-d_H-i-s') . '.zip';
            
            $response = new BinaryFileResponse($zipPath);
            $response->setContentDisposition(ResponseHeaderBag::DISPOSITION_ATTACHMENT, $zipFileName);
            $response->deleteFileAfterSend(true);
            
            // Headers pour indiquer le succès au JavaScript
            $response->headers->set('X-Conversion-Success', 'true');
            $response->headers->set('X-Pages-Count', $pageCount);
            $response->headers->set('X-Images-Count', $imageCount);
            
            // Nettoyage après envoi
            register_shutdown_function(function() use ($serviceTempDir, $tempDir) {
                $this->pdfConverter->cleanupDirectory($serviceTempDir);
                $this->cleanupDirectory($tempDir);
            });

            return $response;

        } catch (\Exception $e) {
            $this->cleanupDirectory($tempDir);
            return $this->json(['error' => $e->getMessage()], 500);
        }
    }

    #[Route('/convertpdf/test', name: 'app_convert_pdf_test')]
    public function testDependencies(): Response
    {
        return $this->json([
            'imagick' => extension_loaded('imagick'),
            'gd' => extension_loaded('gd'),
            'zip' => extension_loaded('zip'),
            'memory_limit' => ini_get('memory_limit'),
            'max_execution_time' => ini_get('max_execution_time'),
            'temp_dir' => sys_get_temp_dir(),
            'writable' => is_writable(sys_get_temp_dir()),
            'max_file_size_mb' => $this->pdfConverter->getMaxFileSizeMB(),
            'max_pages' => $this->pdfConverter->getMaxPages()
        ]);
    }

    private function createTempDirectory(): string
    {
        $tempDir = sys_get_temp_dir() . '/pdf_controller_' . uniqid();
        if (!mkdir($tempDir, 0700, true)) {
            throw new \Exception('Impossible de créer le répertoire temporaire');
        }
        return $tempDir;
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
            error_log("Erreur nettoyage controller: " . $e->getMessage());
        }
    }
}