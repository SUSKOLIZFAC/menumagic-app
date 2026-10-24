import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { ImageDisplay } from '../components/ImageDisplay';
import { 
  UtensilsCrossed, 
  Utensils, 
  Search, 
  X, 
  Instagram, 
  Phone, 
  Globe, 
  Share2, 
  MapPin, 
  Plus, 
  Minus, 
  ShoppingBag, 
  Send,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCachedRestaurantAndMenu, saveRestaurantAndMenuToCache } from '../utils/menuCache';
import { BrandLogo } from '../components/BrandLogo';

interface TrayItem {
  dish: any;
  quantity: number;
}

export default function RestaurantMenu() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  
  // Synchronous cache lookup for instant load
  const initialCache = getCachedRestaurantAndMenu(restaurantId, false);
  const [restaurant, setRestaurant] = useState<any>(initialCache?.restaurant || null);
  const [menu, setMenu] = useState<any>(initialCache?.menu || null);
  const [loading, setLoading] = useState(!initialCache?.restaurant || !initialCache?.menu);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [currentLang, setCurrentLang] = useState('en');
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  // Table Tray / Order Estimator State
  const [tray, setTray] = useState<TrayItem[]>([]);
  const [isTrayOpen, setIsTrayOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState('');

  const languages = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  ];

  useEffect(() => {
    // Check for existing translation cookie
    const match = document.cookie.match(/googtrans=\/en\/([a-z]{2})/);
    if (match && match[1]) {
      setCurrentLang(match[1]);
    }

    // Add Google Translate script
    const addScript = document.createElement('script');
    addScript.setAttribute('src', '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit');
    document.body.appendChild(addScript);

    (window as any).googleTranslateElementInit = () => {
      new (window as any).google.translate.TranslateElement({
        pageLanguage: 'en',
        includedLanguages: 'en,es,fr,de',
        autoDisplay: false,
      }, 'google_translate_element');
    };
  }, []);

  const changeLanguage = (langCode: string) => {
    setCurrentLang(langCode);
    setShowLangMenu(false);
    
    const select = document.querySelector('.goog-te-combo') as HTMLSelectElement;
    if (select) {
      select.value = langCode;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      
      if (langCode === 'en') {
        setTimeout(() => {
          document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + window.location.hostname;
          window.location.reload();
        }, 500);
      }
      return;
    }

    if (langCode === 'en') {
      document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + window.location.hostname;
    } else {
      document.cookie = `googtrans=/en/${langCode}; path=/;`;
      document.cookie = `googtrans=/en/${langCode}; path=/; domain=${window.location.hostname}`;
    }
    window.location.reload();
  };

  useEffect(() => {
    if (restaurantId) {
      const cache = getCachedRestaurantAndMenu(restaurantId, false);
      if (cache?.restaurant && cache?.menu) {
        setRestaurant(cache.restaurant);
        setMenu(cache.menu);
        setLoading(false);
      } else {
        setLoading(true);
      }
      fetchData();
    }
  }, [restaurantId]);

  const fetchData = async () => {
    let restData: any = null;
    let menuData: any = null;

    try {
      let actualRestaurantId = restaurantId!;

      // First, try to find by slug
      const q = query(collection(db, 'restaurants'), where('slug', '==', restaurantId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        actualRestaurantId = docSnap.id;
        restData = { id: docSnap.id, ...docSnap.data() };
      } else {
        // Fallback to direct ID lookup
        const restDoc = await getDoc(doc(db, 'restaurants', restaurantId!));
        if (restDoc.exists()) {
          restData = { id: restDoc.id, ...restDoc.data() };
        }
      }

      if (restData) {
        const menuDoc = await getDoc(doc(db, 'menus', actualRestaurantId));
        if (menuDoc.exists()) {
          menuData = { id: menuDoc.id, ...menuDoc.data() };
        }
      }

      if (restData && menuData) {
        setRestaurant(restData);
        setMenu(menuData);
        saveRestaurantAndMenuToCache(restData, menuData);
        if (menuData.categories && menuData.categories.length > 0) {
          setActiveCategory('All');
        }
      } else {
        const cached = getCachedRestaurantAndMenu(restaurantId);
        setRestaurant(cached.restaurant);
        setMenu(cached.menu);
        if (cached.menu?.categories && cached.menu.categories.length > 0) {
          setActiveCategory('All');
        }
      }
    } catch (error) {
      console.warn("Could not fetch menu from Firestore, falling back to cache:", error);
      handleFirestoreError(error, OperationType.GET, `menus/${restaurantId}`);
      
      const cached = getCachedRestaurantAndMenu(restaurantId);
      setRestaurant(cached.restaurant);
      setMenu(cached.menu);
      if (cached.menu?.categories && cached.menu.categories.length > 0) {
        setActiveCategory('All');
      }
    } finally {
      setLoading(false);
    }
  };

  // Tray management
  const addToTray = (dish: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTray(prev => {
      const existing = prev.find(item => item.dish.name === dish.name);
      if (existing) {
        return prev.map(item => 
          item.dish.name === dish.name 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { dish, quantity: 1 }];
    });
  };

  const removeFromTray = (dishName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTray(prev => {
      const existing = prev.find(item => item.dish.name === dishName);
      if (existing && existing.quantity > 1) {
        return prev.map(item => 
          item.dish.name === dishName 
            ? { ...item, quantity: item.quantity - 1 }
            : item
        );
      }
      return prev.filter(item => item.dish.name !== dishName);
    });
  };

  const totalTrayItems = tray.reduce((sum, item) => sum + item.quantity, 0);
  const totalTrayPrice = tray.reduce((sum, item) => sum + ((item.dish.price || 0) * item.quantity), 0);

  const normalizeStr = (str: string) => {
    return (str || '')
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  };

  const safeSearchQuery = normalizeStr(searchQuery);

  const filteredCategories = (menu?.categories || []).map((cat: any) => {
    const catName = normalizeStr(cat?.name);
    const catNameMatch = safeSearchQuery.length > 0 && (
      catName.includes(safeSearchQuery) || 
      safeSearchQuery.includes(catName) ||
      (safeSearchQuery.endsWith('s') && catName.includes(safeSearchQuery.slice(0, -1))) ||
      (catName.endsWith('s') && safeSearchQuery.includes(catName.slice(0, -1)))
    );

    return {
      ...cat,
      items: (cat.items || []).filter((item: any) => {
        if (!safeSearchQuery) return true;

        const itemName = normalizeStr(item?.name);
        const itemDesc = normalizeStr(item?.description);

        const nameMatch = itemName.includes(safeSearchQuery);
        const descMatch = itemDesc.includes(safeSearchQuery);

        const searchWords = safeSearchQuery.split(/\s+/).filter(w => w.length > 1);
        const wordsMatch = searchWords.length > 1 && searchWords.every(word => 
          itemName.includes(word) || itemDesc.includes(word) || catName.includes(word)
        );

        return catNameMatch || nameMatch || descMatch || wordsMatch;
      })
    };
  }).filter((cat: any) => cat.items && cat.items.length > 0);

  const displayCategories = safeSearchQuery 
    ? filteredCategories 
    : (activeCategory === 'All' 
        ? filteredCategories 
        : filteredCategories.filter((c: any) => c.name === activeCategory));

  const rawWhatsapp = restaurant?.whatsappNumber || restaurant?.whatsapp || restaurant?.phoneNumber || restaurant?.phone || '';
  const cleanWhatsapp = rawWhatsapp.replace(/[^0-9]/g, '');
  const whatsappLink = cleanWhatsapp 
    ? `https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(`Hello ${restaurant?.name || 'there'}! I am viewing your menu.`)}`
    : null;

  const defaultCoverUrl = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80";
  const coverImage = restaurant?.coverImageUrl || defaultCoverUrl;

  const handleSendTrayOrderWhatsApp = () => {
    if (!cleanWhatsapp || tray.length === 0) return;
    const itemsList = tray.map(item => `• ${item.quantity}x ${item.dish.name} (${(item.dish.price * item.quantity).toFixed(2)} DH)`).join('\n');
    const tableInfo = tableNumber ? `Table: ${tableNumber}\n` : '';
    const message = `Hello ${restaurant?.name || 'Restaurant'}!\n\nI would like to place an order from my digital menu:\n${tableInfo}\n${itemsList}\n\nTotal: ${totalTrayPrice.toFixed(2)} DH`;
    window.open(`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 pb-24">
        <div className="w-full h-56 sm:h-72 bg-slate-200 animate-pulse" />
        <div className="max-w-3xl mx-auto px-4 -mt-12">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="w-48 h-7 bg-slate-200 rounded-md animate-pulse" />
            <div className="w-72 h-4 bg-slate-100 rounded-md animate-pulse" />
            <div className="flex gap-2 pt-2">
              <div className="w-20 h-8 bg-slate-100 rounded-lg animate-pulse" />
              <div className="w-24 h-8 bg-slate-100 rounded-lg animate-pulse" />
              <div className="w-20 h-8 bg-slate-100 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!menu || !restaurant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center text-slate-900">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 text-slate-400">
          <UtensilsCrossed className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold tracking-tight mb-2 text-slate-900">Menu Currently Offline</h1>
        <p className="text-slate-500 max-w-sm text-sm leading-relaxed mb-6">
          This restaurant is currently refreshing their digital offerings. Please check back shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-900 font-sans selection:bg-slate-900 selection:text-white pb-32">
      <div id="google_translate_element" className="opacity-0 absolute pointer-events-none" aria-hidden="true" />

      {/* TOP HEADER COVER WITH MEASURED SCRIM */}
      <div className="relative w-full h-52 sm:h-72 overflow-hidden bg-slate-900">
        <ImageDisplay 
          src={coverImage} 
          alt={restaurant.name} 
          className="w-full h-full object-cover opacity-90"
        />
        {/* Measured dark gradient scrim for 4.5:1 text contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-black/30 pointer-events-none" />

        {/* Floating Language Dropdown */}
        <div className="absolute top-4 right-4 z-40">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 backdrop-blur-md border border-white/20 rounded-lg text-xs font-semibold text-white hover:bg-slate-900 transition-colors shadow-xs"
              aria-label="Change menu language"
            >
              <Globe className="w-3.5 h-3.5 text-slate-300" />
              <span className="uppercase tracking-wider">{currentLang}</span>
            </button>

            <AnimatePresence>
              {showLangMenu && (
                <motion.div 
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="absolute right-0 mt-2 w-36 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden py-1 z-50"
                >
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => changeLanguage(l.code)}
                      className={`w-full text-left px-3.5 py-2 text-xs flex items-center gap-2 hover:bg-slate-50 transition-colors ${
                        currentLang === l.code ? 'font-bold text-slate-900 bg-slate-50' : 'text-slate-600'
                      }`}
                    >
                      <span>{l.flag}</span>
                      <span>{l.label}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* RESTAURANT IDENTITY CARD */}
      <div className="relative z-20 max-w-3xl mx-auto px-4 -mt-14 mb-6">
        <div className="bg-white rounded-2xl p-6 sm:p-7 shadow-sm border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          
          <div className="flex items-center gap-4">
            {restaurant.imageUrl ? (
              <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 shrink-0 shadow-xs">
                <ImageDisplay 
                  src={restaurant.imageUrl} 
                  alt={restaurant.name} 
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-xl border border-slate-200 bg-slate-900 text-white flex items-center justify-center shrink-0">
                <Utensils className="w-7 h-7 text-amber-500" />
              </div>
            )}

            <div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 tracking-tight">
                {restaurant.name}
              </h1>
              
              {(restaurant.address || restaurant.location) && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate max-w-xs">{restaurant.address || restaurant.location}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Contact Icons */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {whatsappLink && (
              <a 
                href={whatsappLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-xs font-semibold hover:bg-emerald-100 transition-colors"
                title="Message on WhatsApp"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>WhatsApp</span>
              </a>
            )}

            {restaurant.phoneNumber && (
              <a 
                href={`tel:${restaurant.phoneNumber}`} 
                className="p-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                title={`Call ${restaurant.phoneNumber}`}
                aria-label="Call restaurant"
              >
                <Phone className="w-4 h-4" />
              </a>
            )}

            {restaurant.instagramUrl && (
              <a 
                href={restaurant.instagramUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                title="Instagram"
                aria-label="Instagram profile"
              >
                <Instagram className="w-4 h-4" />
              </a>
            )}
          </div>

        </div>
      </div>

      {/* STICKY SEARCH & CATEGORY BAR */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs">
        <div className="max-w-3xl mx-auto px-4 py-3">
          
          {/* Live Search Input */}
          <div className="relative mb-2.5">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search dishes, drinks, ingredients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100/80 border border-slate-200/80 rounded-xl py-2 pl-9.5 pr-8 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
            />
            {searchQuery && (
              <button 
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Clean Segmented Category Tabs */}
          {!searchQuery && menu?.categories?.length > 0 && (
            <div className="flex overflow-x-auto gap-1.5 py-0.5 no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveCategory('All')}
                className={`whitespace-nowrap px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                  activeCategory === 'All' 
                    ? 'bg-slate-900 text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70'
                }`}
              >
                All Items
              </button>
              {menu.categories.map((cat: any, idx: number) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveCategory(cat.name)}
                  className={`whitespace-nowrap px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                    activeCategory === cat.name 
                      ? 'bg-slate-900 text-white shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* DISHES LIST */}
      <main className="max-w-3xl mx-auto px-4 pt-6">
        {displayCategories.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
            <Search className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-900 mb-1">No items match your search</p>
            <p className="text-xs text-slate-500 mb-4">Try searching for a different dish name or category</p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              Reset Search
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {displayCategories.map((category: any, idx: number) => (
              <section key={idx} className="space-y-3">
                
                {/* Category Header (Unboxed, clean) */}
                <div className="flex items-baseline justify-between border-b border-slate-200/80 pb-2">
                  <h2 className="text-lg font-serif font-bold text-slate-900 tracking-tight">
                    {category.name}
                  </h2>
                  <span className="font-mono text-xs text-slate-500 tabular-nums">
                    {category.items?.length || 0} items
                  </span>
                </div>

                {/* Items Grid */}
                <div className="grid sm:grid-cols-2 gap-3.5">
                  {category.items.map((item: any, i: number) => {
                    const itemInTray = tray.find(t => t.dish.name === item.name);
                    const qtyInTray = itemInTray ? itemInTray.quantity : 0;

                    return (
                      <div
                        key={i}
                        onClick={() => setSelectedItem(item)}
                        className="group bg-white rounded-xl p-4 border border-slate-200 hover:border-slate-300 transition-all shadow-xs flex items-start justify-between gap-3 cursor-pointer relative"
                      >
                        <div className="flex-1 min-w-0 pr-1">
                          <h3 className="text-sm font-bold text-slate-900 leading-snug group-hover:text-slate-700 transition-colors mb-1">
                            {item.name}
                          </h3>
                          
                          {item.description && (
                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
                              {item.description}
                            </p>
                          )}

                          <div className="flex items-center justify-between pt-1">
                            <span className="font-mono tabular-nums text-sm font-bold text-slate-900">
                              {(item.price || 0).toFixed(2)} DH
                            </span>

                            {/* Add to Tray Quick Action */}
                            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              {qtyInTray > 0 ? (
                                <div className="inline-flex items-center gap-2 bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                                  <button
                                    type="button"
                                    onClick={(e) => removeFromTray(item.name, e)}
                                    className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:bg-white transition-colors"
                                    aria-label="Decrease quantity"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="font-mono text-xs font-bold text-slate-900 tabular-nums px-1">
                                    {qtyInTray}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => addToTray(item, e)}
                                    className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:bg-white transition-colors"
                                    aria-label="Increase quantity"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => addToTray(item, e)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-900 hover:text-white transition-colors"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Add</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Dish Photo */}
                        {item.imageUrl && (
                          <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-100">
                            <ImageDisplay 
                              src={item.imageUrl} 
                              alt={item.name} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

              </section>
            ))}
          </div>
        )}
      </main>

      {/* FLOATING TABLE TRAY / ORDER ESTIMATOR STATUS */}
      {totalTrayItems > 0 && (
        <div className="fixed bottom-6 inset-x-4 max-w-lg mx-auto z-40">
          <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-xl border border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Table Selection</p>
                <p className="text-sm font-mono tabular-nums font-bold text-white">
                  {totalTrayItems} {totalTrayItems === 1 ? 'item' : 'items'} · {totalTrayPrice.toFixed(2)} DH
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsTrayOpen(true)}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
            >
              Review Table Tray
            </button>
          </div>
        </div>
      )}

      {/* TABLE TRAY MODAL */}
      <AnimatePresence>
        {isTrayOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-bold text-lg text-slate-900">Your Table Tray</h3>
                  <p className="text-xs text-slate-500">Review selected dishes before placing your order</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTrayOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
                  aria-label="Close tray"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto flex-1 space-y-3">
                {tray.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate">{item.dish.name}</p>
                      <p className="font-mono text-xs text-slate-500 tabular-nums">
                        {(item.dish.price || 0).toFixed(2)} DH each
                      </p>
                    </div>

                    <div className="inline-flex items-center gap-2 bg-white rounded-lg p-0.5 border border-slate-200">
                      <button
                        type="button"
                        onClick={() => removeFromTray(item.dish.name)}
                        className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-mono text-xs font-bold text-slate-900 tabular-nums px-1">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => addToTray(item.dish)}
                        className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="font-mono text-xs font-bold text-slate-900 tabular-nums text-right w-16">
                      {((item.dish.price || 0) * item.quantity).toFixed(2)} DH
                    </div>
                  </div>
                ))}

                {/* Table Number Prompt */}
                <div className="pt-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Table Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Table 4"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              <div className="p-5 border-t border-slate-100 bg-slate-50 space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold text-slate-600">Estimated Total</span>
                  <span className="font-mono text-xl font-bold text-slate-900 tabular-nums">
                    {totalTrayPrice.toFixed(2)} DH
                  </span>
                </div>

                {cleanWhatsapp ? (
                  <button
                    type="button"
                    onClick={handleSendTrayOrderWhatsApp}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-xs"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Send Order via WhatsApp</span>
                  </button>
                ) : (
                  <p className="text-[11px] text-slate-500 text-center">
                    Show this summary to your server at the table.
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DISH DETAIL MODAL */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col relative"
            >
              <button 
                type="button"
                onClick={() => setSelectedItem(null)}
                className="absolute top-3 right-3 z-20 p-2 bg-white/90 backdrop-blur-md rounded-full shadow-xs text-slate-700 hover:text-slate-900"
                aria-label="Close dish preview"
              >
                <X className="w-4 h-4" />
              </button>

              {selectedItem.imageUrl && (
                <div className="w-full h-56 sm:h-64 relative bg-slate-100 shrink-0">
                  <ImageDisplay 
                    src={selectedItem.imageUrl} 
                    alt={selectedItem.name} 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="p-6 overflow-y-auto flex-1">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h3 className="text-xl font-serif font-bold text-slate-900">
                    {selectedItem.name}
                  </h3>
                  <div className="font-mono text-xl font-bold text-slate-900 tabular-nums shrink-0">
                    {(selectedItem.price || 0).toFixed(2)} DH
                  </div>
                </div>

                {selectedItem.description && (
                  <p className="text-slate-600 text-sm leading-relaxed mb-6">
                    {selectedItem.description}
                  </p>
                )}

                <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      addToTray(selectedItem);
                      setSelectedItem(null);
                    }}
                    className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add to Table Tray</span>
                  </button>

                  {cleanWhatsapp && (
                    <a
                      href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(`Hello ${restaurant.name}! I would like to inquire about "${selectedItem.name}".`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold hover:bg-emerald-100 transition-colors flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-4 h-4 text-emerald-600" />
                      <span>Inquire</span>
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QUIET FOOTER */}
      <footer className="mt-20 pt-10 pb-12 bg-white border-t border-slate-200/80 text-center text-xs text-slate-500">
        <div className="max-w-3xl mx-auto px-4 flex flex-col items-center gap-3">
          <p className="font-serif font-bold text-slate-900 text-sm">{restaurant.name}</p>
          <div className="flex items-center gap-2 text-slate-400">
            <span className="text-[11px] font-medium text-slate-400">Digital menu powered by</span>
            <BrandLogo size="sm" />
          </div>
        </div>
      </footer>

    </div>
  );
}
