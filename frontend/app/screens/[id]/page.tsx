'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';

interface PictureData {
  id: string;
  imagePath: string;
  delay: string;
  startDate: string;
  endDate: string;
  backgroundColor: string;
}

const API_URL = process.env.NEXT_PUBLIC_EXPRESS_API_URL;
const TRANSITION_DURATION = 1000;
const DEFAULT_DELAY = 5;
const REFRESH_INTERVAL = 15 * 1000; 
const MIN_DISPLAY_TIME = 3000;

const ScreenPage = () => {
  const { id } = useParams();
  const [pictures, setPictures] = useState<PictureData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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

  useEffect(() => {
    setMounted(true);
    
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.margin = '';
      document.body.style.padding = '';
      clearTimers();
    };
  }, [clearTimers]);

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
      
      const screenRes = await fetch(`${API_URL}/screens/${id}?t=${timestamp}`, {
        cache: 'no-store',
        headers: cacheHeaders
      });
      
      if (!screenRes.ok) {
        throw new Error(`Erreur ${screenRes.status}: Impossible de récupérer les données d'écran`);
      }
      
      const screenDataResponse = await screenRes.json();
      
      if (!screenDataResponse.lsimg?.length) {
        setPictures([]);
        return;
      }
      
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

  useEffect(() => {
    if (mounted) fetchData();
  }, [mounted, fetchData]);

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

  const validPictures = useMemo(() => {
    return pictures.filter(pic => pic && isImageInDateRange(pic.startDate, pic.endDate));
  }, [pictures, isImageInDateRange]);
  
  useEffect(() => {
    if (validPictures.length > 0 && currentIndex >= validPictures.length) {
      setCurrentIndex(0);
    }
  }, [validPictures, currentIndex]);

  const startTransition = useCallback(() => {
    if (timersRef.current.transition) {
      clearTimeout(timersRef.current.transition);
      timersRef.current.transition = null;
    }
    
    if (validPictures.length <= 1) return;
    
    const now = Date.now();
    const timeSinceLastTransition = now - lastTransitionTimeRef.current;
    if (timeSinceLastTransition < MIN_DISPLAY_TIME) {
      console.log(`Transition ignorée: trop rapide (${timeSinceLastTransition}ms)`);
      return;
    }
    
    setTransitioning(true);
    lastTransitionTimeRef.current = now;
    
    const nextIndex = (currentIndex + 1) % validPictures.length;
    
    const nextColor = validPictures[nextIndex]?.backgroundColor || '#fff';
    document.body.style.backgroundColor = nextColor;
    
    timersRef.current.transition = setTimeout(() => {
      setCurrentIndex(nextIndex);
      setTransitioning(false);
      timersRef.current.transition = null;
    }, TRANSITION_DURATION);
    
  }, [validPictures, currentIndex]);

  useEffect(() => {
    if (timersRef.current.rotation) {
      clearTimeout(timersRef.current.rotation);
      timersRef.current.rotation = null;
    }
    
    if (!validPictures.length || transitioning) return;
    
    const currentPic = validPictures[currentIndex];
    if (!currentPic) return;
    
    const delay = parseInt(currentPic.delay || String(DEFAULT_DELAY), 10);
    const imageDelay = (isNaN(delay) || delay <= 0) ? DEFAULT_DELAY * 1000 : delay * 1000;
    const safeDelay = Math.max(imageDelay, MIN_DISPLAY_TIME);
    
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

  if (!mounted || !validPictures.length) {
    return <div style={{ height: '100vh', width: '100vw', background: '#fff' }} />;
  }
  
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