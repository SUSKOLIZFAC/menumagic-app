import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { ImageDisplay } from '../components/ImageDisplay';
import { UtensilsCrossed, Utensils, Search, X, Instagram, Phone, Globe, ChevronRight, Share2, Sparkles, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function RestaurantMenu() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [menu, setMenu] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [currentLang, setCurrentLang] = useState('en');
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  const languages = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
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
      fetchData();
    }
  }, [restaurantId]);

  const fetchData = async () => {
    try {
      let actualRestaurantId = restaurantId!;
      let restData = null;

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
        setRestaurant(restData);
        try { localStorage.setItem(`cached_restaurant_${restaurantId}`, JSON.stringify(restData)); } catch (_) {}
        const menuDoc = await getDoc(doc(db, 'menus', actualRestaurantId));
        if (menuDoc.exists()) {
          const menuData: any = { id: menuDoc.id, ...menuDoc.data() };
          setMenu(menuData);
          try { localStorage.setItem(`cached_menu_${actualRestaurantId}`, JSON.stringify(menuData)); } catch (_) {}
          if (menuData.categories && menuData.categories.length > 0) {
            setActiveCategory('All');
          }
        }
      }
    } catch (error) {
      console.warn("Could not fetch menu from Firestore:", error);
      handleFirestoreError(error, OperationType.GET, `menus/${restaurantId}`);
      try {
        const cachedRest = localStorage.getItem(`cached_restaurant_${restaurantId}`);
        const cachedMenu = localStorage.getItem(`cached_menu_${restaurantId}`);
        if (cachedRest) setRestaurant(JSON.parse(cachedRest));
        if (cachedMenu) {
          const parsed = JSON.parse(cachedMenu);
          setMenu(parsed);
          if (parsed.categories && parsed.categories.length > 0) {
            setActiveCategory('All');
          }
        }
      } catch (_) {}
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white text-slate-900">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 border-2 border-slate-100 border-t-[#D4A017] rounded-full animate-spin"></div>
          <div className="absolute w-8 h-8 rounded-full bg-[#D4A017]/10 flex items-center justify-center">
            <UtensilsCrossed className="w-4 h-4 text-[#D4A017]" />
          </div>
        </div>
        <p className="font-serif italic tracking-widest text-xs uppercase text-slate-400 mt-6">Crafting digital menu...</p>
      </div>
    );
  }

  if (!menu || !restaurant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 text-center text-slate-900">
        <div className="w-20 h-20 bg-[#F8F8F8] rounded-full flex items-center justify-center mb-6 text-slate-400">
          <UtensilsCrossed className="w-8 h-8" strokeWidth={1.5} />
        </div>
        <h1 className="text-2xl font-serif font-bold tracking-tight mb-2 text-slate-900">Menu Unavailable</h1>
        <p className="text-slate-500 max-w-sm text-sm leading-relaxed mb-6">
          This restaurant is currently updating their culinary offering. Please check back in a few moments.
        </p>
      </div>
    );
  }

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

  const rawWhatsapp = restaurant.whatsappNumber || restaurant.whatsapp || restaurant.phoneNumber || restaurant.phone || '';
  const cleanWhatsapp = rawWhatsapp.replace(/[^0-9]/g, '');
  const whatsappLink = cleanWhatsapp 
    ? `https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(`Hello ${restaurant.name}! I am viewing your menu and would like to contact you.`)}`
    : null;

  const defaultCoverUrl = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80";
  const coverImage = restaurant.coverImageUrl || defaultCoverUrl;

  return (
    <div className="min-h-screen bg-white text-[#1F2937] font-sans antialiased selection:bg-[#D4A017]/20 selection:text-[#1F2937] pb-24">
      <div id="google_translate_element" className="opacity-0 absolute pointer-events-none"></div>

      {/* Hero Cover Header */}
      <div className="relative w-full h-56 sm:h-72 md:h-80 overflow-hidden bg-slate-100">
        <ImageDisplay 
          src={coverImage} 
          alt={restaurant.name} 
          className="w-full h-full object-cover"
        />
        {/* Soft natural top bar overlay for UI contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/10 pointer-events-none" />

        {/* Floating Language Switcher */}
        <div className="absolute top-4 right-4 z-40">
          <div className="relative">
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-white/90 backdrop-blur-md border border-white/60 rounded-full shadow-md text-xs font-bold text-slate-800 hover:bg-white transition-all active:scale-95"
            >
              <Globe className="w-3.5 h-3.5 text-[#D4A017]" />
              <span className="uppercase tracking-wider">{currentLang}</span>
            </button>

            <AnimatePresence>
              {showLangMenu && (
                <motion.div 
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute right-0 mt-2 w-40 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden py-1 z-50"
                >
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => changeLanguage(lang.code)}
                      className={`w-full text-left px-4 py-2.5 text-xs flex items-center gap-2.5 hover:bg-slate-50 transition-colors ${
                        currentLang === lang.code ? 'text-[#D4A017] font-bold bg-[#D4A017]/10' : 'text-slate-700 font-medium'
                      }`}
                    >
                      <span className="text-base">{lang.flag}</span>
                      {lang.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Floating White Information Card */}
      <div className="relative z-20 max-w-3xl mx-auto px-4 -mt-16 sm:-mt-20 mb-8">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.06)] border border-[#ECECEC] text-center flex flex-col items-center relative">
          
          {/* Restaurant Logo / Avatar Badge */}
          {restaurant.imageUrl ? (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 border-white shadow-lg -mt-16 sm:-mt-20 mb-4 overflow-hidden bg-white shrink-0 relative">
              <ImageDisplay 
                src={restaurant.imageUrl} 
                alt={restaurant.name} 
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-4 border-white shadow-md -mt-14 sm:-mt-18 mb-4 bg-slate-900 text-[#D4A017] flex items-center justify-center shrink-0">
              <Utensils className="w-8 h-8" />
            </div>
          )}

          {/* Restaurant Title */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-[#1F2937] tracking-tight mb-2">
            {restaurant.name}
          </h1>

          {/* Description */}
          {restaurant.description && (
            <p className="text-slate-500 text-xs sm:text-sm font-normal max-w-lg leading-relaxed mb-5">
              {restaurant.description}
            </p>
          )}

          {/* Restaurant Contact Actions */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
            {whatsappLink && (
              <a 
                href={whatsappLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-[#25D366]/20 hover:shadow-lg hover:-translate-y-0.5 active:scale-95"
              >
                <WhatsAppIcon className="w-4 h-4 fill-white" />
                <span>Contact WhatsApp</span>
              </a>
            )}

            {restaurant.phoneNumber && (
              <a 
                href={`tel:${restaurant.phoneNumber}`} 
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-[#F8F8F8] hover:bg-slate-200/70 text-[#1F2937] font-semibold text-xs sm:text-sm transition-colors border border-slate-200/60"
                title="Call Restaurant"
              >
                <Phone className="w-3.5 h-3.5 text-slate-600" />
                <span>{restaurant.phoneNumber}</span>
              </a>
            )}

            {restaurant.instagramUrl && (
              <a 
                href={restaurant.instagramUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center w-9 h-9 rounded-full bg-[#F8F8F8] text-slate-600 hover:text-pink-600 hover:bg-pink-50 transition-colors border border-slate-200/60"
                title="Instagram"
              >
                <Instagram className="w-4.5 h-4.5" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Navigation & Search */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md py-3 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border-b border-[#ECECEC] transition-all">
        <div className="max-w-3xl mx-auto px-4">
          
          {/* Search Field */}
          <div className="relative mb-3">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search dishes, drinks, desserts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F8F8F8] border border-slate-200/80 rounded-full py-3 pl-11 pr-10 text-[#1F2937] placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#D4A017] focus:ring-2 focus:ring-[#D4A017]/20 transition-all font-medium text-sm shadow-inner/none"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-900 transition-colors bg-slate-200/60 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          {!searchQuery && menu?.categories?.length > 0 && (
            <div className="flex overflow-x-auto hide-scrollbar gap-2 py-1 snap-x">
              <button
                onClick={() => setActiveCategory('All')}
                className={`snap-start whitespace-nowrap px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-300 ${
                  activeCategory === 'All' 
                    ? 'bg-[#D4A017] text-white shadow-md shadow-[#D4A017]/20 scale-[1.02]' 
                    : 'bg-[#F8F8F8] text-slate-600 border border-slate-200/60 hover:bg-slate-100'
                }`}
              >
                All Items
              </button>
              {menu.categories.map((cat: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setActiveCategory(cat.name)}
                  className={`snap-start whitespace-nowrap px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-300 ${
                    activeCategory === cat.name 
                      ? 'bg-[#D4A017] text-white shadow-md shadow-[#D4A017]/20 scale-[1.02]' 
                      : 'bg-[#F8F8F8] text-slate-600 border border-slate-200/60 hover:bg-slate-100'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Menu Content */}
      <main className="max-w-3xl mx-auto px-4 pt-6">
        {displayCategories.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-[#ECECEC] p-8 shadow-sm">
            <div className="w-12 h-12 bg-[#F8F8F8] rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Search className="w-6 h-6" />
            </div>
            <p className="text-base font-bold text-[#1F2937] mb-1">No items found</p>
            <p className="text-xs text-slate-400 mb-5">We couldn't find any dishes matching "{searchQuery}"</p>
            <button
              onClick={() => setSearchQuery('')}
              className="px-5 py-2 bg-[#1F2937] text-white rounded-full text-xs font-semibold hover:bg-[#D4A017] transition-colors shadow-sm"
            >
              Reset Search
            </button>
          </div>
        ) : (
          <div className="space-y-10">
            {displayCategories.map((category: any, idx: number) => (
              <section key={idx} className="scroll-mt-36">
                
                {/* Category Header */}
                {!searchQuery && category.imageUrl ? (
                  <div className="relative w-full h-36 sm:h-48 rounded-2xl sm:rounded-3xl overflow-hidden mb-5 shadow-sm border border-[#ECECEC]">
                    <ImageDisplay 
                      src={category.imageUrl} 
                      alt={category.name} 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"></div>
                    <div className="absolute bottom-4 left-5 right-5 flex items-baseline justify-between">
                      <h2 className="text-xl sm:text-2xl font-serif font-bold text-white tracking-wide">{category.name}</h2>
                      <span className="text-xs text-white/80 font-medium">{category.items?.length || 0} items</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 mb-4 pb-2 border-b border-[#ECECEC]">
                    <div className="w-1.5 h-5 bg-[#D4A017] rounded-full" />
                    <h2 className="text-lg sm:text-xl font-serif font-bold text-[#1F2937] tracking-tight">
                      {category.name}
                    </h2>
                    <span className="text-xs text-slate-400 font-normal ml-auto">({category.items?.length})</span>
                  </div>
                )}
                
                {/* Items Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
                  {category.items.map((item: any, i: number) => (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.2) }}
                      onClick={() => setSelectedItem(item)}
                      className="group bg-white border border-[#ECECEC] rounded-2xl p-3.5 sm:p-4 shadow-[0_2px_15px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.06)] hover:border-[#D4A017]/40 transition-all duration-300 flex flex-row items-stretch justify-between gap-3.5 cursor-pointer relative overflow-hidden"
                    >
                      {/* Left Info Column */}
                      <div className="flex-1 flex flex-col justify-between py-0.5">
                        <div>
                          <h3 className="text-sm sm:text-base font-bold text-[#1F2937] leading-snug group-hover:text-[#D4A017] transition-colors mb-1">
                            {item.name}
                          </h3>
                          
                          {item.description && (
                            <p className="text-slate-500 font-normal text-xs leading-relaxed line-clamp-2 mb-2">
                              {item.description}
                            </p>
                          )}
                        </div>
                        
                        <div className="mt-2 flex items-baseline gap-1">
                          <span className="text-[#D4A017] font-extrabold text-base sm:text-lg">
                            {(item.price || 0).toFixed(2)}
                          </span>
                          <span className="text-slate-400 text-[11px] font-semibold uppercase">DH</span>
                        </div>
                      </div>

                      {/* Right Image Thumbnail */}
                      {item.imageUrl && (
                        <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl sm:rounded-2xl overflow-hidden bg-[#F8F8F8] shrink-0 shadow-sm">
                          <ImageDisplay 
                            src={item.imageUrl} 
                            alt={item.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                          />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* Item Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col relative"
            >
              {/* Close Button */}
              <button 
                onClick={() => setSelectedItem(null)}
                className="absolute top-3 right-3 z-20 p-2 bg-white/80 backdrop-blur-md rounded-full shadow-md text-slate-700 hover:text-slate-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Image Header */}
              {selectedItem.imageUrl && (
                <div className="w-full h-56 sm:h-64 relative bg-slate-100 shrink-0">
                  <ImageDisplay 
                    src={selectedItem.imageUrl} 
                    alt={selectedItem.name} 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#1F2937]">
                    {selectedItem.name}
                  </h3>
                  <div className="text-right shrink-0">
                    <span className="text-xl font-extrabold text-[#D4A017]">
                      {(selectedItem.price || 0).toFixed(2)}
                    </span>
                    <span className="text-xs font-bold text-slate-400 ml-1">DH</span>
                  </div>
                </div>

                {selectedItem.description ? (
                  <p className="text-slate-600 text-sm leading-relaxed mb-6">
                    {selectedItem.description}
                  </p>
                ) : (
                  <p className="text-slate-400 italic text-xs mb-6">No additional description available.</p>
                )}

                {/* Quick Inquiry via WhatsApp */}
                {whatsappLink && (
                  <a
                    href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(`Hello ${restaurant.name}! I would like to inquire about ordering "${selectedItem.name}".`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3.5 px-4 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-full font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-[#25D366]/20 transition-all active:scale-95"
                  >
                    <WhatsAppIcon className="w-5 h-5 fill-white" />
                    <span>Inquire via WhatsApp</span>
                  </a>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Footer */}
      <footer className="mt-20 pb-10 flex flex-col items-center justify-center gap-4 text-center">
        <div className="inline-flex items-center justify-center gap-2.5 px-5 py-2.5 border border-[#ECECEC] rounded-full bg-white shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Digital Menu By</span>
          <span className="font-serif text-[#1F2937] tracking-wide font-bold text-sm">Onemenu.</span>
        </div>
        {restaurant.instagramUrl && (
          <a 
            href={restaurant.instagramUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-pink-600 transition-colors"
          >
            <Instagram className="w-5 h-5" />
          </a>
        )}
      </footer>

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}

function WhatsAppIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.119.554 4.108 1.523 5.833L0 24l6.342-1.498A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.848 0-3.585-.49-5.091-1.344l-.365-.207-3.774.891.916-3.684-.235-.383A9.958 9.958 0 0 1 2 12c0-5.514 4.486-10 10-10s10 4.486 10 10-4.486 10-10 10z"/>
    </svg>
  );
}

