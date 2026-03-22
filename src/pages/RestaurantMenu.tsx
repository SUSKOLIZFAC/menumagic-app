import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { UtensilsCrossed, Search, X, ChefHat } from 'lucide-react';

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
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-400">
        <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="font-medium tracking-widest uppercase text-sm">Preparing Menu</p>
      </div>
    );
  }

  if (!menu || !restaurant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="w-24 h-24 bg-white rounded-full shadow-sm flex items-center justify-center mb-6">
          <UtensilsCrossed className="w-10 h-10 text-slate-300" />
        </div>
        <h1 className="text-3xl font-bold text-slate-800 mb-3">Menu Unavailable</h1>
        <p className="text-slate-500 max-w-md">This restaurant hasn't set up their digital menu yet. Please check back later.</p>
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
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-500/30 relative overflow-hidden">
      {/* Fixed Background Graphics */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(#000 2px, transparent 2px)', backgroundSize: '32px 32px' }}></div>
      </div>

      {/* Hero Section */}
      <header className="relative z-10 bg-slate-900 text-white pt-24 pb-32 px-6 text-center rounded-b-[3rem] shadow-2xl overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-500"></div>
        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
          <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-8 border border-white/20 shadow-xl">
            <ChefHat className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70">
            {restaurant.name}
          </h1>
          {restaurant.description && (
            <p className="text-lg md:text-xl text-slate-300 font-medium max-w-2xl mx-auto leading-relaxed">
              {restaurant.description}
            </p>
          )}
        </div>
      </header>

      {/* Search Bar - Overlapping Hero */}
      <div className="relative z-20 max-w-2xl mx-auto px-6 -mt-8 mb-16">
        <div className="relative bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-2 flex items-center">
          <Search className="w-6 h-6 text-slate-400 ml-3" />
          <input
            type="text"
            placeholder="Search for dishes, ingredients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none focus:ring-0 text-lg px-4 py-3 text-slate-800 placeholder:text-slate-400 outline-none"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Menu Content */}
      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-32 space-y-16">
        {filteredCategories.length === 0 ? (
          <div className="text-center py-20 bg-white/50 backdrop-blur-sm rounded-3xl border border-slate-200/50">
            <UtensilsCrossed className="w-16 h-16 text-slate-300 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-slate-800 mb-2">No items found</h3>
            <p className="text-slate-500">We couldn't find any dishes matching "{searchQuery}"</p>
            <button 
              onClick={() => setSearchQuery('')}
              className="mt-6 px-6 py-2 bg-indigo-50 text-indigo-600 font-medium rounded-full hover:bg-indigo-100 transition-colors"
            >
              Clear Search
            </button>
          </div>
        ) : (
          filteredCategories.map((category: any, idx: number) => (
            <section key={idx} className="animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: `${idx * 100}ms` }}>
              <div className="flex items-center gap-4 mb-8">
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                  {category.name}
                </h2>
                <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent"></div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                {category.items.map((item: any, i: number) => (
                  <div key={i} className="group bg-white rounded-3xl p-4 flex gap-5 items-start shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-100 transition-all duration-300">
                    {item.imageUrl ? (
                      <div className="w-28 h-28 shrink-0 overflow-hidden rounded-2xl bg-slate-100 relative">
                        <img 
                          src={item.imageUrl} 
                          alt={item.name} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <div className="w-28 h-28 shrink-0 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100">
                        <UtensilsCrossed className="w-8 h-8 text-slate-300" />
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0 py-1">
                      <div className="flex justify-between items-start gap-4 mb-2">
                        <h3 className="text-lg font-bold text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">
                          {item.name}
                        </h3>
                        <span className="text-lg font-bold text-indigo-600 shrink-0 bg-indigo-50 px-3 py-1 rounded-xl">
                          {(item.price || 0).toFixed(2)} DH
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-sm text-slate-500 leading-relaxed line-clamp-3">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </main>
      
      <footer className="relative z-10 pb-12 text-center">
        <div className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/80 backdrop-blur-md rounded-full shadow-sm border border-slate-200/50">
          <span className="text-slate-400 text-sm font-medium">Powered by</span>
          <span className="text-slate-900 font-bold tracking-tight">Onemenu<span className="text-indigo-600">.</span></span>
        </div>
      </footer>
    </div>
  );
}
