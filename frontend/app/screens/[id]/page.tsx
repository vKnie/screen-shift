'use client';

import { useEffect, useState, useCallback } from 'react';
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

const ScreenPage = () => {
  const { id } = useParams();
  const [screenData, setScreenData] = useState<ScreenData | null>(null);
  const [pictures, setPictures] = useState<PictureData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [opacity, setOpacity] = useState(1);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.transition = 'background-color 1s ease-in-out';
    
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.margin = '';
      document.body.style.padding = '';
      document.body.style.transition = '';
    };
  }, []);

  useEffect(() => {
    if (isClient && id) {
      console.log('Fetching data for ID:', id);
      const fetchScreenData = async () => {
        try {
          const res = await fetch(`http://localhost:9999/screens/${id}`);
          console.log('Response status:', res.status);
          if (!res.ok) {
            throw new Error('Failed to fetch');
          }
          const data = await res.json();
          console.log('Fetched data:', data);
          setScreenData(data);
        } catch (error) {
          console.error('Error fetching screen data:', error);
        }
      };

      fetchScreenData();
    }
  }, [id, isClient]);

  const isImageInDateRange = useCallback((startDate: string, endDate: string): boolean => {
    const today = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    return today >= start && today <= end;
  }, []);

  const getValidPictures = useCallback(() => {
    return pictures.filter((pic) =>
      isImageInDateRange(pic.startDate, pic.endDate)
    );
  }, [pictures, isImageInDateRange]);

  useEffect(() => {
    const fetchPictures = async () => {
      if (!screenData) return;
  
      try {
        const promises = screenData.lsimg.map(async (imgId) => {
          const res = await fetch(`http://localhost:9999/pictures/${imgId}`);
          if (!res.ok) throw new Error('Failed to fetch image');
          return res.json();
        });
  
        const images = await Promise.all(promises);
        setPictures(images);
        
        if (images.length > 0) {
          const validPics = images.filter(pic => 
            isImageInDateRange(pic.startDate, pic.endDate)
          );
          if (validPics.length > 0) {
            document.body.style.backgroundColor = validPics[0].backgroundColor || '';
          }
        }
      } catch (error) {
        console.error('Error fetching image data:', error);
      }
    };
  
    fetchPictures();
  }, [screenData, isImageInDateRange]);

  const startTransition = useCallback(() => {
    setTransitioning(true);
    setOpacity(0);
    
    const validPictures = getValidPictures();
    const nextIndex = (currentIndex + 1) % validPictures.length;
    const nextColor = validPictures[nextIndex].backgroundColor || '';
    
    setTimeout(() => {
      setCurrentIndex(nextIndex);
      document.body.style.backgroundColor = nextColor;
      
      setTimeout(() => {
        setOpacity(1);
        setTransitioning(false);
      }, 50);
    }, 1000);
  }, [currentIndex, getValidPictures]);

  useEffect(() => {
    if (pictures.length > 0) {
      const validPictures = getValidPictures();
      if (validPictures.length > 0) {
        const imageDelay = parseInt(validPictures[currentIndex]?.delay || '5') * 1000;
        
        const timer = setTimeout(() => {
          if (!transitioning) {
            startTransition();
          }
        }, imageDelay - 1000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [pictures, currentIndex, transitioning, getValidPictures, startTransition]);

  const validPictures = getValidPictures();

  if (!isClient || !screenData) {
    return null;
  }

  if (validPictures.length === 0) {
    return null;
  }

  return (
    <div style={{
      display: 'flex',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      padding: 0,
      margin: 0,
      justifyContent: 'center',
      alignItems: 'center',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden'
    }}>
      <div style={{ 
        position: 'absolute',
        width: '100%', 
        height: '100%', 
        opacity: opacity,
        transition: 'opacity 1s ease-in-out'
      }}>
        <Image
          src={`http://localhost:9999${validPictures[currentIndex].imagePath}`}
          alt="Uploaded"
          layout="fill"
          objectFit="contain"
          priority
        />
      </div>
    </div>
  );
};

export default ScreenPage;
