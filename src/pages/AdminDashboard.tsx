import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType, sanitizeForFirestore } from '../firebase';
import { collection, query, where, getDocs, addDoc, doc, getDoc, setDoc, deleteDoc, orderBy, serverTimestamp } from 'firebase/firestore';
import { ImageDisplay } from '../components/ImageDisplay';
import { digitizeMenuImage, semanticMatchMenuWithLibrary, generateFoodMetadata, searchWebFoodImage, searchWebPhotosForEntireMenu, LibraryPhotoEntry, MenuItemToMatch } from '../services/geminiService';
import { QRCodeSVG } from 'qrcode.react';
import { Plus, Upload, QrCode, LogOut, Loader2, Edit2, X, Utensils, Image as ImageIcon, ChevronRight, Store, ExternalLink, Trash2, Search, Users, Mail, Phone, Menu as MenuIcon, Sparkles, Tag, Check, RefreshCw, AlertCircle, Wand2, Filter } from 'lucide-react';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<any | null>(null);
  const [menu, setMenu] = useState<any | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [newRestaurantName, setNewRestaurantName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<{catIdx: number, itemIdx: number, data: any} | null>(null);
  const [editingRestaurant, setEditingRestaurant] = useState<any | null>(null);
  const [autoFilledCount, setAutoFilledCount] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'restaurants' | 'leads' | 'library'>('restaurants');

  // AI Automation States
  const [automationStep, setAutomationStep] = useState<string | null>(null);
  const [automationSummary, setAutomationSummary] = useState<{
    totalItems: number;
    matchedItems: number;
    neededPhotos: number;
    categoriesExtracted: number;
  } | null>(null);
  const [libraryPickerTarget, setLibraryPickerTarget] = useState<{ catIdx: number; itemIdx: number; itemName: string } | null>(null);
  const [libraryPickerSearch, setLibraryPickerSearch] = useState('');

  // Master Cloud Image Library States
  const [syncingLibrary, setSyncingLibrary] = useState(false);
  const [libraryItems, setLibraryItems] = useState<any[]>([]);
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');
  const [newLibraryItemName, setNewLibraryItemName] = useState('');
  const [newLibraryItemImage, setNewLibraryItemImage] = useState<string | null>(null);
  const [addingToLibrary, setAddingToLibrary] = useState(false);
  const [syncingMenuImages, setSyncingMenuImages] = useState(false);

  const handleItemImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/webp', 0.8);
        
        try {
          setLoading(true);
          const imageRef = await addDoc(collection(db, 'images'), {
            dataUrl,
            createdAt: serverTimestamp()
          });
          setEditingItem(prev => prev ? { ...prev, data: { ...prev.data, imageUrl: imageRef.id } } : null);
        } catch (error) {
          console.error("Error uploading image:", error);
          alert("Failed to upload image.");
        } finally {
          setLoading(false);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const getLevenshteinDistance = (a: string, b: string): number => {
    const tmp: number[][] = [];
    for (let i = 0; i <= a.length; i++) {
      tmp[i] = [i];
    }
    for (let j = 0; j <= b.length; j++) {
      tmp[0][j] = j;
    }
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        tmp[i][j] = a[i - 1] === b[j - 1]
          ? tmp[i - 1][j - 1]
          : Math.min(tmp[i - 1][j] + 1, tmp[i][j - 1] + 1, tmp[i - 1][j - 1] + 1);
      }
    }
    return tmp[a.length][b.length];
  };

  const findBestMatch = (targetName: string, library: { name: string, imageUrl: string }[]): string | null => {
    const t = targetName.toLowerCase().trim();
    if (!t) return null;

    // 1. Try exact match first (case-insensitive, trimmed)
    const exactMatch = library.find(item => item.name.toLowerCase().trim() === t);
    if (exactMatch) return exactMatch.imageUrl;

    // 2. Try close matches
    let bestImg: string | null = null;
    let minDistance = Infinity;

    for (const libItem of library) {
      const libName = libItem.name.toLowerCase().trim();
      if (!libName) continue;

      // Direct substring check (e.g. "Cheeseburger" vs "Burger" or plural)
      if (libName.includes(t) || t.includes(libName)) {
        const lengthDiff = Math.abs(libName.length - t.length);
        if (lengthDiff <= 3) {
          return libItem.imageUrl;
        }
      }

      const dist = getLevenshteinDistance(t, libName);
      const maxLen = Math.max(t.length, libName.length);
      
      let allowedDist = 0;
      if (maxLen > 12) allowedDist = 3;
      else if (maxLen >= 8) allowedDist = 2;
      else if (maxLen >= 5) allowedDist = 1;

      if (dist <= allowedDist && dist < minDistance) {
        minDistance = dist;
        bestImg = libItem.imageUrl;
      }
    }

    return bestImg;
  };

  const autoFillItemImages = async (categories: any[]): Promise<{ updatedCategories: any[], count: number }> => {
    try {
      const fullLibrary: LibraryPhotoEntry[] = [];
      const libraryList: { name: string, imageUrl: string }[] = [];
      const categoryLibraryList: { name: string, imageUrl: string }[] = [];

      // 1. Fetch from Master Shared Library first (Items)
      try {
        const librarySnapshot = await getDocs(collection(db, 'item_library'));
        librarySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data && data.name && data.imageUrl) {
            fullLibrary.push({
              id: doc.id,
              name: data.name,
              imageUrl: data.imageUrl,
              category: data.category || '',
              tags: Array.isArray(data.tags) ? data.tags : [],
              restaurant: data.restaurant || ''
            });
            libraryList.push({ name: data.name, imageUrl: data.imageUrl });
          }
        });
      } catch (err) {
        console.warn("Could not read item_library collection (quota limit or offline):", err);
      }

      // 2. Fetch Category Library
      try {
        const catLibrarySnapshot = await getDocs(collection(db, 'category_library'));
        catLibrarySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data && data.name && data.imageUrl) {
            categoryLibraryList.push({ name: data.name, imageUrl: data.imageUrl });
          }
        });
      } catch (err) {
        console.warn("Could not read category_library collection (quota limit or offline):", err);
      }

      // 3. Fetch from existing menus as a fallback
      try {
        const q = query(collection(db, 'menus'));
        const menusSnapshot = await getDocs(q);
        menusSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data && Array.isArray(data.categories)) {
            data.categories.forEach((category: any) => {
              if (category && category.name && category.imageUrl) {
                const exists = categoryLibraryList.some(libCat => libCat.name.toLowerCase().trim() === category.name.toLowerCase().trim());
                if (!exists) {
                  categoryLibraryList.push({ name: category.name, imageUrl: category.imageUrl });
                }
              }

              if (Array.isArray(category.items)) {
                category.items.forEach((item: any) => {
                  if (item && item.name && item.imageUrl) {
                    const existsInFull = fullLibrary.some(f => f.name.toLowerCase().trim() === item.name.toLowerCase().trim());
                    if (!existsInFull) {
                      const normId = item.name.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
                      fullLibrary.push({
                        id: normId || `menu_item_${Math.random()}`,
                        name: item.name,
                        imageUrl: item.imageUrl,
                        category: category.name || '',
                        tags: [category.name || '', item.name].filter(Boolean)
                      });
                    }
                    const exists = libraryList.some(libItem => libItem.name.toLowerCase().trim() === item.name.toLowerCase().trim());
                    if (!exists) {
                      libraryList.push({ name: item.name, imageUrl: item.imageUrl });
                    }
                  }
                });
              }
            });
          }
        });
      } catch (err) {
        console.warn("Could not read menus collection for fallback (quota limit or offline):", err);
      }

      // Collect items missing images for AI Semantic Matching
      const itemsToMatch: MenuItemToMatch[] = [];
      categories.forEach((cat: any) => {
        (cat.items || []).forEach((item: any) => {
          if (!item.imageUrl && item.name) {
            itemsToMatch.push({
              name: item.name,
              description: item.description || '',
              categoryName: cat.name || ''
            });
          }
        });
      });

      // AI Semantic Matching via Gemini
      const aiMatchMap = new Map<string, { imageUrl: string; confidence: number; matchReason?: string }>();
      if (itemsToMatch.length > 0 && fullLibrary.length > 0) {
        try {
          const aiResults = await semanticMatchMenuWithLibrary(itemsToMatch, fullLibrary);
          aiResults.forEach(res => {
            if (res.matchedImageUrl) {
              aiMatchMap.set(res.itemName.toLowerCase().trim(), {
                imageUrl: res.matchedImageUrl,
                confidence: res.confidence,
                matchReason: res.matchReason
              });
            }
          });
        } catch (err) {
          console.warn("AI Semantic match warning, falling back to local fuzzy match:", err);
        }
      }

      let matchCount = 0;
      const updatedCategories = categories.map((category: any) => {
        let updatedCategoryImg = category.imageUrl;
        if (!updatedCategoryImg && category.name) {
          const matchedCatImg = findBestMatch(category.name, categoryLibraryList);
          if (matchedCatImg) {
            updatedCategoryImg = matchedCatImg;
            matchCount++;
          }
        }

        const updatedItems = (category.items || []).map((item: any) => {
          if (!item.imageUrl && item.name) {
            const key = item.name.toLowerCase().trim();
            const aiMatch = aiMatchMap.get(key);
            
            if (aiMatch) {
              matchCount++;
              return {
                ...item,
                imageUrl: aiMatch.imageUrl || null,
                isAiMatched: true,
                matchConfidence: aiMatch.confidence ?? 0,
                matchReason: aiMatch.matchReason || ''
              };
            }

            // Fallback to fuzzy search
            const matchedImage = findBestMatch(item.name, libraryList);
            if (matchedImage) {
              matchCount++;
              return {
                ...item,
                imageUrl: matchedImage || null,
                isAiMatched: false
              };
            }
          }
          return {
            ...item,
            imageUrl: item.imageUrl || null
          };
        });

        return {
          ...category,
          imageUrl: updatedCategoryImg || null,
          items: updatedItems
        };
      });

      return { updatedCategories, count: matchCount };
    } catch (error) {
      console.error("Error auto-filling item and category images from cloud:", error);
      return { updatedCategories: categories, count: 0 };
    }
  };

  const syncItemToLibrary = async (
    name: string, 
    imageUrl: string, 
    categoryName?: string, 
    restaurantName?: string,
    existingTags?: string[]
  ) => {
    if (!name || !imageUrl) return;
    const normalizedId = name.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
    if (!normalizedId) return;
    try {
      let tags = existingTags && existingTags.length > 0 ? existingTags : [];
      if (tags.length === 0) {
        tags = await generateFoodMetadata(name, categoryName);
      }
      await setDoc(doc(db, 'item_library', normalizedId), sanitizeForFirestore({
        name: name.trim(),
        imageUrl: imageUrl,
        category: categoryName || '',
        restaurant: restaurantName || selectedRestaurant?.name || '',
        tags: tags,
        updatedAt: new Date().toISOString()
      }), { merge: true });
    } catch (error) {
      console.warn("Error syncing item to library:", error);
    }
  };

  const syncCategoryToLibrary = async (name: string, imageUrl: string) => {
    if (!name || !imageUrl) return;
    const normalizedId = name.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
    if (!normalizedId) return;
    try {
      await setDoc(doc(db, 'category_library', normalizedId), {
        name: name.trim(),
        imageUrl: imageUrl,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error syncing category to library:", error);
    }
  };

  const loadLibraryItems = async () => {
    try {
      const itemsMap = new Map<string, any>();

      // Read item_library
      try {
        const snapshot = await getDocs(collection(db, 'item_library'));
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data && data.name && data.imageUrl) {
            itemsMap.set(docSnap.id, { id: docSnap.id, ...data });
          }
        });
      } catch (err) {
        console.warn("Notice loading item_library (quota or offline):", err);
      }

      // Read menus
      try {
        const menusSnapshot = await getDocs(collection(db, 'menus'));
        for (const menuDoc of menusSnapshot.docs) {
          const menuData = menuDoc.data();
          if (menuData && Array.isArray(menuData.categories)) {
            for (const category of menuData.categories) {
              if (Array.isArray(category.items)) {
                for (const item of category.items) {
                  if (item && item.name && item.imageUrl) {
                    const normalizedId = item.name.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
                    if (normalizedId && !itemsMap.has(normalizedId)) {
                      const newItem = {
                        id: normalizedId,
                        name: item.name.trim(),
                        imageUrl: item.imageUrl,
                        category: category.name || '',
                        tags: [category.name || '', item.name].filter(Boolean),
                        updatedAt: new Date().toISOString()
                      };
                      itemsMap.set(normalizedId, newItem);

                      setDoc(doc(db, 'item_library', normalizedId), sanitizeForFirestore(newItem), { merge: true })
                        .catch(err => console.warn("Background item_library sync note:", err));
                    }
                  }
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn("Notice scanning menus for library photos (quota or offline):", err);
      }

      const itemsList = Array.from(itemsMap.values());
      if (itemsList.length > 0) {
        try {
          localStorage.setItem('cached_library_items', JSON.stringify(itemsList));
        } catch (_) {}
        setLibraryItems(itemsList);
      } else {
        try {
          const cached = localStorage.getItem('cached_library_items');
          if (cached) {
            setLibraryItems(JSON.parse(cached));
          }
        } catch (_) {}
      }
    } catch (error) {
      console.warn("Error in loadLibraryItems:", error);
    }
  };

  const autoSyncExistingMenusToLibrary = async () => {
    try {
      const categoryLibSnapshot = await getDocs(collection(db, 'category_library'));
      const existingCatsInLib = new Set<string>();
      categoryLibSnapshot.forEach((docSnap) => {
        existingCatsInLib.add(docSnap.id);
      });

      const librarySnapshot = await getDocs(collection(db, 'item_library'));
      const existingInLibrary = new Set<string>();
      librarySnapshot.forEach((docSnap) => {
        existingInLibrary.add(docSnap.id);
      });

      const menusSnapshot = await getDocs(collection(db, 'menus'));
      let itemSyncCount = 0;
      let catSyncCount = 0;
      
      for (const menuDoc of menusSnapshot.docs) {
        const menuData = menuDoc.data();
        if (menuData && Array.isArray(menuData.categories)) {
          for (const category of menuData.categories) {
            if (category && category.name && category.imageUrl) {
              const normalizedCatId = category.name.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
              if (normalizedCatId && !existingCatsInLib.has(normalizedCatId)) {
                try {
                  await setDoc(doc(db, 'category_library', normalizedCatId), sanitizeForFirestore({
                    name: category.name.trim(),
                    imageUrl: category.imageUrl,
                    updatedAt: new Date().toISOString()
                  }), { merge: true });
                  existingCatsInLib.add(normalizedCatId);
                  catSyncCount++;
                } catch (writeErr) {
                  console.warn(`Could not auto-sync category ${category.name}:`, writeErr);
                }
              }
            }

            if (Array.isArray(category.items)) {
              for (const item of category.items) {
                if (item && item.name && item.imageUrl) {
                  const normalizedId = item.name.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
                  if (normalizedId && !existingInLibrary.has(normalizedId)) {
                    try {
                      await setDoc(doc(db, 'item_library', normalizedId), sanitizeForFirestore({
                        name: item.name.trim(),
                        imageUrl: item.imageUrl,
                        category: category.name || '',
                        tags: [category.name || '', item.name].filter(Boolean),
                        updatedAt: new Date().toISOString()
                      }), { merge: true });
                      existingInLibrary.add(normalizedId);
                      itemSyncCount++;
                    } catch (writeErr) {
                      console.warn(`Could not auto-sync item ${item.name}:`, writeErr);
                    }
                  }
                }
              }
            }
          }
        }
      }
      
      if (itemSyncCount > 0 || catSyncCount > 0) {
        console.log(`Auto-synced ${catSyncCount} categories and ${itemSyncCount} food item images to libraries.`);
        await loadLibraryItems();
      }
    } catch (error) {
      console.warn("Error auto-syncing existing menus to library:", error);
    }
  };

  const handleSyncAllImages = async () => {
    try {
      setSyncingLibrary(true);
      const menusSnapshot = await getDocs(collection(db, 'menus'));
      let itemSyncCount = 0;
      let catSyncCount = 0;
      
      for (const menuDoc of menusSnapshot.docs) {
        const menuData = menuDoc.data();
        if (menuData && Array.isArray(menuData.categories)) {
          for (const category of menuData.categories) {
            if (category && category.name && category.imageUrl) {
              const normalizedCatId = category.name.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
              if (normalizedCatId) {
                await setDoc(doc(db, 'category_library', normalizedCatId), sanitizeForFirestore({
                  name: category.name.trim(),
                  imageUrl: category.imageUrl,
                  updatedAt: new Date().toISOString()
                }), { merge: true });
                catSyncCount++;
              }
            }

            if (Array.isArray(category.items)) {
              for (const item of category.items) {
                if (item && item.name && item.imageUrl) {
                  const normalizedId = item.name.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
                  if (normalizedId) {
                    await setDoc(doc(db, 'item_library', normalizedId), sanitizeForFirestore({
                      name: item.name.trim(),
                      imageUrl: item.imageUrl,
                      category: category.name || '',
                      tags: [category.name || '', item.name].filter(Boolean),
                      updatedAt: new Date().toISOString()
                    }), { merge: true });
                    itemSyncCount++;
                  }
                }
              }
            }
          }
        }
      }
      
      await loadLibraryItems();
      alert(`Successfully scanned all previous menus and imported ${itemSyncCount} food photos into your Cloud Photo Library!`);
    } catch (error) {
      console.error("Error syncing menus to library:", error);
      alert("Failed to scan and sync menu images.");
    } finally {
      setSyncingLibrary(false);
    }
  };

  const handleDeleteLibraryItem = async (itemId: string) => {
    if (!window.confirm("Are you sure you want to delete this item from your shared library?")) return;
    try {
      await deleteDoc(doc(db, 'item_library', itemId));
      setLibraryItems(prev => prev.filter(item => item.id !== itemId));
    } catch (error) {
      console.error("Error deleting library item:", error);
      alert("Failed to delete item from library.");
    }
  };

  const handleLibraryImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/webp', 0.8);
        
        try {
          setLoading(true);
          const imageRef = await addDoc(collection(db, 'images'), {
            dataUrl,
            createdAt: serverTimestamp()
          });
          setNewLibraryItemImage(imageRef.id);
        } catch (error) {
          console.error("Error uploading image to library:", error);
          alert("Failed to upload image.");
        } finally {
          setLoading(false);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleAddLibraryItemDirectly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLibraryItemName.trim() || !newLibraryItemImage) return;
    try {
      setAddingToLibrary(true);
      const normalizedId = newLibraryItemName.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
      if (!normalizedId) return;
      await setDoc(doc(db, 'item_library', normalizedId), {
        name: newLibraryItemName.trim(),
        imageUrl: newLibraryItemImage,
        updatedAt: new Date().toISOString()
      });
      setNewLibraryItemName('');
      setNewLibraryItemImage(null);
      await loadLibraryItems();
    } catch (error) {
      console.error("Error adding item to library directly:", error);
      alert("Failed to add item to library.");
    } finally {
      setAddingToLibrary(false);
    }
  };

  const handleManualAutoFillMenu = async () => {
    if (!menu || !selectedRestaurant) return;
    try {
      setSyncingMenuImages(true);
      const { updatedCategories, count } = await autoFillItemImages(menu.categories || []);
      
      // Save all photos present in updatedCategories to Shared Cloud Library for future menus
      for (const cat of updatedCategories) {
        if (cat.name && cat.imageUrl) {
          await syncCategoryToLibrary(cat.name, cat.imageUrl);
        }
        if (Array.isArray(cat.items)) {
          for (const item of cat.items) {
            if (item.name && item.imageUrl) {
              await syncItemToLibrary(item.name, item.imageUrl, cat.name, selectedRestaurant.name);
            }
          }
        }
      }

      const newMenu = sanitizeForFirestore({
        ...menu,
        categories: updatedCategories,
        updatedAt: new Date().toISOString()
      });
      await setDoc(doc(db, 'menus', selectedRestaurant.id), newMenu);
      setMenu(newMenu);
      await loadLibraryItems();

      if (count > 0) {
        alert(`Awesome! Successfully matched and applied ${count} images from your Shared Cloud Library to this menu!`);
      } else {
        alert("Menu synced with your Shared Cloud Photo Library! Any new dish photos are now saved for future menus.");
      }
    } catch (error) {
      console.error("Error manually auto-filling menu images:", error);
      alert("Failed to auto-fill menu images.");
    } finally {
      setSyncingMenuImages(false);
    }
  };

  const handleSaveItem = async () => {
    if (!editingItem || !menu || !selectedRestaurant) return;
    
    let itemData = { ...editingItem.data };
    if (!itemData.imageUrl && itemData.name) {
      const { updatedCategories, count } = await autoFillItemImages([ { items: [itemData] } ]);
      if (count > 0) {
        itemData = updatedCategories[0].items[0];
        setAutoFilledCount(1);
        setTimeout(() => setAutoFilledCount(null), 4000);
      }
    }

    if (itemData.name && itemData.imageUrl) {
      await syncItemToLibrary(itemData.name, itemData.imageUrl);
    }

    const newMenu = { ...menu };
    newMenu.categories[editingItem.catIdx].items[editingItem.itemIdx] = itemData;
    
    try {
      const sanitizedMenu = sanitizeForFirestore(newMenu);
      await setDoc(doc(db, 'menus', selectedRestaurant.id), sanitizedMenu);
      setMenu(sanitizedMenu);
      setEditingItem(null);
    } catch (error) {
      console.error("Error updating menu", error);
      alert("Failed to update item.");
    }
  };

  const handleCategoryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, catIdx: number) => {
    const file = e.target.files?.[0];
    if (!file || !menu || !selectedRestaurant) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/webp', 0.8);
        
        try {
          setLoading(true);
          const imageRef = await addDoc(collection(db, 'images'), {
            dataUrl,
            createdAt: serverTimestamp()
          });
          
          const newMenu = { ...menu };
          newMenu.categories[catIdx].imageUrl = imageRef.id;

          const catName = newMenu.categories[catIdx].name;
          if (catName) {
            await syncCategoryToLibrary(catName, imageRef.id);
          }

          const sanitizedMenu = sanitizeForFirestore(newMenu);
          await setDoc(doc(db, 'menus', selectedRestaurant.id), sanitizedMenu);
          setMenu(sanitizedMenu);
        } catch (error) {
          console.error("Error updating category image", error);
          alert("Failed to update category image.");
        } finally {
          setLoading(false);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveCategoryImage = async (catIdx: number) => {
    if (!menu || !selectedRestaurant) return;
    if (!window.confirm("Are you sure you want to remove this category image?")) return;

    const newMenu = { ...menu };
    delete newMenu.categories[catIdx].imageUrl;
    
    try {
      const sanitizedMenu = sanitizeForFirestore(newMenu);
      await setDoc(doc(db, 'menus', selectedRestaurant.id), sanitizedMenu);
      setMenu(sanitizedMenu);
    } catch (error) {
      console.error("Error removing category image", error);
      alert("Failed to remove category image.");
    }
  };

  const handleDeleteItem = async (catIdx: number, itemIdx: number) => {
    if (!menu || !selectedRestaurant) return;
    if (!window.confirm("Are you sure you want to delete this item?")) return;

    const newMenu = { ...menu };
    newMenu.categories[catIdx].items.splice(itemIdx, 1);
    
    try {
      const sanitizedMenu = sanitizeForFirestore(newMenu);
      await setDoc(doc(db, 'menus', selectedRestaurant.id), sanitizedMenu);
      setMenu(sanitizedMenu);
    } catch (error) {
      console.error("Error deleting item", error);
      alert("Failed to delete item.");
    }
  };

  const handleSaveRestaurant = async () => {
    if (!editingRestaurant) return;
    try {
      setLoading(true);
      await setDoc(doc(db, 'restaurants', editingRestaurant.id), editingRestaurant, { merge: true });
      setSelectedRestaurant(editingRestaurant);
      setRestaurants(restaurants.map(r => r.id === editingRestaurant.id ? editingRestaurant : r));
      setEditingRestaurant(null);
    } catch (error) {
      console.error("Error updating restaurant", error);
      alert("Failed to update restaurant details.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRestaurant = async () => {
    if (!selectedRestaurant) return;
    if (!window.confirm(`Are you sure you want to delete "${selectedRestaurant.name}" and its entire menu? This action cannot be undone.`)) return;
    
    try {
      setLoading(true);
      await deleteDoc(doc(db, 'restaurants', selectedRestaurant.id));
      await deleteDoc(doc(db, 'menus', selectedRestaurant.id));
      
      setSelectedRestaurant(null);
      setMenu(null);
      await fetchRestaurants();
    } catch (error) {
      console.error("Error deleting restaurant", error);
      alert("Failed to delete restaurant.");
    } finally {
      setLoading(false);
    }
  };

  const [firestoreNotice, setFirestoreNotice] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (user && user.email) {
        const allowedAdminEmails = ['ahmedbahloul230@gmail.com', 'ali@onemenu.app'];
        if (!allowedAdminEmails.includes(user.email.toLowerCase())) {
          return;
        }
        try {
          await fetchRestaurants();
        } catch (error: any) {
          console.warn("Notice loading restaurants:", error);
          setFirestoreNotice("Firestore database read quota reached for today. Showing cached data.");
        }
        try {
          await fetchLeads();
        } catch (error: any) {
          console.warn("Notice loading leads:", error);
        }
        try {
          await loadLibraryItems();
          await autoSyncExistingMenusToLibrary();
        } catch (error: any) {
          console.warn("Error fetching library items on load:", error);
        }
      }
    };
    loadData();
  }, [user]);

  useEffect(() => {
    let interval: any;
    if (uploading) {
      setUploadProgress(0);
      interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 95) return 95;
          const increment = Math.max(0.5, (95 - prev) * 0.05);
          return prev + increment;
        });
      }, 500);
    } else {
      setUploadProgress(100);
      const timeout = setTimeout(() => setUploadProgress(0), 1000);
      return () => clearTimeout(timeout);
    }
    return () => clearInterval(interval);
  }, [uploading]);

  const fetchLeads = async () => {
    try {
      const q = query(collection(db, 'leads'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const fetchedLeads = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLeads(fetchedLeads);
      try { localStorage.setItem('cached_leads', JSON.stringify(fetchedLeads)); } catch (_) {}
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'leads');
      try {
        const cached = localStorage.getItem('cached_leads');
        if (cached) setLeads(JSON.parse(cached));
      } catch (_) {}
    }
  };

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'restaurants'));
      const querySnapshot = await getDocs(q);
      const rests = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRestaurants(rests);
      try { localStorage.setItem('cached_restaurants', JSON.stringify(rests)); } catch (_) {}
      if (rests.length > 0 && !selectedRestaurant) {
        await handleSelectRestaurant(rests[0]);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'restaurants');
      setFirestoreNotice("Firestore database read quota reached for today. Displaying cached dashboard data.");
      try {
        const cached = localStorage.getItem('cached_restaurants');
        if (cached) {
          const rests = JSON.parse(cached);
          setRestaurants(rests);
          if (rests.length > 0 && !selectedRestaurant) {
            await handleSelectRestaurant(rests[0]);
          }
        }
      } catch (_) {}
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRestaurantName.trim()) return;
    
    const baseSlug = newRestaurantName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const slug = `${baseSlug}-${randomSuffix}`;

    try {
      setLoading(true);
      const docRef = await addDoc(collection(db, 'restaurants'), {
        name: newRestaurantName,
        slug: slug,
        ownerId: user?.uid,
        createdAt: new Date().toISOString()
      });
      setNewRestaurantName('');
      await fetchRestaurants();
      await handleSelectRestaurant({ id: docRef.id, name: newRestaurantName, slug: slug, ownerId: user?.uid });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'restaurants');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRestaurant = async (restaurant: any) => {
    setSelectedRestaurant(restaurant);
    setSearchQuery('');
    try {
      setLoading(true);
      const menuDoc = await getDoc(doc(db, 'menus', restaurant.id));
      if (menuDoc.exists()) {
        const menuData = { id: menuDoc.id, ...menuDoc.data() };
        setMenu(menuData);
        try { localStorage.setItem(`cached_menu_${restaurant.id}`, JSON.stringify(menuData)); } catch (_) {}
      } else {
        setMenu(null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `menus/${restaurant.id}`);
      try {
        const cached = localStorage.getItem(`cached_menu_${restaurant.id}`);
        if (cached) {
          setMenu(JSON.parse(cached));
        }
      } catch (_) {}
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedRestaurant) return;

    try {
      setUploading(true);
      setAutomationSummary(null);
      setAutomationStep("📄 Step 1/3: Reading menu image & extracting items with Gemini AI...");
      
      const imagePromises = Array.from(files).map((file: File) => {
        return new Promise<{base64Image: string, mimeType: string}>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve({
              base64Image: reader.result as string,
              mimeType: file.type
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      const images = await Promise.all(imagePromises);
      
      // Step 1: Call Gemini Vision to digitize menu items, categories, descriptions, prices
      const digitizedMenu = await digitizeMenuImage(images);
      
      // Step 2: AI Semantic Photo Matching against shared library & existing menus
      setAutomationStep("🧠 Step 2/3: AI Semantic Photo Matching against your Shared Cloud Photo Library...");
      const { updatedCategories, count } = await autoFillItemImages(digitizedMenu.categories || []);
      
      // Step 3: Save menu & sync all item/category photos to Shared Cloud Library for future menus
      setAutomationStep("⚡ Step 3/3: Saving menu & saving all new dish photos to library for future menus...");
      let totalItemsCount = 0;
      let itemsWithPhotoCount = 0;

      for (const cat of updatedCategories) {
        if (cat.name && cat.imageUrl) {
          await syncCategoryToLibrary(cat.name, cat.imageUrl);
        }
        if (Array.isArray(cat.items)) {
          for (const item of cat.items) {
            totalItemsCount++;
            if (item.imageUrl) {
              itemsWithPhotoCount++;
              await syncItemToLibrary(item.name, item.imageUrl, cat.name, selectedRestaurant.name);
            }
          }
        }
      }

      const menuData = sanitizeForFirestore({
        restaurantId: selectedRestaurant.id,
        categories: updatedCategories,
        updatedAt: new Date().toISOString()
      });
      
      await setDoc(doc(db, 'menus', selectedRestaurant.id), menuData);
      setMenu({ id: selectedRestaurant.id, ...menuData });

      setAutomationSummary({
        totalItems: totalItemsCount,
        matchedItems: count,
        neededPhotos: totalItemsCount - itemsWithPhotoCount,
        categoriesExtracted: updatedCategories.length
      });

      await loadLibraryItems();

    } catch (error) {
      console.error("Error processing menu:", error);
      alert("Failed to digitize menu. Please try again.");
    } finally {
      setUploading(false);
      setAutomationStep(null);
    }
  };

  const handleTriggerWebImageSearch = async () => {
    if (!menu || !selectedRestaurant || !menu.categories) return;

    try {
      setSyncingMenuImages(true);
      setAutomationSummary(null);
      setAutomationStep("🌐 Searching the web for fresh food photography for all menu items...");

      const webSearchResult = await searchWebPhotosForEntireMenu(
        menu.categories,
        (processed, total, currentItem) => {
          setAutomationStep(`🌐 Web searching dish ${processed}/${total}: "${currentItem}"...`);
        }
      );

      const newMenu = sanitizeForFirestore({
        ...menu,
        categories: webSearchResult.updatedCategories,
        updatedAt: new Date().toISOString()
      });

      await setDoc(doc(db, 'menus', selectedRestaurant.id), newMenu);
      setMenu(newMenu);

      setAutomationSummary({
        totalItems: webSearchResult.totalSearched,
        matchedItems: webSearchResult.successCount,
        neededPhotos: webSearchResult.totalSearched - webSearchResult.successCount,
        categoriesExtracted: menu.categories.length
      });

      alert(`Success! Automatically found fresh web food photos for ${webSearchResult.successCount} items!`);
    } catch (error) {
      console.error("Error web searching food images:", error);
      alert("Failed to search web images for menu items.");
    } finally {
      setSyncingMenuImages(false);
      setAutomationStep(null);
    }
  };

  const handleSingleItemWebSearch = async (catIdx: number, itemIdx: number, itemName: string) => {
    if (!menu || !selectedRestaurant) return;
    try {
      setAutomationStep(`🌐 Searching web for fresh photo of "${itemName}"...`);
      const categoryName = menu.categories[catIdx]?.name || '';
      const description = menu.categories[catIdx]?.items?.[itemIdx]?.description || '';
      const res = await searchWebFoodImage(itemName, categoryName, description);
      
      if (res && res.imageUrl) {
        const newMenu = { ...menu };
        newMenu.categories[catIdx].items[itemIdx].imageUrl = res.imageUrl;
        newMenu.categories[catIdx].items[itemIdx].isWebSearched = true;
        newMenu.categories[catIdx].items[itemIdx].webSearchSource = res.source;

        const sanitizedMenu = sanitizeForFirestore(newMenu);
        await setDoc(doc(db, 'menus', selectedRestaurant.id), sanitizedMenu);
        setMenu(sanitizedMenu);
      } else {
        alert(`Could not find a web photo for "${itemName}".`);
      }
    } catch (err) {
      console.error(`Error searching web photo for ${itemName}:`, err);
      alert(`Failed to search web photo for "${itemName}".`);
    } finally {
      setAutomationStep(null);
    }
  };

  const handleAssignPhotoFromLibrary = async (libraryItem: any) => {
    if (!libraryPickerTarget || !menu || !selectedRestaurant) return;
    const { catIdx, itemIdx } = libraryPickerTarget;

    const newMenu = { ...menu };
    const currentItem = newMenu.categories[catIdx].items[itemIdx];
    currentItem.imageUrl = libraryItem.imageUrl;
    currentItem.isAiMatched = false;

    try {
      setLoading(true);
      const sanitizedMenu = sanitizeForFirestore(newMenu);
      await setDoc(doc(db, 'menus', selectedRestaurant.id), sanitizedMenu);
      setMenu(sanitizedMenu);
      
      // Update item library with this match
      await syncItemToLibrary(
        currentItem.name, 
        libraryItem.imageUrl, 
        newMenu.categories[catIdx].name, 
        selectedRestaurant.name, 
        libraryItem.tags
      );
      
      setLibraryPickerTarget(null);
    } catch (error) {
      console.error("Error assigning photo from library:", error);
      alert("Failed to assign photo from library.");
    } finally {
      setLoading(false);
    }
  };

  const handleAutoTagLibraryItems = async () => {
    try {
      setSyncingLibrary(true);
      let taggedCount = 0;
      for (const item of libraryItems) {
        if (!item.tags || item.tags.length === 0) {
          const tags = await generateFoodMetadata(item.name, item.category);
          if (tags.length > 0) {
            await setDoc(doc(db, 'item_library', item.id), {
              tags: tags
            }, { merge: true });
            taggedCount++;
          }
        }
      }
      await loadLibraryItems();
      alert(`AI successfully generated metadata tags for ${taggedCount} food items in your library!`);
    } catch (error) {
      console.error("Error auto-tagging library items:", error);
      alert("Failed to auto-tag library items.");
    } finally {
      setSyncingLibrary(false);
    }
  };

  const baseUrl = window.location.hostname === 'localhost' ? window.location.origin : 'https://one-menu.app';
  const menuUrl = `${baseUrl}/menu/${selectedRestaurant?.slug || selectedRestaurant?.id}`;

  const safeSearchQuery = (searchQuery || '').toLowerCase().trim();
  
  const filteredCategories = (menu?.categories || []).map((category: any, catIdx: number) => ({
    ...category,
    originalIdx: catIdx,
    items: (category.items || []).map((item: any, itemIdx: number) => ({ ...item, originalIdx: itemIdx })).filter((item: any) => {
      const nameMatch = (item?.name || '').toLowerCase().includes(safeSearchQuery);
      const descMatch = (item?.description || '').toLowerCase().includes(safeSearchQuery);
      return nameMatch || descMatch;
    })
  })).filter((category: any) => category.items && category.items.length > 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900 selection:bg-indigo-500/30">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between z-30 sticky top-0">
        <div className="flex items-center gap-2 text-slate-900 font-extrabold text-xl tracking-tight">
          <div className="bg-indigo-600 p-1.5 rounded-lg shadow-sm">
            <QrCode className="w-5 h-5 text-white" />
          </div>
          <span>Onemenu<span className="text-indigo-600">.</span></span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`${isMobileMenuOpen ? 'flex' : 'hidden'} md:flex w-full md:w-72 bg-white border-b md:border-r md:border-b-0 border-slate-200 flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20 md:sticky md:top-0 md:h-screen overflow-y-auto`}>
        <div className="hidden md:flex p-6 border-b border-slate-100 items-center gap-3 text-slate-900 font-extrabold text-2xl tracking-tight">
          <div className="bg-indigo-600 p-2 rounded-xl shadow-sm">
            <QrCode className="w-6 h-6 text-white" />
          </div>
          <span>Onemenu<span className="text-indigo-600">.</span></span>
        </div>
        
        <div className="p-6 flex-1">
          <div className="space-y-2 mb-8">
            <button
              onClick={() => { setViewMode('restaurants'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                viewMode === 'restaurants' 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 translate-x-1' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Store className={`w-5 h-5 ${viewMode === 'restaurants' ? 'text-indigo-200' : 'text-slate-400'}`} />
              <span>Restaurants</span>
            </button>
            <button
              onClick={() => { setViewMode('leads'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                viewMode === 'leads' 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 translate-x-1' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Users className={`w-5 h-5 ${viewMode === 'leads' ? 'text-indigo-200' : 'text-slate-400'}`} />
              <span>Contact Leads</span>
              {leads.filter(l => l.status === 'new').length > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {leads.filter(l => l.status === 'new').length}
                </span>
              )}
            </button>
            <button
              onClick={() => { setViewMode('library'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                viewMode === 'library' 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 translate-x-1' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <ImageIcon className={`w-5 h-5 ${viewMode === 'library' ? 'text-indigo-200' : 'text-slate-400'}`} />
              <span>Shared Image Library</span>
            </button>
          </div>

          {viewMode === 'restaurants' && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Locations</h3>
                <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">{restaurants.length}</span>
              </div>
              
              <div className="space-y-2">
                {restaurants.map(rest => (
                  <button
                    key={rest.id}
                    onClick={() => { handleSelectRestaurant(rest); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      selectedRestaurant?.id === rest.id 
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                    }`}
                  >
                    <span className="truncate">{rest.name}</span>
                    {selectedRestaurant?.id === rest.id && <ChevronRight className="w-4 h-4 ml-auto opacity-70" />}
                  </button>
                ))}
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleCreateRestaurant(e); }} className="mt-8">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Add New Location</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Restaurant Name"
                    value={newRestaurantName}
                    onChange={(e) => setNewRestaurantName(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all placeholder:text-slate-400"
                  />
                  <button 
                    type="submit"
                    disabled={loading || !newRestaurantName.trim()}
                    className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-indigo-600 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 mb-6 px-2">
            <div className="w-10 h-10 rounded-full bg-indigo-100 border-2 border-white shadow-sm flex items-center justify-center text-indigo-700 font-bold">
              {user?.email?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-slate-900 truncate">{user?.email}</p>
              <p className="text-xs text-slate-500 font-medium">Admin Account</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="flex items-center justify-center gap-2 text-slate-600 hover:text-red-600 hover:bg-red-50 w-full px-4 py-2.5 rounded-xl text-sm font-bold transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative bg-slate-50/50">
        {/* Decorative Background */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(#000 1.5px, transparent 1.5px)', backgroundSize: '32px 32px' }}></div>
          <div className="absolute top-[-10%] right-[-5%] w-[50%] h-[50%] rounded-full bg-indigo-400/10 blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-5%] w-[50%] h-[50%] rounded-full bg-cyan-400/10 blur-[120px]" />
        </div>

        <div className="p-8 md:p-12 relative z-10">
          {firestoreNotice && (
            <div className="mb-8 p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <span className="text-sm font-medium">{firestoreNotice}</span>
              </div>
              <button onClick={() => setFirestoreNotice(null)} className="text-amber-600 hover:text-amber-900 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {viewMode === 'leads' ? (
            <div className="max-w-6xl mx-auto">
              <div className="mb-12">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-slate-900">
                  Contact Leads
                </h1>
                <p className="text-slate-500 text-lg font-medium max-w-xl">Manage incoming requests from restaurants wanting to use Onemenu.</p>
              </div>

              {leads.length > 0 ? (
                <div className="grid gap-6">
                  {leads.map(lead => (
                    <div key={lead.id} className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-2xl font-bold text-slate-900">{lead.restaurantName}</h3>
                          {lead.status === 'new' && (
                            <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200">New</span>
                          )}
                        </div>
                        <p className="text-slate-500 font-medium mb-4">Contact: {lead.contactPerson}</p>
                        
                        <div className="flex flex-wrap gap-4 text-sm font-medium text-slate-600">
                          <a href={`mailto:${lead.email}`} className="flex items-center gap-2 hover:text-indigo-600 transition-colors">
                            <Mail className="w-4 h-4" /> {lead.email}
                          </a>
                          <a href={`tel:${lead.phone}`} className="flex items-center gap-2 hover:text-indigo-600 transition-colors">
                            <Phone className="w-4 h-4" /> {lead.phone}
                          </a>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2 w-full md:w-auto">
                        <span className="text-xs text-slate-400 font-medium mb-2">
                          {new Date(lead.createdAt).toLocaleDateString()} at {new Date(lead.createdAt).toLocaleTimeString()}
                        </span>
                        <select 
                          value={lead.status}
                          onChange={async (e) => {
                            const newStatus = e.target.value;
                            try {
                              await setDoc(doc(db, 'leads', lead.id), { ...lead, status: newStatus });
                              setLeads(leads.map(l => l.id === lead.id ? { ...l, status: newStatus } : l));
                            } catch (error) {
                              console.error("Error updating lead status", error);
                              alert("Failed to update status.");
                            }
                          }}
                          className={`px-4 py-2 rounded-xl text-sm font-bold border outline-none transition-colors cursor-pointer ${
                            lead.status === 'new' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                            lead.status === 'contacted' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                            'bg-slate-100 border-slate-200 text-slate-600'
                          }`}
                        >
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-3xl p-12 shadow-sm border border-slate-100 text-center">
                  <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Users className="w-10 h-10 text-slate-300" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">No leads yet</h3>
                  <p className="text-slate-500 max-w-md mx-auto text-lg">
                    When restaurants fill out the form on your landing page, they will appear here.
                  </p>
                </div>
              )}
            </div>
          ) : viewMode === 'library' ? (
            <div className="max-w-6xl mx-auto">
              <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-slate-900">
                    Shared Image Library
                  </h1>
                  <p className="text-slate-500 text-lg font-medium max-w-xl">
                    A central repository of your dish names and their matched images. When you add or scan menus, images are matched and applied automatically!
                  </p>
                </div>
                
                <button
                  onClick={handleSyncAllImages}
                  disabled={syncingLibrary}
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-100"
                >
                  {syncingLibrary ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Scanning menus...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      Scan & Sync All Menu Images
                    </>
                  )}
                </button>
              </div>

              {/* Direct Add & Stats Section */}
              <div className="grid md:grid-cols-3 gap-8 mb-12">
                <div className="md:col-span-1 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-4 text-lg">Add to Shared Library</h3>
                  <form onSubmit={handleAddLibraryItemDirectly} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Item Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Pizza Margherita"
                        value={newLibraryItemName}
                        onChange={(e) => setNewLibraryItemName(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all placeholder:text-slate-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Item Photo</label>
                      <div className="flex items-center gap-3">
                        {newLibraryItemImage ? (
                          <ImageDisplay src={newLibraryItemImage} alt="Preview" className="w-12 h-12 object-cover rounded-lg border border-slate-200" />
                        ) : (
                          <div className="w-12 h-12 bg-slate-50 border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-400">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                        )}
                        <input
                          type="file"
                          id="library-direct-upload"
                          accept="image/*"
                          className="hidden"
                          onChange={handleLibraryImageUpload}
                        />
                        <label
                          htmlFor="library-direct-upload"
                          className="flex-1 px-4 py-2 bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-200 transition-all text-center"
                        >
                          Upload Photo
                        </label>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={addingToLibrary || !newLibraryItemName.trim() || !newLibraryItemImage}
                      className="w-full py-2.5 bg-slate-900 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-sm"
                    >
                      {addingToLibrary ? "Saving..." : "Add to Library"}
                    </button>
                  </form>
                </div>

                <div className="md:col-span-2 bg-indigo-50 border border-indigo-100 rounded-3xl p-8 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-indigo-900 text-2xl mb-2">Cloud Intelligence</h3>
                    <p className="text-indigo-700/80 font-medium leading-relaxed">
                      Every time you upload a menu page, Onemenu checks this cloud library and automatically attaches matching photos to your dishes. You can also manually trigger a match for any location at any time!
                    </p>
                  </div>
                  <div className="flex gap-4 items-center mt-6">
                    <div className="bg-white/80 backdrop-blur px-5 py-4 rounded-2xl border border-indigo-200/50">
                      <p className="text-xs text-indigo-500 font-bold uppercase tracking-wider">Master Library Items</p>
                      <p className="text-3xl font-extrabold text-indigo-950 mt-1">{libraryItems.length}</p>
                    </div>
                    <div className="bg-white/80 backdrop-blur px-5 py-4 rounded-2xl border border-indigo-200/50">
                      <p className="text-xs text-indigo-500 font-bold uppercase tracking-wider">Locations Protected</p>
                      <p className="text-3xl font-extrabold text-indigo-950 mt-1">{restaurants.length}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Library Grid & Search */}
              <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                  <div>
                    <h3 className="font-bold text-slate-900 text-xl">Cloud Photo Library</h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">Shared photo library used by AI for semantic matching</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <button
                      onClick={handleSyncAllImages}
                      disabled={syncingLibrary}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-sm disabled:opacity-50"
                      title="Scans all existing menus in database and saves all dish photos to library"
                    >
                      {syncingLibrary ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      Import All Menu Photos
                    </button>
                    <button
                      onClick={handleAutoTagLibraryItems}
                      disabled={syncingLibrary}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all shadow-sm disabled:opacity-50"
                      title="Generates AI food tags for semantic matching"
                    >
                      {syncingLibrary ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-indigo-600" />}
                      AI Auto-Tag Library
                    </button>
                    <div className="relative w-full md:w-72">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search library..."
                        value={librarySearchQuery}
                        onChange={(e) => setLibrarySearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                </div>

                {libraryItems.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {libraryItems
                      .filter(item => {
                        const q = librarySearchQuery.toLowerCase().trim();
                        if (!q) return true;
                        const nameMatch = (item.name || '').toLowerCase().includes(q);
                        const catMatch = (item.category || '').toLowerCase().includes(q);
                        const tagsMatch = Array.isArray(item.tags) && item.tags.some((t: string) => t.toLowerCase().includes(q));
                        return nameMatch || catMatch || tagsMatch;
                      })
                      .map(item => (
                        <div key={item.id} className="group relative bg-slate-50 rounded-2xl p-3 border border-slate-100 flex flex-col hover:shadow-md transition-all duration-300 animate-in fade-in zoom-in-95 duration-200">
                          <div className="aspect-square bg-white rounded-xl overflow-hidden mb-3 border border-slate-200/60 relative">
                            <ImageDisplay src={item.imageUrl} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                          </div>
                          <p className="font-bold text-slate-950 text-sm truncate pr-6">{item.name}</p>
                          {item.category && <p className="text-[10px] text-indigo-600 font-semibold mt-0.5">{item.category}</p>}
                          {Array.isArray(item.tags) && item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {item.tags.slice(0, 3).map((tag: string, tidx: number) => (
                                <span key={tidx} className="bg-indigo-50 text-indigo-700 text-[9px] px-1.5 py-0.5 rounded font-medium border border-indigo-100/50">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                          
                          <button
                            onClick={() => handleDeleteLibraryItem(item.id)}
                            className="absolute right-3 top-3 p-1.5 bg-white/90 backdrop-blur border border-slate-100 hover:border-red-100 text-slate-400 hover:text-red-500 rounded-lg hover:shadow-sm transition-all opacity-0 group-hover:opacity-100"
                            title="Delete from Library"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ImageIcon className="w-6 h-6 text-slate-300" />
                    </div>
                    <p className="text-slate-500 font-medium">No items in your shared library yet.</p>
                    <p className="text-slate-400 text-sm mt-1">Upload a menu image to auto-populate your library!</p>
                  </div>
                )}
              </div>
            </div>
          ) : selectedRestaurant ? (
            <div className="max-w-6xl mx-auto">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                <div className="relative">
                  <div className="absolute -left-6 -top-6 w-20 h-20 bg-indigo-400/20 blur-2xl rounded-full pointer-events-none"></div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider bg-emerald-100/80 backdrop-blur-sm px-2.5 py-1 rounded-md border border-emerald-200/50">Live Status</span>
                  </div>
                  <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-2">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500">
                      {selectedRestaurant.name}
                    </span>
                  </h1>
                  <p className="text-slate-500 text-lg font-medium max-w-xl mb-4">Manage your digital menu, update items in real-time, and download your custom QR codes.</p>
                  <button 
                    onClick={() => setEditingRestaurant({ ...selectedRestaurant })}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Restaurant Details
                  </button>
                </div>
                
                <div className="flex gap-3 flex-wrap">
                  {menu && (
                    <button
                      onClick={handleManualAutoFillMenu}
                      disabled={syncingMenuImages}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl text-sm font-bold hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-md shadow-indigo-200 disabled:opacity-50"
                      title="Auto-matches dish photos using Gemini AI from your Shared Cloud Photo Library and saves all new photos for future menus"
                    >
                      {syncingMenuImages ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                      )}
                      AI Auto-Match Photos
                    </button>
                  )}
                  <a 
                    href={menuUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Preview Menu
                  </a>
                  <div className="relative">
                    <input
                      type="file"
                      id="menu-upload-header"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                    <label 
                      htmlFor="menu-upload-header"
                      className={`inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold cursor-pointer hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 ${uploading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {uploading ? 'AI Processing...' : 'Upload Menu Pages'}
                    </label>
                  </div>
                  <button 
                    onClick={() => handleDeleteRestaurant()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-bold hover:bg-red-100 hover:border-red-300 transition-all shadow-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>

              {/* Active Automation Banner */}
              {automationStep && (
                <div className="mb-8 bg-indigo-600 text-white p-5 rounded-3xl shadow-lg border border-indigo-400/30 flex items-center justify-between animate-pulse">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-200" />
                    <span className="font-bold text-sm tracking-wide">{automationStep}</span>
                  </div>
                </div>
              )}

              {/* Automation Completion Summary Card */}
              {automationSummary && (
                <div className="mb-8 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl border border-indigo-500/30 animate-in fade-in slide-in-from-top-4 duration-300 relative overflow-hidden">
                  <button 
                    onClick={() => setAutomationSummary(null)} 
                    className="absolute top-4 right-4 p-1.5 text-indigo-300 hover:text-white bg-white/10 rounded-full transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-indigo-500/20 border border-indigo-400/30 rounded-2xl text-indigo-300">
                      <Sparkles className="w-6 h-6 text-indigo-300 animate-pulse" />
                    </div>
                    <div className="flex-1 pr-6">
                      <h4 className="font-extrabold text-lg text-white flex items-center gap-2">
                        AI Menu Automation Completed!
                      </h4>
                      <p className="text-indigo-200/90 text-xs font-medium mt-1">
                        Digitized paper menu, created categories, and matched food photos using Gemini AI semantic intelligence.
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                        <div className="bg-white/10 backdrop-blur px-3.5 py-2.5 rounded-xl border border-white/10">
                          <span className="text-[10px] uppercase font-bold text-indigo-300 block">Total Items</span>
                          <span className="text-lg font-black text-white">{automationSummary.totalItems}</span>
                        </div>
                        <div className="bg-emerald-500/20 backdrop-blur px-3.5 py-2.5 rounded-xl border border-emerald-400/30">
                          <span className="text-[10px] uppercase font-bold text-emerald-300 block">Photos Matched</span>
                          <span className="text-lg font-black text-emerald-200">{automationSummary.matchedItems}</span>
                        </div>
                        <div className="bg-amber-500/20 backdrop-blur px-3.5 py-2.5 rounded-xl border border-amber-400/30">
                          <span className="text-[10px] uppercase font-bold text-amber-300 block">Photo Needed</span>
                          <span className="text-lg font-black text-amber-200">{automationSummary.neededPhotos}</span>
                        </div>
                        <div className="bg-indigo-500/20 backdrop-blur px-3.5 py-2.5 rounded-xl border border-indigo-400/30">
                          <span className="text-[10px] uppercase font-bold text-indigo-300 block">Categories</span>
                          <span className="text-lg font-black text-indigo-200">{automationSummary.categoriesExtracted}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid lg:grid-cols-3 gap-8">
                {/* Menu Management */}
                <div className="lg:col-span-2 space-y-8">
                  {autoFilledCount !== null && autoFilledCount > 0 && (
                    <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 p-5 rounded-3xl flex items-center justify-between shadow-sm animate-in slide-in-from-top-4 duration-300">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-100 rounded-xl">
                          <ImageIcon className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">AI Semantic Photo Match</p>
                          <p className="text-xs text-indigo-600/90 font-medium">Successfully matched and assigned {autoFilledCount} food {autoFilledCount === 1 ? 'photo' : 'photos'} from your cloud library!</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setAutoFilledCount(null)}
                        className="text-indigo-400 hover:text-indigo-600 p-1 rounded-lg hover:bg-indigo-100/50 transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {menu ? (
                    <div className="space-y-8">
                      {/* Search Bar */}
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input 
                          type="text" 
                          placeholder="Search menu items..." 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 font-medium placeholder:text-slate-400 transition-all"
                        />
                        {searchQuery && (
                          <button 
                            onClick={() => setSearchQuery('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {filteredCategories.length > 0 ? (
                        <div className="space-y-12">
                          {filteredCategories.map((category: any, idx: number) => (
                            <div key={idx} className="relative">
                              <div className="flex items-center gap-4 mb-8">
                                <h3 className="text-3xl font-bold text-slate-900 font-serif tracking-tight">{category.name}</h3>
                                
                                <label className="cursor-pointer p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors" title="Upload Category Image">
                                  <Upload className="w-4 h-4 text-slate-600" />
                                  <input 
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={(e) => handleCategoryImageUpload(e, category.originalIdx)} 
                                  />
                                </label>

                                <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent"></div>
                                <span className="bg-white text-indigo-600 text-xs font-bold px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">{category.items.length} Items</span>
                              </div>

                              {category.imageUrl && (
                                <div className="w-full h-48 md:h-64 rounded-2xl overflow-hidden mb-8 relative group border border-slate-200 shadow-sm">
                                  <ImageDisplay src={category.imageUrl} alt={category.name} className="w-full h-full object-cover" />
                                  <button 
                                    onClick={() => handleRemoveCategoryImage(category.originalIdx)}
                                    className="absolute top-4 right-4 p-2.5 bg-white/90 backdrop-blur-sm text-red-600 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-50"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                </div>
                              )}
                              
                              <div className="grid sm:grid-cols-2 gap-6">
                                {category.items.map((item: any, i: number) => (
                                  <div key={i} className="group flex flex-col bg-white rounded-3xl border border-slate-100 hover:border-indigo-200 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300 relative overflow-hidden">
                                    <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                                      <button 
                                        onClick={() => setEditingItem({ catIdx: category.originalIdx, itemIdx: item.originalIdx, data: { ...item } })}
                                        className="p-2.5 bg-white/90 backdrop-blur-sm rounded-xl shadow-sm text-slate-500 hover:text-indigo-600 transition-colors"
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteItem(category.originalIdx, item.originalIdx)}
                                        className="p-2.5 bg-white/90 backdrop-blur-sm rounded-xl shadow-sm text-slate-500 hover:text-red-600 transition-colors"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>

                                    {item.imageUrl ? (
                                      <div className="w-full h-48 overflow-hidden bg-slate-100 relative">
                                        <ImageDisplay 
                                          src={item.imageUrl} 
                                          alt={item.name} 
                                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                        
                                        <div className="absolute top-3 left-3 flex items-center gap-1.5">
                                          {item.isAiMatched ? (
                                            <span className="bg-indigo-600/90 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-indigo-400/30 flex items-center gap-1 shadow-sm" title={item.matchReason || 'Matched using Gemini AI'}>
                                              <Sparkles className="w-3 h-3 text-amber-300" />
                                              AI Matched Photo
                                            </span>
                                          ) : (
                                            <span className="bg-emerald-600/90 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-400/30 flex items-center gap-1 shadow-sm">
                                              <Check className="w-3 h-3" />
                                              Photo Assigned
                                            </span>
                                          )}
                                        </div>

                                        <div className="absolute bottom-3 left-3 flex items-center justify-between right-3">
                                          <span className="font-bold text-white bg-black/40 backdrop-blur-md px-3 py-1 rounded-lg text-sm border border-white/20 shadow-sm">
                                            {(item.price || 0).toFixed(2)} DH
                                          </span>
                                          <div className="flex gap-1.5">
                                            <button
                                              onClick={() => handleSingleItemWebSearch(category.originalIdx, item.originalIdx, item.name)}
                                              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-2.5 py-1 rounded-lg backdrop-blur shadow-sm transition-all flex items-center gap-1"
                                              title="Triggers a fresh web search on Google/Unsplash/Wikimedia for this dish"
                                            >
                                              <Search className="w-3 h-3 text-amber-300" />
                                              Web Search
                                            </button>
                                            <button
                                              onClick={() => setLibraryPickerTarget({ catIdx: category.originalIdx, itemIdx: item.originalIdx, itemName: item.name })}
                                              className="text-xs bg-white/90 hover:bg-white text-slate-800 font-bold px-2.5 py-1 rounded-lg backdrop-blur shadow-sm transition-all flex items-center gap-1"
                                            >
                                              <ImageIcon className="w-3 h-3 text-indigo-600" />
                                              Swap Photo
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                        <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-amber-200/60 uppercase tracking-wider flex items-center gap-1">
                                          <AlertCircle className="w-3 h-3 text-amber-600" />
                                          Photo Needed
                                        </span>
                                        <button
                                          onClick={() => setLibraryPickerTarget({ catIdx: category.originalIdx, itemIdx: item.originalIdx, itemName: item.name })}
                                          className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-3 py-1.5 rounded-xl border border-indigo-200 transition-all flex items-center gap-1.5 shadow-sm"
                                        >
                                          <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                                          Assign Photo
                                        </button>
                                      </div>
                                    )}
                                    
                                    <div className="p-6 flex-1 flex flex-col">
                                      <h4 className="font-bold text-slate-900 text-xl leading-tight mb-2 pr-4">{item.name}</h4>
                                      {item.description && <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">{item.description}</p>}
                                      {!item.imageUrl && (
                                        <div className="mt-4">
                                          <span className="font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg text-sm border border-indigo-100 shadow-sm">{(item.price || 0).toFixed(2)} DH</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-white rounded-3xl p-12 shadow-sm border border-slate-100 text-center">
                          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search className="w-8 h-8 text-slate-400" />
                          </div>
                          <h3 className="text-xl font-bold text-slate-900 mb-2">No items found</h3>
                          <p className="text-slate-500">We couldn't find any menu items matching "{searchQuery}".</p>
                          <button 
                            onClick={() => setSearchQuery('')}
                            className="mt-6 text-indigo-600 font-bold hover:text-indigo-700"
                          >
                            Clear search
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-white rounded-3xl p-12 shadow-sm border border-slate-100 text-center">
                      <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Utensils className="w-10 h-10 text-indigo-500" />
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-3">No menu digitized yet</h3>
                      <p className="text-slate-500 max-w-md mx-auto mb-8 text-lg">
                        Upload a photo of your physical menu, and our AI will instantly convert it into a beautiful digital experience.
                      </p>
                      <div className="relative inline-block">
                        <input
                          type="file"
                          id="menu-upload-empty"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={handleFileUpload}
                          disabled={uploading}
                        />
                        <label 
                          htmlFor="menu-upload-empty"
                          className={`inline-flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg cursor-pointer hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 hover:-translate-y-1 ${uploading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                          {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                          {uploading ? 'Processing with AI...' : 'Upload Menu Images'}
                        </label>
                        {uploading && (
                          <div className="absolute top-full left-0 right-0 mt-4">
                            <div className="h-2 w-full bg-indigo-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-indigo-600 transition-all duration-500 ease-out"
                                style={{ width: `${uploadProgress}%` }}
                              />
                            </div>
                            <p className="text-sm text-indigo-600 font-bold mt-2 text-center">
                              {Math.round(uploadProgress)}% - AI is reading your menu...
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sidebar Widgets */}
                <div className="space-y-6">
                  {/* QR Code Widget */}
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center sticky top-8">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <QrCode className="w-6 h-6 text-slate-700" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Table QR Code</h2>
                    <p className="text-sm text-slate-500 mb-8">Print this code and place it on your tables for guests to scan.</p>
                    
                    <div className="bg-slate-50 p-6 inline-block rounded-2xl border border-slate-200 shadow-inner mb-8">
                      <div className="text-sm font-extrabold text-slate-900 uppercase tracking-widest mb-4">Scan for Menu</div>
                      <QRCodeSVG value={menuUrl} size={180} level="H" className="mx-auto" />
                      <div className="mt-4 text-lg font-serif italic font-semibold text-slate-700" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                        {selectedRestaurant.name}
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <a 
                        href={menuUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-3.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors shadow-md"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Preview Digital Menu
                      </a>
                      <button 
                        onClick={() => {
                          const printWindow = window.open('', '_blank');
                          if (printWindow) {
                            const svgHtml = document.querySelector('.bg-slate-50.p-6 svg')?.outerHTML || '';
                            const cardsHtml = `
                              <div class="card">
                                <div class="title">Scan for Menu</div>
                                <div class="qr-wrapper">${svgHtml}</div>
                                <div class="subtitle">${selectedRestaurant.name}</div>
                              </div>
                            `;

                            printWindow.document.write(`
                              <html>
                                <head>
                                  <title>Print QR Codes (A4)</title>
                                  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400;1,600&display=swap" rel="stylesheet">
                                  <style>
                                    @page { size: A4; margin: 0; }
                                    body { 
                                      margin: 0; 
                                      padding: 0; 
                                      font-family: system-ui, -apple-system, sans-serif; 
                                      -webkit-print-color-adjust: exact; 
                                      display: flex;
                                      align-items: center;
                                      justify-content: center;
                                      height: 100vh;
                                      width: 100vw;
                                      background: #ffffff;
                                    }
                                    .card {
                                      width: 100%;
                                      height: 100%;
                                      display: flex;
                                      flex-direction: column;
                                      align-items: center;
                                      justify-content: center;
                                      padding: 20mm;
                                      text-align: center;
                                      box-sizing: border-box;
                                    }
                                    .qr-wrapper svg {
                                      width: 160mm;
                                      height: 160mm;
                                      margin: 20mm 0;
                                    }
                                    .title { 
                                      font-size: 48px; 
                                      font-weight: 900; 
                                      color: #0f172a; 
                                      text-transform: uppercase;
                                      letter-spacing: 0.1em;
                                    }
                                    .subtitle { 
                                      font-size: 56px; 
                                      font-family: 'Playfair Display', Georgia, serif;
                                      font-style: italic;
                                      font-weight: 700; 
                                      color: #334155; 
                                      letter-spacing: 0.02em;
                                      max-width: 90%;
                                      line-height: 1.2;
                                    }
                                  </style>
                                </head>
                                <body>
                                  ${cardsHtml}
                                  <script>
                                    window.onload = () => window.print();
                                  </script>
                                </body>
                              </html>
                            `);
                            printWindow.document.close();
                          }
                        }}
                        className="flex items-center justify-center gap-2 w-full py-3.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors"
                      >
                        Print QR Code
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[80vh] flex flex-col items-center justify-center text-center max-w-md mx-auto">
              {loading ? (
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
              ) : (
                <>
                  <div className="w-24 h-24 bg-white rounded-full shadow-sm border border-slate-100 flex items-center justify-center mb-6">
                    <Store className="w-10 h-10 text-slate-300" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome to Onemenu</h2>
                  <p className="text-slate-500 text-lg">Select a restaurant from the sidebar or create a new one to start managing your digital menus.</p>
                </>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-lg w-full relative shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setEditingItem(null)} 
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors bg-slate-100 p-2 rounded-full hover:bg-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                <Edit2 className="w-5 h-5" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Edit Menu Item</h3>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Item Name</label>
                <input 
                  type="text" 
                  value={editingItem.data.name}
                  onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, name: e.target.value } })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 font-medium"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Description</label>
                <textarea 
                  value={editingItem.data.description}
                  onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, description: e.target.value } })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 resize-none h-24"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Price (DH)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">DH</span>
                  <input 
                    type="number" 
                    step="0.01"
                    value={editingItem.data.price}
                    onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, price: parseFloat(e.target.value) || 0 } })}
                    className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 font-bold"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Dish Photo</label>
                <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  {editingItem.data.imageUrl ? (
                    <ImageDisplay src={editingItem.data.imageUrl} alt="Preview" className="w-20 h-20 object-cover rounded-lg shadow-sm" />
                  ) : (
                    <div className="w-20 h-20 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-slate-300 shadow-sm">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                  )}
                  <div className="flex-1">
                    <input 
                      type="file" 
                      id="item-image-upload"
                      accept="image/*"
                      className="hidden"
                      onChange={handleItemImageUpload}
                    />
                    <label 
                      htmlFor="item-image-upload"
                      className="inline-flex items-center justify-center w-full gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold cursor-pointer hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                    >
                      <Upload className="w-4 h-4" /> Change Photo
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 flex gap-3">
                <button 
                  onClick={() => setEditingItem(null)}
                  className="flex-1 bg-slate-100 text-slate-700 py-4 rounded-xl font-bold text-lg hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleSaveItem()}
                  className="flex-[2] bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Restaurant Modal */}
      {editingRestaurant && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-lg w-full relative shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setEditingRestaurant(null)} 
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors bg-slate-100 p-2 rounded-full hover:bg-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                <Store className="w-5 h-5" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Restaurant Details</h3>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Restaurant Name</label>
                <input 
                  type="text" 
                  value={editingRestaurant.name || ''}
                  onChange={(e) => setEditingRestaurant({ ...editingRestaurant, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 font-medium"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Description</label>
                <textarea 
                  value={editingRestaurant.description || ''}
                  onChange={(e) => setEditingRestaurant({ ...editingRestaurant, description: e.target.value })}
                  placeholder="e.g. A cozy cafe in the heart of the city."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 resize-none h-24"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Instagram URL</label>
                <input 
                  type="url" 
                  value={editingRestaurant.instagramUrl || ''}
                  onChange={(e) => setEditingRestaurant({ ...editingRestaurant, instagramUrl: e.target.value })}
                  placeholder="https://instagram.com/yourrestaurant"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Phone Number</label>
                <input 
                  type="tel" 
                  value={editingRestaurant.phoneNumber || ''}
                  onChange={(e) => setEditingRestaurant({ ...editingRestaurant, phoneNumber: e.target.value })}
                  placeholder="+1 234 567 8900"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 font-medium"
                />
              </div>
              
              <div className="pt-4 flex gap-3">
                <button 
                  onClick={() => setEditingRestaurant(null)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleSaveRestaurant()}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200 disabled:opacity-70"
                >
                  {loading ? 'Saving...' : 'Save Details'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Select Photo from Cloud Library Modal */}
      {libraryPickerTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-2xl w-full max-h-[85vh] flex flex-col relative shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setLibraryPickerTarget(null)} 
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors bg-slate-100 p-2 rounded-full hover:bg-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-2">
              <div className="bg-indigo-100 p-2.5 rounded-xl text-indigo-600">
                <ImageIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Select Food Photo</h3>
                <p className="text-sm text-slate-500 font-medium">
                  Assigning photo for <span className="font-bold text-indigo-600">"{libraryPickerTarget.itemName}"</span>
                </p>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative my-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search library by food name, category, or tag..."
                value={libraryPickerSearch}
                onChange={(e) => setLibraryPickerSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Grid of Library Photos */}
            <div className="flex-1 overflow-y-auto pr-1 my-2">
              {libraryItems.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {libraryItems
                    .filter(item => {
                      const q = libraryPickerSearch.toLowerCase().trim();
                      if (!q) return true;
                      const nameMatch = (item.name || '').toLowerCase().includes(q);
                      const catMatch = (item.category || '').toLowerCase().includes(q);
                      const tagsMatch = Array.isArray(item.tags) && item.tags.some((t: string) => t.toLowerCase().includes(q));
                      return nameMatch || catMatch || tagsMatch;
                    })
                    .map((item) => (
                      <div 
                        key={item.id}
                        onClick={() => handleAssignPhotoFromLibrary(item)}
                        className="group cursor-pointer bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-300 rounded-2xl p-3 transition-all duration-200 flex flex-col hover:shadow-md"
                      >
                        <div className="aspect-square bg-white rounded-xl overflow-hidden mb-2.5 border border-slate-200/80 relative">
                          <ImageDisplay src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        </div>
                        <p className="font-bold text-slate-900 text-xs truncate">{item.name}</p>
                        {item.category && <p className="text-[10px] text-indigo-600 font-semibold mt-0.5">{item.category}</p>}
                        {Array.isArray(item.tags) && item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {item.tags.slice(0, 2).map((tag: string, tidx: number) => (
                              <span key={tidx} className="bg-slate-200/70 text-slate-600 text-[9px] px-1.5 py-0.5 rounded font-medium">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <button className="mt-3 w-full py-2 bg-indigo-600 group-hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm">
                          Assign Photo
                        </button>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 font-medium">No food photos available in your library.</p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
              <p className="text-xs text-slate-400">
                Selecting a photo will assign it to this item and save automatically.
              </p>
              <button
                onClick={() => setLibraryPickerTarget(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
