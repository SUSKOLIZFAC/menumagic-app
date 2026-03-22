import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, getDocs, addDoc, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { digitizeMenuImage } from '../services/geminiService';
import { QRCodeSVG } from 'qrcode.react';
import { Plus, Upload, QrCode, LogOut, Loader2, Edit2, X, Utensils, Image as ImageIcon, ChevronRight, Store, ExternalLink, Trash2, Search } from 'lucide-react';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<any | null>(null);
  const [menu, setMenu] = useState<any | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newRestaurantName, setNewRestaurantName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<{catIdx: number, itemIdx: number, data: any} | null>(null);

  const handleItemImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
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
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setEditingItem(prev => prev ? { ...prev, data: { ...prev.data, imageUrl: dataUrl } } : null);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveItem = async () => {
    if (!editingItem || !menu || !selectedRestaurant) return;
    
    const newMenu = { ...menu };
    newMenu.categories[editingItem.catIdx].items[editingItem.itemIdx] = editingItem.data;
    
    try {
      await setDoc(doc(db, 'menus', selectedRestaurant.id), newMenu);
      setMenu(newMenu);
      setEditingItem(null);
    } catch (error) {
      console.error("Error updating menu", error);
      alert("Failed to update item.");
    }
  };

  const handleDeleteItem = async (catIdx: number, itemIdx: number) => {
    if (!menu || !selectedRestaurant) return;
    if (!window.confirm("Are you sure you want to delete this item?")) return;

    const newMenu = { ...menu };
    newMenu.categories[catIdx].items.splice(itemIdx, 1);
    
    // If category is empty, maybe remove it? Let's keep it simple for now.
    
    try {
      await setDoc(doc(db, 'menus', selectedRestaurant.id), newMenu);
      setMenu(newMenu);
    } catch (error) {
      console.error("Error deleting item", error);
      alert("Failed to delete item.");
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

  useEffect(() => {
    if (user) {
      fetchRestaurants();
    }
  }, [user]);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'restaurants'), where('ownerId', '==', user?.uid));
      const querySnapshot = await getDocs(q);
      const rests = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRestaurants(rests);
      if (rests.length > 0 && !selectedRestaurant) {
        handleSelectRestaurant(rests[0]);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'restaurants');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRestaurantName.trim()) return;
    
    try {
      setLoading(true);
      const docRef = await addDoc(collection(db, 'restaurants'), {
        name: newRestaurantName,
        ownerId: user?.uid,
        createdAt: new Date().toISOString()
      });
      setNewRestaurantName('');
      await fetchRestaurants();
      handleSelectRestaurant({ id: docRef.id, name: newRestaurantName, ownerId: user?.uid });
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
        setMenu({ id: menuDoc.id, ...menuDoc.data() });
      } else {
        setMenu(null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `menus/${restaurant.id}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedRestaurant) return;

    try {
      setUploading(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        const mimeType = file.type;
        
        // Call Gemini
        const digitizedMenu = await digitizeMenuImage(base64String, mimeType);
        
        // Save to Firestore
        const menuData = {
          restaurantId: selectedRestaurant.id,
          categories: digitizedMenu.categories || [],
          updatedAt: new Date().toISOString()
        };
        
        await setDoc(doc(db, 'menus', selectedRestaurant.id), menuData);
        setMenu({ id: selectedRestaurant.id, ...menuData });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error processing menu:", error);
      alert("Failed to digitize menu. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const menuUrl = `${(import.meta as any).env.VITE_APP_URL || window.location.origin}/menu/${selectedRestaurant?.id}`;

  const filteredCategories = menu?.categories.map((category: any, catIdx: number) => ({
    ...category,
    originalIdx: catIdx,
    items: category.items.map((item: any, itemIdx: number) => ({ ...item, originalIdx: itemIdx })).filter((item: any) => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  })).filter((category: any) => category.items.length > 0) || [];

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900 selection:bg-indigo-500/30">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3 text-slate-900 font-extrabold text-2xl tracking-tight">
          <div className="bg-indigo-600 p-2 rounded-xl shadow-sm">
            <QrCode className="w-6 h-6 text-white" />
          </div>
          <span>MenuMagic<span className="text-indigo-600">.</span></span>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Locations</h3>
            <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">{restaurants.length}</span>
          </div>
          
          <div className="space-y-2">
            {restaurants.map(rest => (
              <button
                key={rest.id}
                onClick={() => handleSelectRestaurant(rest)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  selectedRestaurant?.id === rest.id 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 translate-x-1' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Store className={`w-4 h-4 ${selectedRestaurant?.id === rest.id ? 'text-indigo-200' : 'text-slate-400'}`} />
                <span className="truncate">{rest.name}</span>
                {selectedRestaurant?.id === rest.id && <ChevronRight className="w-4 h-4 ml-auto opacity-70" />}
              </button>
            ))}
          </div>

          <form onSubmit={handleCreateRestaurant} className="mt-8">
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
          {selectedRestaurant ? (
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
                  <p className="text-slate-500 text-lg font-medium max-w-xl">Manage your digital menu, update items in real-time, and download your custom QR codes.</p>
                </div>
                
                <div className="flex gap-3 flex-wrap">
                  <a 
                    href={menuUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Preview Menu
                  </a>
                  <div>
                    <input
                      type="file"
                      id="menu-upload-header"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                    <label 
                      htmlFor="menu-upload-header"
                      className={`inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold cursor-pointer hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 ${uploading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {uploading ? 'Digitizing AI...' : 'Upload New Menu'}
                    </label>
                  </div>
                  <button 
                    onClick={handleDeleteRestaurant}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-bold hover:bg-red-100 hover:border-red-300 transition-all shadow-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>

              <div className="grid lg:grid-cols-3 gap-8">
                {/* Menu Management */}
                <div className="lg:col-span-2 space-y-8">
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
                                <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent"></div>
                                <span className="bg-white text-indigo-600 text-xs font-bold px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">{category.items.length} Items</span>
                              </div>
                              
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
                                        <img 
                                          src={item.imageUrl} 
                                          alt={item.name} 
                                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                          referrerPolicy="no-referrer"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                                        <div className="absolute bottom-4 left-5">
                                          <span className="font-bold text-white bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-lg text-sm border border-white/20 shadow-sm">${item.price.toFixed(2)}</span>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="pt-6 px-6 pb-0 flex justify-end">
                                        <span className="font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg text-sm border border-indigo-100">${item.price.toFixed(2)}</span>
                                      </div>
                                    )}
                                    
                                    <div className="p-6 flex-1 flex flex-col">
                                      <h4 className="font-bold text-slate-900 text-xl leading-tight mb-2 pr-4">{item.name}</h4>
                                      {item.description && <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">{item.description}</p>}
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
                      <input
                        type="file"
                        id="menu-upload-empty"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={uploading}
                      />
                      <label 
                        htmlFor="menu-upload-empty"
                        className={`inline-flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg cursor-pointer hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 hover:-translate-y-1 ${uploading ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                        {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                        {uploading ? 'Processing with AI...' : 'Upload Menu Image'}
                      </label>
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
                      <QRCodeSVG value={menuUrl} size={180} level="H" className="mx-auto" />
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
                          // Simple print functionality
                          const printWindow = window.open('', '_blank');
                          if (printWindow) {
                            printWindow.document.write(`
                              <html>
                                <head><title>Print QR Code</title></head>
                                <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;">
                                  <h1 style="margin-bottom:2rem;">Scan for Menu</h1>
                                  <div id="qr-container"></div>
                                  <h2 style="margin-top:2rem;">${selectedRestaurant.name}</h2>
                                  <script>
                                    document.getElementById('qr-container').innerHTML = '${document.querySelector('.bg-slate-50.p-6 svg')?.outerHTML}';
                                    window.print();
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
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome to MenuMagic</h2>
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
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Price ($)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
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
                    <img src={editingItem.data.imageUrl} alt="Preview" className="w-20 h-20 object-cover rounded-lg shadow-sm" />
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
                  onClick={handleSaveItem}
                  className="flex-[2] bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
