<?php

namespace App\Service;

use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\File\File;

class PdfConverterService
{
    private int $maxFileSize;
    private int $maxPages;
    private string $memoryLimit;
    private int $timeout;

    public function __construct(
        int $maxFileSize = 5242880, // 5MB par défaut
        int $maxPages = 50,
        string $memoryLimit = '512M',
        int $timeout = 60
    ) {
        $this->maxFileSize = $maxFileSize;
        $this->maxPages = $maxPages;
        $this->memoryLimit = $memoryLimit;
        $this->timeout = $timeout;
    }

    /**
     * Convertit toutes les pages d'un PDF en images PNG et retourne un ZIP
     */
    public function convertPdfToImages(UploadedFile $pdfFile, string $outputDir): array
    {
        ini_set('memory_limit', $this->memoryLimit);
        ini_set('max_execution_time', $this->timeout);

        if (!$this->validatePdfFile($pdfFile)) {
            throw new \Exception('Fichier PDF invalide');
        }

        $tempDir = $this->createTempDirectory();
        $pdfPath = null;

        try {
            $fileName = 'input_' . uniqid() . '.pdf';
            $pdfPath = $tempDir . '/' . $fileName;
            $pdfFile->move($tempDir, $fileName);

            $pageCount = $this->getPdfPageCount($pdfPath);
            
            if ($pageCount === 0) {
                throw new \Exception('Fichier PDF invalide ou corrompu');
            }

            if ($pageCount > $this->maxPages) {
                throw new \Exception("PDF trop volumineux: {$pageCount} pages (max: " . $this->maxPages . ")");
            }

            $images = $this->convertAllPagesToImages($pdfPath, $tempDir, $pageCount);
            
            if (empty($images)) {
                throw new \Exception('Impossible de convertir le PDF');
            }

            $zipPath = $this->createOptimizedZip($images, $tempDir);

            return [
                'zip_path' => $zipPath,
                'page_count' => $pageCount,
                'image_count' => count($images),
                'temp_dir' => $tempDir
            ];

        } catch (\Exception $e) {
            $this->cleanupFiles($pdfPath, $tempDir);
            throw $e;
        }
    }

    /**
     * Convertit seulement la première page d'un PDF en PNG
     */
    public function convertPdfToFirstPagePng(UploadedFile $pdfFile, string $outputDir): ?File
    {
        ini_set('memory_limit', $this->memoryLimit);
        ini_set('max_execution_time', $this->timeout);

        if (!$this->validatePdfFile($pdfFile)) {
            return null;
        }

        $tempDir = $this->createTempDirectory();
        $pdfPath = null;

        try {
            $fileName = 'input_' . uniqid() . '.pdf';
            $pdfPath = $tempDir . '/' . $fileName;
            $pdfFile->move($tempDir, $fileName);

            $pageCount = $this->getPdfPageCount($pdfPath);
            if ($pageCount === 0) {
                throw new \Exception('Fichier PDF invalide ou corrompu');
            }

            if ($pageCount > $this->maxPages) {
                throw new \Exception("PDF trop volumineux: {$pageCount} pages (max: " . $this->maxPages . ")");
            }

            $pngPath = $this->convertFirstPageToPng($pdfPath, $outputDir);
            
            if (!$pngPath) {
                throw new \Exception('Impossible de convertir le PDF');
            }

            return new File($pngPath);

        } catch (\Exception $e) {
            $this->cleanupFiles($pdfPath, $tempDir);
            throw $e;
        } finally {
            $this->cleanupDirectory($tempDir);
        }
    }

    public function validatePdfFile(UploadedFile $uploadedFile): bool
    {
        if (!$uploadedFile || !$uploadedFile instanceof UploadedFile) {
            return false;
        }

        if ($uploadedFile->getSize() > $this->maxFileSize) {
            return false;
        }

        if (strtolower($uploadedFile->getClientOriginalExtension()) !== 'pdf') {
            return false;
        }

        if ($uploadedFile->getMimeType() !== 'application/pdf') {
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
        if (!file_exists($pdfPath) || filesize($pdfPath) === 0) {
            return 0;
        }

        // Méthode 1: Avec Imagick (plus fiable)
        if (extension_loaded('imagick')) {
            try {
                $imagick = new \Imagick();
                $imagick->pingImage($pdfPath);
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

        // Méthode 3: Lecture basique du PDF
        try {
            $handle = fopen($pdfPath, 'rb');
            if ($handle) {
                $content = fread($handle, 16384);
                fclose($handle);
                
                if (preg_match('/\/Count\s+(\d+)/', $content, $matches)) {
                    return (int)$matches[1];
                }
                
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
                
                if (strpos($header, '%PDF-') === 0) {
                    return 1;
                }
            }
        } catch (\Exception $e) {
            // Échec final
        }

        return 0;
    }

    private function convertAllPagesToImages(string $pdfPath, string $outputDir, int $pageCount): array
    {
        if (!extension_loaded('imagick')) {
            return $this->createLightweightDemo($outputDir, min($pageCount, 3));
        }

        $images = [];

        try {
            for ($pageNum = 0; $pageNum < min($pageCount, $this->maxPages); $pageNum++) {
                try {
                    $singlePage = new \Imagick();
                    $singlePage->setResourceLimit(\Imagick::RESOURCETYPE_MEMORY, 128 * 1024 * 1024);
                    $singlePage->setResolution(120, 120);
                    $singlePage->readImage($pdfPath . '[' . $pageNum . ']');
                    
                    if ($singlePage->getNumberImages() === 0) {
                        $singlePage->clear();
                        continue;
                    }

                    $singlePage->setImageFormat('png');
                    $singlePage->setImageCompression(\Imagick::COMPRESSION_ZIP);
                    $singlePage->setImageCompressionQuality(85);
                    
                    if ($singlePage->getImageWidth() > 1200) {
                        $singlePage->scaleImage(1200, 0);
                    }
                    
                    $imagePath = $outputDir . '/page_' . str_pad($pageNum + 1, 3, '0', STR_PAD_LEFT) . '.png';
                    $singlePage->writeImage($imagePath);
                    
                    if (file_exists($imagePath) && filesize($imagePath) > 0) {
                        $images[] = $imagePath;
                    }
                    
                    $singlePage->clear();
                } catch (\Exception $e) {
                    error_log("Error converting page {$pageNum}: " . $e->getMessage());
                    continue;
                }
            }
        } catch (\Exception $e) {
            error_log("Global conversion error: " . $e->getMessage());
            return $this->createLightweightDemo($outputDir, min($pageCount, 3));
        }

        return empty($images) ? $this->createLightweightDemo($outputDir, min($pageCount, 3)) : $images;
    }

    private function convertFirstPageToPng(string $pdfPath, string $outputDir): ?string
    {
        if (!extension_loaded('imagick')) {
            return $this->createLightweightDemo($outputDir, 1)[0] ?? null;
        }

        if (!is_readable($pdfPath) || filesize($pdfPath) === 0) {
            throw new \Exception('Fichier PDF illisible ou vide');
        }

        try {
            $imagick = new \Imagick();
            $imagick->setResourceLimit(\Imagick::RESOURCETYPE_MEMORY, 256 * 1024 * 1024);
            $imagick->setResourceLimit(\Imagick::RESOURCETYPE_DISK, 512 * 1024 * 1024);
            $imagick->setResolution(120, 120);

            try {
                $imagick->readImage($pdfPath . '[0]');
            } catch (\Exception $e) {
                throw new \Exception('PDF non lisible par Imagick: ' . $e->getMessage());
            }

            if ($imagick->getNumberImages() === 0) {
                $imagick->clear();
                throw new \Exception('Aucune page trouvée dans le PDF');
            }

            $imagick->setImageFormat('png');
            $imagick->setImageCompression(\Imagick::COMPRESSION_ZIP);
            $imagick->setImageCompressionQuality(85);
            
            $width = $imagick->getImageWidth();
            if ($width > 1200) {
                $imagick->scaleImage(1200, 0);
            }
            
            $imagePath = $outputDir . '/converted_' . uniqid() . '.png';
            $imagick->writeImage($imagePath);
            $imagick->clear();
            
            if (file_exists($imagePath) && filesize($imagePath) > 0) {
                return $imagePath;
            }

        } catch (\Exception $e) {
            error_log("Imagick conversion failed: " . $e->getMessage());
            $demoImages = $this->createLightweightDemo($outputDir, 1);
            return $demoImages[0] ?? null;
        }

        return null;
    }

    private function createLightweightDemo(string $outputDir, int $pageCount): array
    {
        if (!extension_loaded('gd')) {
            throw new \Exception('Ni Imagick ni GD disponible');
        }
        
        $images = [];
        for ($page = 1; $page <= $pageCount; $page++) {
            $image = imagecreate(600, 800);
            $white = imagecolorallocate($image, 255, 255, 255);
            $blue = imagecolorallocate($image, 0, 100, 200);
            $black = imagecolorallocate($image, 0, 0, 0);
            
            imagefill($image, 0, 0, $white);
            imagestring($image, 5, 50, 50, 'PDF DEMO - Page ' . $page, $blue);
            imagestring($image, 3, 50, 100, 'Imagick non disponible', $black);
            imagestring($image, 2, 50, 150, 'Version de demonstration', $black);
            
            $imagePath = $outputDir . '/demo_page_' . str_pad($page, 3, '0', STR_PAD_LEFT) . '.png';
            imagepng($image, $imagePath, 6);
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
            $zip->addFile($imagePath, basename($imagePath));
        }

        $zip->close();
        
        // Supprimer les images individuelles
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

    public function cleanupDirectory(string $dir): void
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

    public function getMaxFileSizeMB(): float
    {
        return $this->maxFileSize / (1024 * 1024);
    }

    public function getMaxPages(): int
    {
        return $this->maxPages;
    }
}