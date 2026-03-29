import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { UtensilsCrossed, Search, X, ChefHat, Coffee, Wine, Utensils, Image as ImageIcon, ChevronRight, Instagram, Phone, Globe } from 'lucide-react';

export default function RestaurantMenu() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [menu, setMenu] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [currentLang, setCurrentLang] = useState('en');

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
    
    // Method 1: Try to change it instantly without reloading (works best on mobile)
    const select = document.querySelector('.goog-te-combo') as HTMLSelectElement;
    if (select) {
      select.value = langCode;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      
      // If switching back to English, we might need to clear cookies and reload 
      // if the instant method doesn't fully reset it
      if (langCode === 'en') {
        setTimeout(() => {
          document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + window.location.hostname;
          window.location.reload();
        }, 500);
      }
      return;
    }

    // Method 2: Fallback if the Google Translate widget hasn't loaded yet
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
        const menuDoc = await getDoc(doc(db, 'menus', actualRestaurantId));
        if (menuDoc.exists()) {
          const menuData: any = { id: menuDoc.id, ...menuDoc.data() };
          setMenu(menuData);
          if (menuData.categories && menuData.categories.length > 0) {
            setActiveCategory('All');
          }
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `menus/${restaurantId}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA] text-slate-900">
        <div className="w-16 h-16 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin mb-6"></div>
        <p className="font-serif italic tracking-widest text-sm text-slate-500">Curating your experience...</p>
      </div>
    );
  }

  if (!menu || !restaurant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA] p-6 text-center text-slate-900">
        <UtensilsCrossed className="w-12 h-12 mb-6 opacity-30" strokeWidth={1} />
        <h1 className="text-3xl font-serif tracking-tight mb-3">Menu Unavailable</h1>
        <p className="opacity-50 max-w-md font-light text-slate-600">This restaurant is currently updating their digital experience. Please check back shortly.</p>
      </div>
    );
  }

  const filteredCategories = menu.categories.map((cat: any) => ({
    ...cat,
    items: cat.items.filter((item: any) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  })).filter((cat: any) => cat.items.length > 0);

  // If searching, we don't use active category filtering
  const displayCategories = searchQuery 
    ? filteredCategories 
    : (activeCategory === 'All' 
        ? filteredCategories 
        : filteredCategories.filter((c: any) => c.name === activeCategory));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-slate-200 pb-24">
      <div id="google_translate_element" className="opacity-0 absolute pointer-events-none"></div>
      
      {/* Hero Header */}
      <header className="relative pt-12 pb-8 px-4 flex flex-col items-center justify-center min-h-[25vh] overflow-hidden bg-white border-b border-slate-100">
        
        {/* Language Switcher */}
        <div className="absolute top-4 right-4 z-50">
          <div className="relative">
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center gap-2 px-3 py-2 bg-white/80 backdrop-blur-md border border-slate-200 rounded-full shadow-sm text-sm font-medium text-slate-700 hover:bg-white transition-colors"
            >
              <Globe className="w-4 h-4" />
              <span className="uppercase">{currentLang}</span>
            </button>
            
            {showLangMenu && (
              <div className="absolute right-0 mt-2 w-40 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden py-1 animate-in fade-in slide-in-from-top-2">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => changeLanguage(lang.code)}
                    className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 hover:bg-slate-50 transition-colors ${
                      currentLang === lang.code ? 'text-indigo-600 font-bold bg-indigo-50/50' : 'text-slate-700 font-medium'
                    }`}
                  >
                    <span className="text-lg">{lang.flag}</span>
                    {lang.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Atmospheric Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-50/60 blur-[100px] rounded-full pointer-events-none"></div>
        </div>

        <div className="relative z-20 text-center max-w-3xl mx-auto mt-auto">
          <h2 className="text-[10px] font-bold tracking-[0.3em] text-slate-400 uppercase mb-3">Welcome To</h2>
          <h1 className="text-6xl md:text-7xl font-serif font-bold tracking-tight mb-4 leading-tight text-slate-900">
            {restaurant.name}
          </h1>
          {restaurant.description && (
            <p className="text-slate-500 text-sm md:text-base font-medium max-w-md mx-auto leading-relaxed px-4 mb-6">
              {restaurant.description}
            </p>
          )}
          
          {(restaurant.instagramUrl || restaurant.phoneNumber) && (
            <div className="flex items-center justify-center gap-4 mt-2">
              {restaurant.instagramUrl && (
                <a 
                  href={restaurant.instagramUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-50 text-slate-600 hover:text-pink-600 hover:bg-pink-50 transition-colors border border-slate-100 shadow-sm"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              )}
              {restaurant.phoneNumber && (
                <a 
                  href={`tel:${restaurant.phoneNumber}`} 
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-50 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors border border-slate-100 shadow-sm"
                >
                  <Phone className="w-5 h-5" />
                </a>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Sticky Navigation & Search */}
      <div className="sticky top-0 z-40 bg-slate-50/90 backdrop-blur-xl pt-4 pb-2 mb-6 shadow-sm border-b border-slate-200/50">
        <div className="max-w-3xl mx-auto px-4">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search dishes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-12 pr-12 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-base shadow-sm"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-900 transition-colors bg-slate-100 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Tabs (Only show if not searching) */}
          {!searchQuery && menu.categories.length > 1 && (
            <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-2 snap-x">
              <button
                onClick={() => setActiveCategory('All')}
                className={`snap-start whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                  activeCategory === 'All' 
                    ? 'bg-slate-900 text-white shadow-md' 
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                All
              </button>
              {menu.categories.map((cat: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setActiveCategory(cat.name)}
                  className={`snap-start whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                    activeCategory === cat.name 
                      ? 'bg-slate-900 text-white shadow-md' 
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Menu Content */}
      <main className="relative z-10 max-w-3xl mx-auto px-4">
        {filteredCategories.length === 0 ? (
          <div className="text-center py-20">
            <Search className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-lg text-slate-400 font-medium">No dishes found</p>
          </div>
        ) : (
          <div className="space-y-10">
            {displayCategories.map((category: any, idx: number) => (
              <section key={idx} className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                {(searchQuery || (!category.imageUrl && activeCategory === 'All')) && (
                  <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-200">
                    {category.name}
                  </h2>
                )}
                
                {!searchQuery && category.imageUrl && (
                  <div className="w-full h-48 md:h-64 rounded-3xl overflow-hidden mb-6 relative shadow-sm border border-slate-100">
                    <img 
                      src={category.imageUrl} 
                      alt={category.name} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                    <div className="absolute bottom-4 left-6">
                      <h2 className="text-2xl font-bold text-white font-serif tracking-wide">{category.name}</h2>
                    </div>
                  </div>
                )}
                
                <div className="flex flex-col gap-4">
                  {category.items.map((item: any, i: number) => (
                    <div 
                      key={i} 
                      className="group flex flex-row bg-white border border-slate-100 rounded-2xl overflow-hidden hover:border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 p-3 gap-4"
                    >
                      {/* Content Section */}
                      <div className="flex-1 flex flex-col justify-center py-1">
                        <h3 className="text-base md:text-lg font-bold text-slate-900 leading-tight mb-1">
                          {item.name}
                        </h3>
                        
                        {item.description && (
                          <p className="text-slate-500 font-normal leading-snug text-sm line-clamp-2 mb-3">
                            {item.description}
                          </p>
                        )}
                        
                        <div className="mt-auto">
                          <span className="text-slate-900 font-bold">
                            {(item.price || 0).toFixed(2)} <span className="text-slate-500 text-xs font-semibold ml-0.5">DH</span>
                          </span>
                        </div>
                      </div>

                      {/* Image Section */}
                      {item.imageUrl && (
                        <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-xl overflow-hidden bg-slate-50 shrink-0">
                          <img 
                            src={item.imageUrl} 
                            alt={item.name} 
                            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="mt-32 pb-12 flex flex-col items-center justify-center gap-6">
        <div className="inline-flex items-center justify-center gap-3 px-6 py-3 border border-slate-200 rounded-full bg-white shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Digital Menu By</span>
          <span className="font-serif text-slate-900 tracking-wide font-medium">Onemenu.</span>
        </div>
        <a 
          href="https://www.instagram.com/onemenu.app/?utm_source=ig_web_button_share_sheet" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-slate-400 hover:text-pink-600 transition-colors"
        >
          <Instagram className="w-6 h-6" />
        </a>
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
