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

export function getFoodFallbackUrl(dishName?: string): string {
  if (!dishName) return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80";
  const name = dishName.toLowerCase();

  if (name.includes('cheese') && name.includes('burger')) {
    return "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80";
  }
  if (name.includes('egg') || name.includes('oeuf')) {
    return "https://images.unsplash.com/photo-1525164286253-04e68b9d94c3?auto=format&fit=crop&w=800&q=80";
  }
  if (name.includes('king') || name.includes('double') || name.includes('maxi') || name.includes('qualité') || name.includes('qualite')) {
    return "https://images.unsplash.com/photo-1553979459-d2229ba7433b?auto=format&fit=crop&w=800&q=80";
  }
  if (name.includes('burger')) {
    return "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80";
  }
  if (name.includes('chawarma') || name.includes('shawarma')) {
    return "https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=800&q=80";
  }
  if (name.includes('taco') || name.includes('wrap') || name.includes('panini') || name.includes('sandwich')) {
    return "https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=800&q=80";
  }
  if (name.includes('pizza')) {
    return "https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?auto=format&fit=crop&w=800&q=80";
  }
  if (name.includes('juice') || name.includes('jus') || name.includes('shake') || name.includes('smoothie')) {
    return "https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=800&q=80";
  }
  if (name.includes('drink') || name.includes('coca') || name.includes('boisson') || name.includes('soda') || name.includes('water') || name.includes('eau')) {
    return "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800&q=80";
  }
  if (name.includes('chicken') || name.includes('poulet') || name.includes('grill') || name.includes('nugget')) {
    return "https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=800&q=80";
  }
  if (name.includes('fries') || name.includes('frite')) {
    return "https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=800&q=80";
  }
  if (name.includes('pasta') || name.includes('spaghetti') || name.includes('italien')) {
    return "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=800&q=80";
  }
  if (name.includes('salad') || name.includes('salade')) {
    return "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80";
  }
  if (name.includes('dessert') || name.includes('cake') || name.includes('glace') || name.includes('tiramisu')) {
    return "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80";
  }

  // Consistent fallback per dish name
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  const fallbacks = [
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=800&q=80"
  ];
  return fallbacks[hash % fallbacks.length];
}

export function ImageDisplay({ src, alt, className }: ImageDisplayProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const loadImage = async () => {
      if (!src) {
        if (isMounted) {
          setDataUrl(getFoodFallbackUrl(alt));
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
          const cachedUrl = imageCache.get(src);
          setDataUrl(cachedUrl || getFoodFallbackUrl(alt));
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
          setDataUrl(getFoodFallbackUrl(alt));
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
            setDataUrl(getFoodFallbackUrl(alt));
          }
        } else {
          imageCache.set(src, null);
          if (isMounted) setDataUrl(getFoodFallbackUrl(alt));
        }
      } catch (error: any) {
        if (isQuotaError(error)) {
          isQuotaExceededGlobal = true;
          console.warn("Firestore image fetch notice: Free daily read quota reached for today.");
        } else {
          console.warn("Image fetch notice:", error?.message || error);
        }
        imageCache.set(src, null);
        if (isMounted) setDataUrl(getFoodFallbackUrl(alt));
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
  }, [src, alt]);

  const fallbackUrl = getFoodFallbackUrl(alt);

  if (loading) {
    return <div className={`bg-slate-200 animate-pulse ${className}`}></div>;
  }

  return (
    <img 
      src={dataUrl || fallbackUrl} 
      alt={alt || ''} 
      className={className} 
      onError={(e) => {
        // If image fails to load, replace with smart food fallback
        (e.target as HTMLImageElement).src = fallbackUrl;
      }}
    />
  );
}

