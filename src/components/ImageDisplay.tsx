import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface ImageDisplayProps {
  src?: string;
  alt?: string;
  className?: string;
}

export function ImageDisplay({ src, alt, className }: ImageDisplayProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const loadImage = async () => {
      if (!src) {
        if (isMounted) {
          setDataUrl(null);
          setLoading(false);
        }
        return;
      }

      if (src.startsWith('data:') || src.startsWith('http')) {
        if (isMounted) {
          setDataUrl(src);
          setLoading(false);
        }
        return;
      }

      // It's a Firestore document ID
      try {
        const docSnap = await getDoc(doc(db, 'images', src));
        if (docSnap.exists() && isMounted) {
          setDataUrl(docSnap.data().dataUrl);
        }
      } catch (error) {
        console.error("Error fetching image:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      isMounted = false;
    };
  }, [src]);

  if (!src) return null;

  if (loading) {
    return <div className={`bg-slate-200 animate-pulse ${className}`}></div>;
  }

  if (!dataUrl) {
    return <div className={`bg-slate-100 flex items-center justify-center text-slate-400 ${className}`}>No Image</div>;
  }

  return <img src={dataUrl} alt={alt} className={className} />;
}
