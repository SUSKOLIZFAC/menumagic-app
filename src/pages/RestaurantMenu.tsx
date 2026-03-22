import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
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
      const restDoc = await getDoc(doc(db, 'restaurants', restaurantId!));
      if (restDoc.exists()) setRestaurant({ id: restDoc.id, ...restDoc.data() });

      const menuDoc = await getDoc(doc(db, 'menus', restaurantId!));
      if (menuDoc.exists()) {
        const menuData = { id: menuDoc.id, ...menuDoc.data() };
        setMenu(menuData);
        if (menuData.categories && menuData.categories.length > 0) {
          setActiveCategory(menuData.categories[0].name);
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] text-white">
        <div className="w-16 h-16 border-2 border-white/20 border-t-white rounded-full animate-spin mb-6"></div>
        <p className="font-serif italic tracking-widest text-sm text-white/60">Curating your experience...</p>
      </div>
    );
  }

  if (!menu || !restaurant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] p-6 text-center text-white">
        <UtensilsCrossed className="w-12 h-12 mb-6 opacity-30" strokeWidth={1} />
        <h1 className="text-3xl font-serif tracking-tight mb-3">Menu Unavailable</h1>
        <p className="opacity-50 max-w-md font-light">This restaurant is currently updating their digital experience. Please check back shortly.</p>
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
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] font-sans selection:bg-white/20 pb-24">
      
      {/* Hero Header */}
      <header className="relative pt-20 pb-12 px-6 flex flex-col items-center justify-center min-h-[40vh] overflow-hidden">
        {/* Atmospheric Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] opacity-80 z-10"></div>
          {/* If the restaurant had a cover image, it would go here. Using a subtle pattern instead. */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-white/5 blur-[120px] rounded-full pointer-events-none"></div>
        </div>

        <div className="relative z-20 text-center max-w-3xl mx-auto mt-auto">
          <h2 className="text-[10px] font-bold tracking-[0.4em] text-white/40 uppercase mb-6">Welcome To</h2>
          <h1 className="text-5xl md:text-7xl font-serif font-light tracking-tight mb-6 leading-tight">
            {restaurant.name}
          </h1>
          {restaurant.description && (
            <p className="text-white/60 text-lg md:text-xl font-light max-w-xl mx-auto leading-relaxed">
              {restaurant.description}
            </p>
          )}
        </div>
      </header>

      {/* Sticky Navigation & Search */}
      <div className="sticky top-0 z-40 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5 pt-4 pb-0 mb-12">
        <div className="max-w-5xl mx-auto px-6">
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
            <input
              type="text"
              placeholder="Search for a dish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-12 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all font-light"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-white/30 hover:text-white transition-colors"
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
                      ? 'text-white font-medium' 
                      : 'text-white/40 hover:text-white/70 font-light'
                  }`}
                >
                  {cat.name}
                  {activeCategory === cat.name && (
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-white rounded-t-full"></span>
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
            <Search className="w-12 h-12 text-white/10 mx-auto mb-6" />
            <p className="text-xl text-white/40 font-light">No dishes found matching "{searchQuery}"</p>
          </div>
        ) : (
          <div className="space-y-24">
            {displayCategories.map((category: any, idx: number) => (
              <section key={idx} className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
                {searchQuery && (
                  <h2 className="text-2xl font-serif text-white mb-8 pb-4 border-b border-white/10">
                    {category.name}
                  </h2>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                  {category.items.map((item: any, i: number) => (
                    <div 
                      key={i} 
                      className="group flex flex-col bg-white/[0.02] border border-white/[0.05] rounded-3xl overflow-hidden hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-500"
                    >
                      {/* Image Section - Large and Premium */}
                      <div className="relative w-full aspect-[4/3] sm:aspect-[16/9] overflow-hidden bg-[#111]">
                        {item.imageUrl ? (
                          <img 
                            src={item.imageUrl} 
                            alt={item.name} 
                            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-1000 ease-out"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-white/5 to-transparent">
                            <ImageIcon className="w-12 h-12 text-white/10" strokeWidth={1} />
                          </div>
                        )}
                        
                        {/* Price Tag Overlay */}
                        <div className="absolute top-4 right-4 z-10">
                          <div className="bg-black/40 backdrop-blur-md border border-white/10 text-white px-4 py-2 rounded-full font-medium tracking-wide shadow-2xl">
                            {(item.price || 0).toFixed(2)} <span className="text-white/50 text-sm">DH</span>
                          </div>
                        </div>
                        
                        {/* Gradient Overlay for text readability if we put text over image, but we're putting it below */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-50"></div>
                      </div>
                      
                      {/* Content Section */}
                      <div className="p-6 md:p-8 flex-1 flex flex-col">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <h3 className="text-xl md:text-2xl font-serif text-white leading-tight">
                            {item.name}
                          </h3>
                        </div>
                        
                        {item.description && (
                          <p className="text-white/50 font-light leading-relaxed text-sm md:text-base mt-auto">
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
        <div className="inline-flex items-center justify-center gap-3 px-6 py-3 border border-white/10 rounded-full bg-white/5 backdrop-blur-sm">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Digital Menu By</span>
          <span className="font-serif text-white tracking-wide">Onemenu.</span>
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
