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

  const [imgLoadError, setImgLoadError] = useState(false);

  if (!src || imgLoadError) {
    return (
      <div 
        className={`bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 flex flex-col items-center justify-center p-3 text-center ${className || ''}`}
        aria-label={alt || 'Dish image placeholder'}
      >
        <svg className="w-6 h-6 opacity-40 mb-1 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
          <path d="M7 2v20" />
          <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
        </svg>
        <span className="text-[11px] font-medium tracking-tight text-slate-500/80 truncate max-w-full px-2">
          {alt || 'Artisan Dish'}
        </span>
      </div>
    );
  }

  if (loading) {
    return <div className={`bg-slate-200/80 animate-pulse ${className || ''}`}></div>;
  }

  if (!dataUrl) {
    if (isQuotaExceededGlobal) {
      return (
        <div className={`bg-amber-50/90 border border-amber-200/60 flex flex-col items-center justify-center text-amber-700 text-[10px] font-medium text-center p-2 ${className || ''}`}>
          <span className="font-semibold text-xs mb-0.5">Asset Saved</span>
          <span>Temporarily cached</span>
        </div>
      );
    }
    return (
      <div 
        className={`bg-gradient-to-br from-slate-100 to-slate-200/80 text-slate-400 flex flex-col items-center justify-center p-3 text-center ${className || ''}`}
        aria-label={alt || 'Dish image'}
      >
        <svg className="w-6 h-6 opacity-40 mb-1 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
          <path d="M7 2v20" />
          <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
        </svg>
        <span className="text-[11px] font-medium tracking-tight text-slate-500/80 truncate max-w-full px-2">
          {alt || 'Artisan Dish'}
        </span>
      </div>
    );
  }

  return (
    <img 
      src={dataUrl} 
      alt={alt || 'Menu dish photo'} 
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setImgLoadError(true)}
      className={className} 
    />
  );
}

