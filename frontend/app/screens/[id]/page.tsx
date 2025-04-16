'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';

interface ScreenData {
  name: string;
  group: string;
  status: string;
  lsimg: string[];
}

interface PictureData {
  id: string;
  imagePath: string;
  delay: string;
  startDate: string;
  endDate: string;
  backgroundColor: string;
}

const API_URL = process.env.NEXT_PUBLIC_EXPRESS_API_URL;

// Constantes pour les paramètres configurables
const TRANSITION_DURATION = 1000; // ms - durée modérée pour éviter les bugs
const DEFAULT_DELAY = 5; // secondes
const REFRESH_INTERVAL = 15 * 1000; // 15 secondes
const MIN_DISPLAY_TIME = 3000; // Temps minimum d'affichage d'une image

const ScreenPage = () => {
  const { id } = useParams();
  const [, setScreenData] = useState<ScreenData | null>(null);
  const [pictures, setPictures] = useState<PictureData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Références pour gérer les timers
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const rotationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Référence pour suivre le dernier changement d'image
  const lastTransitionTimeRef = useRef<number>(Date.now());

  // Configuration du document
  useEffect(() => {
    setMounted(true);
    
    // Style du document
    const bodyStyle = document.body.style;
    const htmlStyle = document.documentElement.style;
    
    htmlStyle.overflow = 'hidden';
    bodyStyle.overflow = 'hidden';
    bodyStyle.margin = '0';
    bodyStyle.padding = '0';
    
    return () => {
      // Nettoyer à la désinstallation
      htmlStyle.overflow = '';
      bodyStyle.overflow = '';
      bodyStyle.margin = '';
      bodyStyle.padding = '';
      
      // Nettoyer tous les timers
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      if (rotationTimerRef.current) clearTimeout(rotationTimerRef.current);
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, []);

  // Fonction pour vérifier la plage de dates
  const isImageInDateRange = useCallback((startDate: string, endDate: string): boolean => {
    try {
      const today = new Date();
      const start = new Date(startDate);
      const end = new Date(endDate);
      return today >= start && today <= end;
    } catch (e) {
      // Gestion des erreurs de format de date
      console.error("Erreur de format de date:", e);
      return false;
    }
  }, []);

  // Fonction pour récupérer les données
  const fetchData = useCallback(async () => {
    if (!id || transitioning) {
      return;
    }
    
    try {
      setError(null);
      
      // Récupérer les informations de l'écran
      const timestamp = Date.now();
      const screenRes = await fetch(`${API_URL}/screens/${id}?nocache=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!screenRes.ok) {
        throw new Error(`Erreur ${screenRes.status}: Impossible de récupérer les données d'écran`);
      }
      
      const screenDataResponse = await screenRes.json();
      setScreenData(screenDataResponse);
      
      // Si aucune image associée, terminer
      if (!screenDataResponse.lsimg || screenDataResponse.lsimg.length === 0) {
        setPictures([]);
        return;
      }
      
      // Récupérer les images - utiliser Promise.allSettled pour gérer les erreurs individuelles
      const imgPromises = screenDataResponse.lsimg.map(async (imgId: string) => {
        try {
          const imgRes = await fetch(`${API_URL}/pictures/${imgId}?nocache=${timestamp}`, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });
          
          if (!imgRes.ok) {
            console.warn(`Image ${imgId} non trouvée (${imgRes.status})`);
            return null;
          }
          
          return await imgRes.json();
        } catch (error) {
          console.warn(`Erreur lors de la récupération de l'image ${imgId}:`, error);
          return null;
        }
      });
      
      const imgResults = await Promise.allSettled(imgPromises);
      const validResults = imgResults
        .filter((result): result is PromiseFulfilledResult<PictureData | null> => 
          result.status === 'fulfilled' && result.value !== null
        )
        .map(result => result.value as PictureData);
      
      setPictures(validResults);
      setLastRefresh(Date.now());
      
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error);
      setError(`Erreur de connexion: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [id, transitioning]);

  // Récupérer les données au chargement initial
  useEffect(() => {
    if (mounted) {
      fetchData();
    }
  }, [mounted, fetchData]);

  // Récupérer périodiquement les données
  useEffect(() => {
    if (!mounted) return;
    
    const refresh = () => {
      if (!transitioning) {
        fetchData();
      }
    };
    
    refreshTimerRef.current = setInterval(refresh, REFRESH_INTERVAL);
    
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [mounted, fetchData, transitioning]);

  // Filtrer les images valides
  const validPictures = useMemo(() => {
    if (!pictures || pictures.length === 0) return [];
    const filtered = pictures.filter(pic => {
      if (!pic) return false;
      return isImageInDateRange(pic.startDate, pic.endDate);
    });
    return filtered;
  }, [pictures, isImageInDateRange]);
  
  // S'assurer que currentIndex est valide
  useEffect(() => {
    if (validPictures.length > 0 && currentIndex >= validPictures.length) {
      setCurrentIndex(0);
    }
  }, [validPictures, currentIndex]);

  // Gérer la transition entre les images
  const startTransition = useCallback(() => {
    // Nettoyer les timers existants pour éviter les collisions
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    
    // Vérifier s'il y a des images valides
    if (validPictures.length <= 1) {
      return;
    }
    
    // Vérifier si assez de temps s'est écoulé depuis la dernière transition
    const now = Date.now();
    const timeSinceLastTransition = now - lastTransitionTimeRef.current;
    if (timeSinceLastTransition < MIN_DISPLAY_TIME) {
      console.log(`Transition ignorée: trop rapide (${timeSinceLastTransition}ms)`);
      return;
    }
    
    setTransitioning(true);
    lastTransitionTimeRef.current = now;
    
    // Calculer l'index de la prochaine image
    const nextIndex = (currentIndex + 1) % validPictures.length;
    
    // Récupérer la couleur de fond de la prochaine image (avec fallback)
    const nextColor = validPictures[nextIndex]?.backgroundColor || '#fff';
    document.body.style.backgroundColor = nextColor;
    
    // Planifier le changement d'image avec nettoyage approprié
    transitionTimerRef.current = setTimeout(() => {
      setCurrentIndex(nextIndex);
      setTransitioning(false);
      transitionTimerRef.current = null;
    }, TRANSITION_DURATION);
    
  }, [validPictures, currentIndex]);

  // Planifier la rotation des images
  useEffect(() => {
    // Nettoyer le timer existant
    if (rotationTimerRef.current) {
      clearTimeout(rotationTimerRef.current);
      rotationTimerRef.current = null;
    }
    
    // Vérifier les conditions pour démarrer une rotation
    if (!validPictures.length || transitioning) {
      return;
    }
    
    // Obtenir le délai de l'image actuelle avec vérification d'erreurs
    const currentPic = validPictures[currentIndex];
    if (!currentPic) return;
    
    const delayStr = currentPic.delay || String(DEFAULT_DELAY);
    const delay = parseInt(delayStr, 10);
    const imageDelay = (isNaN(delay) || delay <= 0) ? DEFAULT_DELAY * 1000 : delay * 1000;
    
    // S'assurer d'un délai minimum raisonnable
    const safeDelay = Math.max(imageDelay, MIN_DISPLAY_TIME);
    
    // Planifier la prochaine transition
    rotationTimerRef.current = setTimeout(() => {
      startTransition();
      rotationTimerRef.current = null;
    }, safeDelay);
    
    // Nettoyer le timer lors du démontage ou des changements
    return () => {
      if (rotationTimerRef.current) {
        clearTimeout(rotationTimerRef.current);
        rotationTimerRef.current = null;
      }
    };
  }, [validPictures, currentIndex, transitioning, startTransition]);

  // Afficher une page blanche si nécessaire
  if (!mounted || !validPictures.length) {
    return <div style={{ height: '100vh', width: '100vw', background: '#fff' }} />;
  }
  
  // S'assurer que l'image actuelle existe
  const currentPic = validPictures[currentIndex];
  if (!currentPic) {
    return <div style={{ height: '100vh', width: '100vw', background: '#fff' }} />;
  }

  return (
    <div style={{
      display: 'flex',
      position: 'fixed',
      inset: 0,
      padding: 0,
      margin: 0,
      justifyContent: 'center',
      alignItems: 'center',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      transition: `background-color ${TRANSITION_DURATION}ms ease-in-out`,
      backgroundColor: currentPic.backgroundColor || '#fff'
    }}>
      <div style={{ 
        position: 'absolute',
        width: '100%', 
        height: '100%', 
        opacity: transitioning ? 0 : 1,
        transition: `opacity ${TRANSITION_DURATION}ms ease-in-out`
      }}>
        <Image
          src={`${API_URL}${currentPic.imagePath}`}
          alt="Slide image"
          layout="fill"
          objectFit="contain"
          priority
          onError={() => console.error(`Erreur de chargement d'image: ${currentPic.imagePath}`)}
        />
      </div>
      
      {/* Indicateur de mode développement */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'absolute',
          bottom: 10,
          right: 10,
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '5px 10px',
          borderRadius: 5,
          fontSize: 12,
          zIndex: 1000
        }}>
          Images: {validPictures.length} | 
          Actuelle: {currentIndex + 1} | 
          Délai: {currentPic.delay || DEFAULT_DELAY}s | 
          Mis à jour: {new Date(lastRefresh).toLocaleTimeString()}
          {error && <div style={{ color: 'red', marginTop: 4 }}>{error}</div>}
        </div>
      )}
    </div>
  );
};

export default ScreenPage;