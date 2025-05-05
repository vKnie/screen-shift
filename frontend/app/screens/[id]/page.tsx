'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';

// Types
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

// Configuration
const API_URL = process.env.NEXT_PUBLIC_EXPRESS_API_URL;
const TRANSITION_DURATION = 1000; // ms
const DEFAULT_DELAY = 5; // secondes
const REFRESH_INTERVAL = 15 * 1000; // 15 secondes
const MIN_DISPLAY_TIME = 3000; // ms

const ScreenPage = () => {
  const { id } = useParams();
  const [screenData, setScreenData] = useState<ScreenData | null>(null);
  const [pictures, setPictures] = useState<PictureData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs
  const timersRef = useRef<{
    transition: NodeJS.Timeout | null;
    rotation: NodeJS.Timeout | null;
    refresh: NodeJS.Timeout | null;
  }>({
    transition: null,
    rotation: null,
    refresh: null
  });
  
  const lastTransitionTimeRef = useRef<number>(Date.now());

  // Nettoyage des timers
  const clearTimers = useCallback(() => {
    const { transition, rotation, refresh } = timersRef.current;
    if (transition) clearTimeout(transition);
    if (rotation) clearTimeout(rotation);
    if (refresh) clearInterval(refresh);
    
    timersRef.current = {
      transition: null,
      rotation: null,
      refresh: null
    };
  }, []);

  // Configuration du document
  useEffect(() => {
    setMounted(true);
    
    // Style du document
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    
    return () => {
      // Nettoyer à la désinstallation
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.margin = '';
      document.body.style.padding = '';
      clearTimers();
    };
  }, [clearTimers]);

  // Fonction pour vérifier la plage de dates
  const isImageInDateRange = useCallback((startDate: string, endDate: string): boolean => {
    try {
      const today = new Date();
      const start = new Date(startDate);
      const end = new Date(endDate);
      return today >= start && today <= end;
    } catch (e) {
      console.error("Erreur de format de date:", e);
      return false;
    }
  }, []);

  // Fonction pour récupérer les données avec cache busting optimisé
  const fetchData = useCallback(async () => {
    if (!id || transitioning) return;
    
    try {
      setError(null);
      const timestamp = Date.now();
      const cacheHeaders = {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      };
      
      // Récupérer les informations de l'écran
      const screenRes = await fetch(`${API_URL}/screens/${id}?t=${timestamp}`, {
        cache: 'no-store',
        headers: cacheHeaders
      });
      
      if (!screenRes.ok) {
        throw new Error(`Erreur ${screenRes.status}: Impossible de récupérer les données d'écran`);
      }
      
      const screenDataResponse = await screenRes.json();
      setScreenData(screenDataResponse);
      
      // Si aucune image associée, terminer
      if (!screenDataResponse.lsimg?.length) {
        setPictures([]);
        return;
      }
      
      // Récupérer les images en parallèle
      const imgResults = await Promise.allSettled(
        screenDataResponse.lsimg.map((imgId: string) => 
          fetch(`${API_URL}/pictures/${imgId}?t=${timestamp}`, {
            cache: 'no-store',
            headers: cacheHeaders
          })
          .then(res => res.ok ? res.json() : null)
          .catch(err => {
            console.warn(`Erreur image ${imgId}:`, err);
            return null;
          })
        )
      );
      
      const validImages = imgResults
        .filter((result): result is PromiseFulfilledResult<PictureData | null> => 
          result.status === 'fulfilled' && result.value !== null
        )
        .map(result => result.value as PictureData);
      
      setPictures(validImages);
      setLastRefresh(Date.now());
      
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error);
      setError(`Erreur de connexion: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [id, transitioning]);

  // Récupérer les données au chargement initial
  useEffect(() => {
    if (mounted) fetchData();
  }, [mounted, fetchData]);

  // Rafraîchissement périodique des données
  useEffect(() => {
    if (!mounted) return;
    
    const refresh = () => {
      if (!transitioning) fetchData();
    };
    
    timersRef.current.refresh = setInterval(refresh, REFRESH_INTERVAL);
    
    return () => {
      if (timersRef.current.refresh) {
        clearInterval(timersRef.current.refresh);
        timersRef.current.refresh = null;
      }
    };
  }, [mounted, fetchData, transitioning]);

  // Filtrer les images valides avec mémoisation
  const validPictures = useMemo(() => {
    return pictures.filter(pic => pic && isImageInDateRange(pic.startDate, pic.endDate));
  }, [pictures, isImageInDateRange]);
  
  // S'assurer que currentIndex est valide
  useEffect(() => {
    if (validPictures.length > 0 && currentIndex >= validPictures.length) {
      setCurrentIndex(0);
    }
  }, [validPictures, currentIndex]);

  // Gérer la transition entre les images
  const startTransition = useCallback(() => {
    // Nettoyer le timer existant
    if (timersRef.current.transition) {
      clearTimeout(timersRef.current.transition);
      timersRef.current.transition = null;
    }
    
    // Vérifier s'il y a des images valides
    if (validPictures.length <= 1) return;
    
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
    
    // Mettre à jour la couleur de fond
    const nextColor = validPictures[nextIndex]?.backgroundColor || '#fff';
    document.body.style.backgroundColor = nextColor;
    
    // Planifier le changement d'image
    timersRef.current.transition = setTimeout(() => {
      setCurrentIndex(nextIndex);
      setTransitioning(false);
      timersRef.current.transition = null;
    }, TRANSITION_DURATION);
    
  }, [validPictures, currentIndex]);

  // Planifier la rotation des images
  useEffect(() => {
    // Nettoyer le timer existant
    if (timersRef.current.rotation) {
      clearTimeout(timersRef.current.rotation);
      timersRef.current.rotation = null;
    }
    
    // Vérifier les conditions pour démarrer une rotation
    if (!validPictures.length || transitioning) return;
    
    // Obtenir le délai de l'image actuelle
    const currentPic = validPictures[currentIndex];
    if (!currentPic) return;
    
    // Calculer le délai avec validation
    const delay = parseInt(currentPic.delay || String(DEFAULT_DELAY), 10);
    const imageDelay = (isNaN(delay) || delay <= 0) ? DEFAULT_DELAY * 1000 : delay * 1000;
    const safeDelay = Math.max(imageDelay, MIN_DISPLAY_TIME);
    
    // Planifier la prochaine transition
    timersRef.current.rotation = setTimeout(() => {
      startTransition();
      timersRef.current.rotation = null;
    }, safeDelay);
    
    return () => {
      if (timersRef.current.rotation) {
        clearTimeout(timersRef.current.rotation);
        timersRef.current.rotation = null;
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
          fill
          sizes="100vw"
          style={{ objectFit: 'contain' }}
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