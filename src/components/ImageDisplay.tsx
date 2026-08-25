import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db, isQuotaError } from '../firebase';

interface ImageDisplayProps {
  src?: string;
  alt?: string;
  className?: string;
}

// Global in-memory cache for fetched image data URLs
const imageCache = new Map<string, string | null>();
let isQuotaExceededGlobal = false;

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

      // If direct data URL, http URL, or local asset
      if (src.startsWith('data:') || src.startsWith('http') || src.startsWith('/')) {
        if (isMounted) {
          setDataUrl(src);
          setLoading(false);
        }
        return;
      }

      // Check in-memory cache first
      if (imageCache.has(src)) {
        if (isMounted) {
          setDataUrl(imageCache.get(src) || null);
          setLoading(false);
        }
        return;
      }

      // Check localStorage cache
      try {
        const cached = localStorage.getItem(`img_cache_${src}`);
        if (cached) {
          imageCache.set(src, cached);
          if (isMounted) {
            setDataUrl(cached);
            setLoading(false);
          }
          return;
        }
      } catch (_) {}

      // If global quota is already exceeded, don't attempt Firestore fetch
      if (isQuotaExceededGlobal) {
        if (isMounted) {
          setDataUrl(null);
          setLoading(false);
        }
        return;
      }

      // Fetch from Firestore document
      try {
        const docSnap = await getDoc(doc(db, 'images', src));
        if (docSnap.exists() && isMounted) {
          const url = docSnap.data().dataUrl;
          if (url) {
            imageCache.set(src, url);
            try {
              localStorage.setItem(`img_cache_${src}`, url);
            } catch (_) {}
            setDataUrl(url);
          } else {
            imageCache.set(src, null);
            setDataUrl(null);
          }
        } else {
          imageCache.set(src, null);
          if (isMounted) setDataUrl(null);
        }
      } catch (error: any) {
        if (isQuotaError(error)) {
          isQuotaExceededGlobal = true;
          console.warn("Firestore image fetch notice: Free daily read quota reached for today.");
        } else {
          console.warn("Image fetch notice:", error?.message || error);
        }
        imageCache.set(src, null);
        if (isMounted) setDataUrl(null);
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
    if (isQuotaExceededGlobal) {
      return (
        <div className={`bg-amber-50 border border-amber-200 flex flex-col items-center justify-center text-amber-600 text-[10px] font-medium text-center p-2 ${className}`}>
          <span className="font-bold text-xs mb-1">Limit Reached</span>
          Image safely saved, but hidden until tomorrow
        </div>
      );
    }
    return <div className={`bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-medium ${className}`}>No Image</div>;
  }

  return <img src={dataUrl} alt={alt || ''} className={className} />;
}

