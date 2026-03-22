import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { UtensilsCrossed, Search, X, ChefHat, Coffee, Wine, Utensils } from 'lucide-react';

export default function RestaurantMenu() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [menu, setMenu] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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
      if (menuDoc.exists()) setMenu({ id: menuDoc.id, ...menuDoc.data() });
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `menus/${restaurantId}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFBF7] text-[#0A192F]">
        <div className="w-16 h-16 border-2 border-[#0A192F]/20 border-t-[#0A192F] rounded-full animate-spin mb-4"></div>
        <p className="font-bold tracking-widest uppercase text-sm">Preparing Menu</p>
      </div>
    );
  }

  if (!menu || !restaurant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFBF7] p-6 text-center text-[#0A192F]">
        <UtensilsCrossed className="w-12 h-12 mb-6 opacity-50" strokeWidth={1.5} />
        <h1 className="text-3xl font-black tracking-tight mb-3">Menu Unavailable</h1>
        <p className="opacity-70 max-w-md">This restaurant hasn't set up their digital menu yet. Please check back later.</p>
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

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#0A192F] font-sans selection:bg-[#0A192F]/10 relative">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-[0.03]">
        <ChefHat className="absolute top-20 left-10 w-48 h-48 -rotate-12" strokeWidth={1} />
        <Coffee className="absolute top-40 right-10 w-32 h-32 rotate-12" strokeWidth={1} />
        <Wine className="absolute bottom-40 left-20 w-40 h-40 -rotate-6" strokeWidth={1} />
        <Utensils className="absolute bottom-20 right-20 w-48 h-48 rotate-45" strokeWidth={1} />
      </div>

      {/* Header */}
      <header className="relative z-10 pt-24 pb-12 px-6 text-center max-w-4xl mx-auto">
        <h2 className="text-sm font-bold tracking-[0.3em] opacity-60 uppercase mb-6">{restaurant.name}</h2>
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-8">
          OUR MENU
        </h1>
        {restaurant.description && (
          <p className="text-lg opacity-80 max-w-2xl mx-auto italic">
            {restaurant.description}
          </p>
        )}
      </header>

      {/* Search Bar */}
      <div className="relative z-20 max-w-md mx-auto px-6 mb-16">
        <div className="relative border-b-2 border-[#0A192F] flex items-center pb-2">
          <Search className="w-5 h-5 opacity-50 mr-3" />
          <input
            type="text"
            placeholder="Search the menu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none focus:ring-0 text-lg px-0 py-2 text-[#0A192F] placeholder:text-[#0A192F]/40 outline-none"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="p-2 opacity-50 hover:opacity-100 transition-opacity"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Menu Content */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 lg:px-12 pb-32">
        {filteredCategories.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-xl opacity-60 italic">No dishes found matching "{searchQuery}"</p>
          </div>
        ) : (
          <div className="columns-1 md:columns-2 gap-16 md:gap-24">
            {filteredCategories.map((category: any, idx: number) => (
              <section key={idx} className="mb-16 break-inside-avoid animate-in fade-in duration-700" style={{ animationDelay: `${idx * 100}ms` }}>
                <h2 className="text-2xl md:text-3xl font-black uppercase tracking-widest mb-8 text-center border-y-2 border-[#0A192F] py-4">
                  {category.name}
                </h2>
                
                <div className="space-y-8">
                  {category.items.map((item: any, i: number) => (
                    <div key={i} className="group flex flex-col">
                      <div className="flex items-baseline justify-between gap-4 mb-1">
                        <h3 className="text-lg md:text-xl font-bold uppercase tracking-wide">
                          {item.name}
                        </h3>
                        <div className="flex-1 border-b-2 border-dotted border-[#0A192F]/30 relative -top-2"></div>
                        <span className="text-lg md:text-xl font-bold shrink-0">
                          {(item.price || 0).toFixed(2)}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-sm md:text-base opacity-75 italic leading-relaxed pr-12">
                          {item.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
      
      <footer className="relative z-10 pb-12 text-center">
        <div className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-[#0A192F] rounded-full">
          <span className="text-xs font-bold uppercase tracking-widest opacity-60">Powered by</span>
          <span className="font-black tracking-tight">Onemenu.</span>
        </div>
      </footer>
    </div>
  );
}
