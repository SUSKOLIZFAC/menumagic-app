import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { UtensilsCrossed, Search, X, ChefHat, Coffee, Wine, Utensils, Image as ImageIcon, ChevronRight } from 'lucide-react';

export default function RestaurantMenu() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [menu, setMenu] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('');

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
          const menuData = { id: menuDoc.id, ...menuDoc.data() };
          setMenu(menuData);
          if (menuData.categories && menuData.categories.length > 0) {
            setActiveCategory(menuData.categories[0].name);
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
  const displayCategories = searchQuery ? filteredCategories : filteredCategories.filter((c: any) => c.name === activeCategory);

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 font-sans selection:bg-slate-200 pb-24">
      
      {/* Hero Header */}
      <header className="relative pt-20 pb-12 px-6 flex flex-col items-center justify-center min-h-[40vh] overflow-hidden">
        {/* Atmospheric Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-100 to-[#FAFAFA] opacity-80 z-10"></div>
          {/* Subtle pattern */}
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #000 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-100/40 blur-[120px] rounded-full pointer-events-none"></div>
        </div>

        <div className="relative z-20 text-center max-w-3xl mx-auto mt-auto">
          <h2 className="text-[10px] font-bold tracking-[0.4em] text-slate-400 uppercase mb-6">Welcome To</h2>
          <h1 className="text-5xl md:text-7xl font-serif font-light tracking-tight mb-6 leading-tight text-slate-900">
            {restaurant.name}
          </h1>
          {restaurant.description && (
            <p className="text-slate-500 text-lg md:text-xl font-light max-w-xl mx-auto leading-relaxed">
              {restaurant.description}
            </p>
          )}
        </div>
      </header>

      {/* Sticky Navigation & Search */}
      <div className="sticky top-0 z-40 bg-[#FAFAFA]/80 backdrop-blur-xl border-b border-slate-200 pt-4 pb-0 mb-12">
        <div className="max-w-5xl mx-auto px-6">
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search for a dish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-12 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition-all font-light shadow-sm"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Category Tabs (Only show if not searching) */}
          {!searchQuery && menu.categories.length > 1 && (
            <div className="flex overflow-x-auto hide-scrollbar gap-8 pb-4 snap-x">
              {menu.categories.map((cat: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setActiveCategory(cat.name)}
                  className={`snap-start whitespace-nowrap text-sm tracking-[0.2em] uppercase transition-all duration-300 relative pb-2 ${
                    activeCategory === cat.name 
                      ? 'text-slate-900 font-bold' 
                      : 'text-slate-400 hover:text-slate-600 font-medium'
                  }`}
                >
                  {cat.name}
                  {activeCategory === cat.name && (
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-slate-900 rounded-t-full"></span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Menu Content */}
      <main className="relative z-10 max-w-5xl mx-auto px-6">
        {filteredCategories.length === 0 ? (
          <div className="text-center py-32">
            <Search className="w-12 h-12 text-slate-200 mx-auto mb-6" />
            <p className="text-xl text-slate-400 font-light">No dishes found matching "{searchQuery}"</p>
          </div>
        ) : (
          <div className="space-y-24">
            {displayCategories.map((category: any, idx: number) => (
              <section key={idx} className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
                {searchQuery && (
                  <h2 className="text-2xl font-serif text-slate-900 mb-8 pb-4 border-b border-slate-200">
                    {category.name}
                  </h2>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                  {category.items.map((item: any, i: number) => (
                    <div 
                      key={i} 
                      className="group flex flex-col bg-white border border-slate-100 rounded-3xl overflow-hidden hover:border-slate-200 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_10px_30px_rgba(0,0,0,0.06)] transition-all duration-500"
                    >
                      {/* Image Section - Large and Premium */}
                      <div className="relative w-full aspect-[4/3] sm:aspect-[16/9] overflow-hidden bg-slate-50">
                        {item.imageUrl ? (
                          <img 
                            src={item.imageUrl} 
                            alt={item.name} 
                            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-1000 ease-out"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
                            <ImageIcon className="w-12 h-12 text-slate-200" strokeWidth={1} />
                          </div>
                        )}
                        
                        {/* Price Tag Overlay */}
                        <div className="absolute top-4 right-4 z-10">
                          <div className="bg-white/90 backdrop-blur-md border border-slate-200/50 text-slate-900 px-4 py-2 rounded-full font-bold tracking-wide shadow-lg">
                            {(item.price || 0).toFixed(2)} <span className="text-slate-400 text-sm font-medium ml-0.5">DH</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Content Section */}
                      <div className="p-6 md:p-8 flex-1 flex flex-col">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <h3 className="text-xl md:text-2xl font-serif text-slate-900 leading-tight">
                            {item.name}
                          </h3>
                        </div>
                        
                        {item.description && (
                          <p className="text-slate-500 font-light leading-relaxed text-sm md:text-base mt-auto">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="mt-32 pb-12 text-center">
        <div className="inline-flex items-center justify-center gap-3 px-6 py-3 border border-slate-200 rounded-full bg-white shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Digital Menu By</span>
          <span className="font-serif text-slate-900 tracking-wide font-medium">Onemenu.</span>
        </div>
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
