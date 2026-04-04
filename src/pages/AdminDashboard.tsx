import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, getDocs, addDoc, doc, getDoc, setDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { digitizeMenuImage } from '../services/geminiService';
import { QRCodeSVG } from 'qrcode.react';
import { Plus, Upload, QrCode, LogOut, Loader2, Edit2, X, Utensils, Image as ImageIcon, ChevronRight, Store, ExternalLink, Trash2, Search, Users, Mail, Phone, Menu as MenuIcon } from 'lucide-react';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [viewMode, setViewMode] = useState<'restaurants' | 'leads'>('restaurants');
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

  const handleItemImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 150;
        const MAX_HEIGHT = 150;
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
        const dataUrl = canvas.toDataURL('image/jpeg', 0.3);
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

  const handleCategoryImageUpload = (e: React.ChangeEvent<HTMLInputElement>, catIdx: number) => {
    const file = e.target.files?.[0];
    if (!file || !menu || !selectedRestaurant) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 300;
        const MAX_HEIGHT = 300;
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
        const dataUrl = canvas.toDataURL('image/jpeg', 0.3);
        
        const newMenu = { ...menu };
        newMenu.categories[catIdx].imageUrl = dataUrl;
        try {
          await setDoc(doc(db, 'menus', selectedRestaurant.id), newMenu);
          setMenu(newMenu);
        } catch (error) {
          console.error("Error updating category image", error);
          alert("Failed to update category image.");
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
      await setDoc(doc(db, 'menus', selectedRestaurant.id), newMenu);
      setMenu(newMenu);
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
    
    // If category is empty, maybe remove it? Let's keep it simple for now.
    
    try {
      await setDoc(doc(db, 'menus', selectedRestaurant.id), newMenu);
      setMenu(newMenu);
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

  const [componentError, setComponentError] = useState<Error | null>(null);

  useEffect(() => {
    if (componentError) {
      throw componentError;
    }
  }, [componentError]);

  useEffect(() => {
    const loadData = async () => {
      if (user) {
        try {
          await fetchRestaurants();
        } catch (error: any) {
          setComponentError(error);
        }
        try {
          await fetchLeads();
        } catch (error: any) {
          setComponentError(error);
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
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'leads');
    }
  };

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'restaurants'));
      const querySnapshot = await getDocs(q);
      const rests = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRestaurants(rests);
      if (rests.length > 0 && !selectedRestaurant) {
        await handleSelectRestaurant(rests[0]);
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
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedRestaurant) return;

    try {
      setUploading(true);
      
      const imagePromises = Array.from(files).map((file) => {
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
      
      // Call Gemini
      const digitizedMenu = await digitizeMenuImage(images);
      
      // Save to Firestore
      const menuData = {
        restaurantId: selectedRestaurant.id,
        categories: digitizedMenu.categories || [],
        updatedAt: new Date().toISOString()
      };
      
      await setDoc(doc(db, 'menus', selectedRestaurant.id), menuData);
      setMenu({ id: selectedRestaurant.id, ...menuData });
    } catch (error) {
      console.error("Error processing menu:", error);
      alert("Failed to digitize menu. Please try again.");
    } finally {
      setUploading(false);
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
                    onClick={() => { handleSelectRestaurant(rest).catch(setComponentError); setIsMobileMenuOpen(false); }}
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

              <form onSubmit={(e) => handleCreateRestaurant(e).catch(setComponentError)} className="mt-8">
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
                      {uploading ? 'Digitizing AI...' : 'Upload Menu Pages'}
                    </label>
                    {uploading && (
                      <div className="absolute top-full left-0 right-0 mt-2">
                        <div className="h-1.5 w-full bg-indigo-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-600 transition-all duration-500 ease-out"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-indigo-600 font-bold mt-1 text-center">
                          {Math.round(uploadProgress)}% - Analyzing
                        </p>
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={(e) => handleDeleteRestaurant().catch(setComponentError)}
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
                                  <img src={category.imageUrl} alt={category.name} className="w-full h-full object-cover" />
                                  <button 
                                    onClick={() => handleRemoveCategoryImage(category.originalIdx).catch(setComponentError)}
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
                                        onClick={() => handleDeleteItem(category.originalIdx, item.originalIdx).catch(setComponentError)}
                                        className="p-2.5 bg-white/90 backdrop-blur-sm rounded-xl shadow-sm text-slate-500 hover:text-red-600 transition-colors"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>

                                    {item.imageUrl && (
                                      <div className="w-full h-48 overflow-hidden bg-slate-100 relative">
                                        <img 
                                          src={item.imageUrl} 
                                          alt={item.name} 
                                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                          referrerPolicy="no-referrer"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                                        <div className="absolute bottom-4 left-5">
                                          <span className="font-bold text-white bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-lg text-sm border border-white/20 shadow-sm">{(item.price || 0).toFixed(2)} DH</span>
                                        </div>
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
                            const cardsHtml = Array(20).fill(`
                              <div class="card">
                                <div class="title">Scan for Menu</div>
                                <div class="qr-wrapper">${svgHtml}</div>
                                <div class="subtitle">${selectedRestaurant.name}</div>
                              </div>
                            `).join('');

                            printWindow.document.write(`
                              <html>
                                <head>
                                  <title>Print QR Codes (A4)</title>
                                  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400;1,600&display=swap" rel="stylesheet">
                                  <style>
                                    @page { size: A4; margin: 10mm; }
                                    body { 
                                      margin: 0; 
                                      padding: 0; 
                                      font-family: system-ui, -apple-system, sans-serif; 
                                      -webkit-print-color-adjust: exact; 
                                    }
                                    .grid {
                                      display: grid;
                                      grid-template-columns: repeat(4, 1fr);
                                      grid-template-rows: repeat(5, 1fr);
                                      gap: 4mm;
                                      height: 277mm; /* A4 height (297) - margins (20) */
                                      box-sizing: border-box;
                                    }
                                    .card {
                                      display: flex;
                                      flex-direction: column;
                                      align-items: center;
                                      justify-content: center;
                                      border: 1px dashed #cbd5e1;
                                      border-radius: 12px;
                                      padding: 8px;
                                      text-align: center;
                                    }
                                    .qr-wrapper svg {
                                      width: 30mm;
                                      height: 30mm;
                                      margin: 8px 0;
                                    }
                                    .title { 
                                      font-size: 11px; 
                                      font-weight: 800; 
                                      color: #0f172a; 
                                      text-transform: uppercase;
                                      letter-spacing: 0.05em;
                                    }
                                    .subtitle { 
                                      font-size: 12px; 
                                      font-family: 'Playfair Display', Georgia, serif;
                                      font-style: italic;
                                      font-weight: 600; 
                                      color: #334155; 
                                      margin-top: 2px;
                                      letter-spacing: 0.02em;
                                    }
                                  </style>
                                </head>
                                <body>
                                  <div class="grid">
                                    ${cardsHtml}
                                  </div>
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
                  onClick={(e) => handleSaveItem().catch(setComponentError)}
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
                  onClick={(e) => handleSaveRestaurant().catch(setComponentError)}
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
    </div>
  );
}
