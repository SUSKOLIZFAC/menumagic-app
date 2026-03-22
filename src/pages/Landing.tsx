import React, { useState, useEffect } from 'react';
import { QrCode, Sparkles, X, CheckCircle2, ScanLine, RefreshCw, Image as ImageIcon, Trash2, Check, ArrowRight, TrendingUp, Users, DollarSign, Star, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

const translations = {
  en: {
    getStarted: "Get Started",
    heroBadge: "The End of Paper Menus",
    heroTitle1: "Your menu,",
    heroTitle2: "reimagined.",
    heroDesc: "Replace sticky, outdated paper menus with a premium digital experience. Scannable, beautiful, and always up-to-date.",
    upgradeBtn: "Upgrade Your Restaurant",
    trustedBy: "Trusted by",
    restaurants: "restaurants",
    avgUpsell: "Avg. Upsell",
    guestRating: "Guest Rating",
    scanForMenu: "Scan for Menu",
    pointCamera: "Point camera here",
    statsUpsell: "Average Upsell Increase",
    statsPrinting: "Printing Costs",
    statsTouchFree: "Touch-Free & Hygienic",
    statsUpdates: "Real-time Updates",
    problemTitle: "Why paper menus are costing you.",
    problemDesc: "The dining experience has evolved. Your menu should too.",
    oldWayTitle: "The Old Way",
    oldWay1: "Expensive to reprint when prices change",
    oldWay2: "No photos means lower upsell conversion",
    oldWay3: "Gets sticky, torn, and unhygienic quickly",
    oldWay4: "Cannot hide sold-out items instantly",
    newWayTitle: "Onemenu",
    newWay1: "Update prices and items in 1 second",
    newWay2: "Mouth-watering photos increase order value by 20%",
    newWay3: "100% touch-free and hygienic via QR code",
    newWay4: "Hide sold-out items with a single click",
    howItWorksTitle: "How it works.",
    howItWorksDesc: "From paper to pixel in three simple steps.",
    step1Title: "1. Place the QR Code",
    step1Desc: "We provide beautifully designed, custom QR code displays for your tables or counters.",
    step2Title: "2. Guests Scan & Browse",
    step2Desc: "Guests point their phone camera. No app downloads required. They instantly see a stunning visual menu.",
    step3Title: "3. Update Anytime",
    step3Desc: "Log into your dashboard to change prices, add daily specials, or upload new dish photos instantly.",
    pricingTitle: "One simple price.",
    pricingDesc: "Everything you need to modernize your restaurant, with zero hidden fees.",
    oneOfferOnly: "One Offer Only",
    everythingIncluded: "Everything included. Super easy setup.",
    feature1: "Digital menu",
    feature2: "QR code",
    feature3: "20 QR stickers",
    claimOffer: "Claim This Offer",
    ctaTitle: "Ready to modernize your restaurant?",
    ctaDesc: "Join the top-tier restaurants upgrading their dining experience and increasing their bottom line.",
    getDigitalMenu: "Get Your Digital Menu Now",
    modalSuccessTitle: "Request Received!",
    modalSuccessDesc: "We'll be in touch shortly to set up your digital menu.",
    modalTitle: "Let's build your menu.",
    modalDesc: "Fill out the form below and our team will contact you to get started.",
    formName: "Restaurant Name",
    formContact: "Contact Person",
    formEmail: "Email Address",
    formPhone: "Phone Number",
    formSubmit: "Submit Request",
    formSubmitting: "Submitting...",
    navFeatures: "Features",
    navHowItWorks: "How it Works",
    navPricing: "Pricing"
  },
  fr: {
    getStarted: "Commencer",
    heroBadge: "La fin des menus papier",
    heroTitle1: "Votre menu,",
    heroTitle2: "réinventé.",
    heroDesc: "Remplacez les menus papier collants et dépassés par une expérience numérique premium. Scannable, beau et toujours à jour.",
    upgradeBtn: "Améliorez votre restaurant",
    trustedBy: "Approuvé par",
    restaurants: "restaurants",
    avgUpsell: "Ventes supp. moy.",
    guestRating: "Note des clients",
    scanForMenu: "Scannez le menu",
    pointCamera: "Pointez l'appareil photo ici",
    statsUpsell: "Augmentation moyenne des ventes",
    statsPrinting: "Frais d'impression",
    statsTouchFree: "Sans contact et hygiénique",
    statsUpdates: "Mises à jour en temps réel",
    problemTitle: "Pourquoi les menus papier vous coûtent cher.",
    problemDesc: "L'expérience culinaire a évolué. Votre menu devrait aussi.",
    oldWayTitle: "L'ancienne méthode",
    oldWay1: "Coûteux à réimprimer quand les prix changent",
    oldWay2: "Pas de photos = moins de ventes supplémentaires",
    oldWay3: "Devient collant, déchiré et peu hygiénique rapidement",
    oldWay4: "Impossible de masquer instantanément les articles épuisés",
    newWayTitle: "Onemenu",
    newWay1: "Mettez à jour les prix et les articles en 1 seconde",
    newWay2: "Des photos appétissantes augmentent la valeur de la commande de 20%",
    newWay3: "100% sans contact et hygiénique via code QR",
    newWay4: "Masquez les articles épuisés en un seul clic",
    howItWorksTitle: "Comment ça marche.",
    howItWorksDesc: "Du papier au pixel en trois étapes simples.",
    step1Title: "1. Placez le code QR",
    step1Desc: "Nous fournissons des présentoirs de codes QR personnalisés et magnifiquement conçus pour vos tables ou comptoirs.",
    step2Title: "2. Les clients scannent et parcourent",
    step2Desc: "Les clients pointent l'appareil photo de leur téléphone. Aucun téléchargement d'application requis. Ils voient instantanément un menu visuel époustouflant.",
    step3Title: "3. Mettez à jour à tout moment",
    step3Desc: "Connectez-vous à votre tableau de bord pour modifier les prix, ajouter des plats du jour ou télécharger instantanément de nouvelles photos de plats.",
    pricingTitle: "Un prix simple.",
    pricingDesc: "Tout ce dont vous avez besoin pour moderniser votre restaurant, sans frais cachés.",
    oneOfferOnly: "Une seule offre",
    everythingIncluded: "Tout est inclus. Configuration super facile.",
    feature1: "Menu numérique",
    feature2: "Code QR",
    feature3: "20 autocollants QR",
    claimOffer: "Réclamer cette offre",
    ctaTitle: "Prêt à moderniser votre restaurant ?",
    ctaDesc: "Rejoignez les meilleurs restaurants qui améliorent leur expérience culinaire et augmentent leurs bénéfices.",
    getDigitalMenu: "Obtenez votre menu numérique maintenant",
    modalSuccessTitle: "Demande reçue !",
    modalSuccessDesc: "Nous vous contacterons sous peu pour configurer votre menu numérique.",
    modalTitle: "Créons votre menu.",
    modalDesc: "Remplissez le formulaire ci-dessous et notre équipe vous contactera pour commencer.",
    formName: "Nom du restaurant",
    formContact: "Personne à contacter",
    formEmail: "Adresse e-mail",
    formPhone: "Numéro de téléphone",
    formSubmit: "Soumettre la demande",
    formSubmitting: "Soumission en cours...",
    navFeatures: "Avantages",
    navHowItWorks: "Fonctionnement",
    navPricing: "Tarifs"
  }
};

type Language = 'en' | 'fr';

export default function Landing() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [lang, setLang] = useState<Language>('en');

  const t = translations[lang];

  // Form state
  const [formData, setFormData] = useState({
    restaurantName: '',
    contactPerson: '',
    email: '',
    phone: ''
  });

  // Simulate QR scanning loop
  useEffect(() => {
    const interval = setInterval(() => {
      setScanned(s => !s);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await addDoc(collection(db, 'leads'), {
        ...formData,
        status: 'new',
        createdAt: new Date().toISOString()
      });
      
      setIsSubmitted(true);
      setTimeout(() => {
        setIsModalOpen(false);
        setIsSubmitted(false);
        setFormData({ restaurantName: '', contactPerson: '', email: '', phone: '' });
      }, 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'leads');
      alert("There was an error submitting your request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleLanguage = () => {
    setLang(prev => prev === 'en' ? 'fr' : 'en');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-500/30 relative overflow-hidden">
      {/* Global Background Graphics */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Dot Grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1.5px, transparent 1.5px)', backgroundSize: '32px 32px' }}></div>
        {/* Soft Gradient Blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-400/20 blur-[120px]" />
        <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-400/20 blur-[120px]" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/50">
        <div className="flex items-center justify-between p-5 max-w-7xl mx-auto">
          <div className="flex items-center gap-3 text-slate-900 font-bold text-xl tracking-tight">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <span>Onemenu<span className="text-indigo-600">.</span></span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors">{t.navFeatures}</a>
            <a href="#how-it-works" className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors">{t.navHowItWorks}</a>
            <a href="#pricing" className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors">{t.navPricing}</a>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={toggleLanguage}
              className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors bg-slate-100/50 px-3 py-1.5 rounded-full"
            >
              <Globe className="w-4 h-4" />
              {lang === 'en' ? 'FR' : 'EN'}
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="text-sm font-bold bg-slate-900 text-white px-6 py-2.5 rounded-full hover:bg-indigo-600 transition-colors shadow-md"
            >
              {t.getStarted}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 pt-32 pb-20 px-6 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl relative z-20"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm mb-8">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{t.heroBadge}</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6 text-slate-900">
              {t.heroTitle1} <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-cyan-500">
                {t.heroTitle2}
              </span>
            </h1>
            
            <p className="text-xl text-slate-600 mb-10 leading-relaxed max-w-lg">
              {t.heroDesc}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => setIsModalOpen(true)}
                className="group relative inline-flex items-center justify-center gap-3 bg-indigo-600 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-indigo-700 transition-all duration-300 shadow-[0_10px_40px_-10px_rgba(79,70,229,0.5)] hover:shadow-[0_15px_50px_-10px_rgba(79,70,229,0.6)] hover:-translate-y-1"
              >
                {t.upgradeBtn} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Trust Badges */}
            <div className="mt-12 flex items-center gap-6 text-sm font-medium text-slate-500">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <img key={i} src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="User" className="w-8 h-8 rounded-full border-2 border-slate-50" />
                ))}
              </div>
              <p>{t.trustedBy} <span className="text-slate-900 font-bold">500+</span> {t.restaurants}</p>
            </div>
          </motion.div>
          
          {/* Dynamic Hero Visual: QR to Menu */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative h-[600px] flex items-center justify-center"
          >
            {/* Floating Graphic Badges */}
            <motion.div 
              animate={{ y: [-10, 10, -10] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="absolute top-10 right-0 z-40 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-3"
            >
              <div className="bg-emerald-100 p-2 rounded-full text-emerald-600"><TrendingUp className="w-5 h-5" /></div>
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase">{t.avgUpsell}</p>
                <p className="text-lg font-bold text-slate-900">+22%</p>
              </div>
            </motion.div>

            <motion.div 
              animate={{ y: [10, -10, 10] }}
              transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
              className="absolute bottom-20 left-0 z-40 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-3"
            >
              <div className="bg-amber-100 p-2 rounded-full text-amber-600"><Star className="w-5 h-5 fill-amber-500" /></div>
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase">{t.guestRating}</p>
                <p className="text-lg font-bold text-slate-900">4.9/5</p>
              </div>
            </motion.div>

            {/* The QR Code Table Tent */}
            <motion.div 
              animate={{ 
                x: scanned ? -140 : 0, 
                opacity: scanned ? 0.4 : 1,
                scale: scanned ? 0.85 : 1,
                rotateY: scanned ? 15 : 0
              }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              className="absolute z-20 bg-white p-6 rounded-3xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-slate-200 flex flex-col items-center w-64"
            >
              <div className="w-12 h-1 bg-slate-100 rounded-full mb-4"></div>
              <h3 className="text-slate-900 font-serif font-bold text-2xl mb-4 text-center">{t.scanForMenu}</h3>
              <div className="relative w-48 h-48 bg-slate-50 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-100">
                <QrCode className="w-32 h-32 text-slate-800" />
                {/* Scanning Laser */}
                <motion.div 
                  animate={{ y: [-100, 100, -100] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
                  className="absolute inset-x-0 h-1 bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.6)] z-30"
                />
              </div>
              <p className="text-slate-500 text-sm mt-5 font-medium flex items-center gap-2 text-center">
                <ScanLine className="w-4 h-4" /> {t.pointCamera}
              </p>
            </motion.div>

            {/* The Digital Menu Result (Phone) */}
            <motion.div 
              animate={{ 
                x: scanned ? 100 : 0, 
                opacity: scanned ? 1 : 0,
                scale: scanned ? 1 : 0.9,
                rotate: scanned ? 5 : 0,
                rotateY: scanned ? -5 : 0
              }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              className="absolute z-30 w-[280px] h-[580px] bg-white rounded-[3rem] border-[8px] border-slate-900 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0 h-6 bg-slate-900 rounded-b-2xl w-32 mx-auto z-40" />
              
              {/* Phone Screen Content */}
              <div className="h-full w-full overflow-hidden flex flex-col relative bg-slate-50">
                <img 
                  src="https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=800" 
                  alt="Steak" 
                  className="w-full h-64 object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-t from-slate-900/80 to-transparent" />
                
                <div className="flex-1 px-5 -mt-12 relative z-10">
                  <div className="bg-white rounded-2xl p-4 shadow-lg mb-4">
                    <h2 className="text-2xl font-serif font-bold text-slate-900 mb-1">Ribeye Steak</h2>
                    <p className="text-indigo-600 font-bold text-lg mb-2">45.00 DH</p>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      Prime 16oz bone-in ribeye, perfectly marbled and fire-grilled. Served with garlic herb butter.
                    </p>
                  </div>
                  
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 ml-1">Add-ons</h3>
                  <div className="space-y-3">
                    <div className="bg-white rounded-xl p-2 flex items-center gap-3 shadow-sm border border-slate-100">
                      <img src="https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&q=80&w=200" className="w-12 h-12 rounded-lg object-cover" />
                      <div className="flex-1">
                        <p className="text-slate-900 text-sm font-bold">Truffle Fries</p>
                        <p className="text-indigo-600 text-xs font-semibold">+8.00 DH</p>
                      </div>
                      <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center mr-2"><PlusIcon className="w-4 h-4 text-indigo-600"/></div>
                    </div>
                    <div className="bg-white rounded-xl p-2 flex items-center gap-3 shadow-sm border border-slate-100">
                      <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center"><Sparkles className="w-5 h-5 text-slate-400"/></div>
                      <div className="flex-1">
                        <p className="text-slate-900 text-sm font-bold">Lobster Tail</p>
                        <p className="text-indigo-600 text-xs font-semibold">+22.00 DH</p>
                      </div>
                      <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center mr-2"><PlusIcon className="w-4 h-4 text-indigo-600"/></div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </main>

      {/* Stats Section */}
      <section className="border-y border-slate-200 bg-white relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-slate-100">
            <div>
              <p className="text-4xl font-extrabold text-slate-900 mb-2">20%</p>
              <p className="text-sm text-slate-500 font-medium">{t.statsUpsell}</p>
            </div>
            <div>
              <p className="text-4xl font-extrabold text-slate-900 mb-2">0 DH</p>
              <p className="text-sm text-slate-500 font-medium">{t.statsPrinting}</p>
            </div>
            <div>
              <p className="text-4xl font-extrabold text-slate-900 mb-2">100%</p>
              <p className="text-sm text-slate-500 font-medium">{t.statsTouchFree}</p>
            </div>
            <div>
              <p className="text-4xl font-extrabold text-slate-900 mb-2">Insta</p>
              <p className="text-sm text-slate-500 font-medium">{t.statsUpdates}</p>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem vs Solution Section */}
      <section id="features" className="py-32 bg-slate-50 relative overflow-hidden z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">{t.problemTitle}</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">{t.problemDesc}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* The Old Way */}
            <div className="bg-white border border-slate-200 rounded-3xl p-10 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110" />
              <div className="flex items-center gap-3 mb-8 text-red-500">
                <Trash2 className="w-6 h-6" />
                <h3 className="text-2xl font-bold text-slate-900">{t.oldWayTitle}</h3>
              </div>
              <ul className="space-y-6">
                {[
                  t.oldWay1,
                  t.oldWay2,
                  t.oldWay3,
                  t.oldWay4
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-4 text-slate-600">
                    <X className="w-6 h-6 text-red-400 shrink-0" />
                    <span className="text-lg">{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* The New Way */}
            <div className="bg-indigo-600 border border-indigo-500 rounded-3xl p-10 relative overflow-hidden shadow-xl group hover:shadow-2xl transition-shadow">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/50 blur-[80px] rounded-full" />
              <div className="flex items-center gap-3 mb-8 text-white relative z-10">
                <Sparkles className="w-6 h-6 text-indigo-200" />
                <h3 className="text-2xl font-bold">{t.newWayTitle}</h3>
              </div>
              <ul className="space-y-6 relative z-10">
                {[
                  t.newWay1,
                  t.newWay2,
                  t.newWay3,
                  t.newWay4
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-4 text-indigo-50">
                    <Check className="w-6 h-6 text-indigo-300 shrink-0" />
                    <span className="text-lg">{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-32 max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-24">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">{t.howItWorksTitle}</h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">{t.howItWorksDesc}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-12 relative">
          {/* Connecting Line (Desktop only) */}
          <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-indigo-100 via-indigo-300 to-indigo-100 z-0"></div>

          {[
            {
              icon: <ScanLine className="w-8 h-8" />,
              title: t.step1Title,
              desc: t.step1Desc
            },
            {
              icon: <ImageIcon className="w-8 h-8" />,
              title: t.step2Title,
              desc: t.step2Desc
            },
            {
              icon: <RefreshCw className="w-8 h-8" />,
              title: t.step3Title,
              desc: t.step3Desc
            }
          ].map((step, idx) => (
            <div key={idx} className="relative z-10 flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-white border-4 border-slate-50 shadow-xl rounded-full flex items-center justify-center text-indigo-600 mb-8 relative">
                {step.icon}
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm border-2 border-white">
                  {idx + 1}
                </div>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">{step.title}</h3>
              <p className="text-slate-600 text-lg leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-32 bg-slate-50 relative z-10" id="pricing">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">{t.pricingTitle}</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">{t.pricingDesc}</p>
          </div>

          <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-[3rem] p-10 shadow-2xl border border-slate-100 relative overflow-hidden transform hover:-translate-y-1 transition-transform duration-300">
              <div className="absolute top-0 inset-x-0 h-2 bg-indigo-600"></div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-bl-full -z-10"></div>
              
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-600 font-bold text-sm uppercase tracking-wider mb-8">
                <Sparkles className="w-4 h-4" /> {t.oneOfferOnly}
              </div>

              <div className="mb-4 flex items-baseline gap-2">
                <span className="text-7xl font-black text-slate-900 tracking-tight">150</span>
                <span className="text-2xl font-bold text-slate-500">MAD</span>
              </div>
              <p className="text-slate-500 font-medium mb-8 text-lg pb-8 border-b border-slate-100">{t.everythingIncluded}</p>

              <ul className="space-y-5 mb-10">
                {[
                  t.feature1,
                  t.feature2,
                  t.feature3
                ].map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <Check className="w-5 h-5 text-emerald-600" />
                    </div>
                    <span className="text-xl font-bold text-slate-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <button 
                onClick={() => setIsModalOpen(true)}
                className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-bold text-xl hover:bg-indigo-700 transition-colors shadow-xl shadow-indigo-200"
              >
                {t.claimOffer}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden z-10 mx-6 mb-20">
        <div className="absolute inset-0 bg-slate-900 rounded-[3rem]" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/30 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyan-600/20 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center py-16">
          <h2 className="text-4xl md:text-6xl font-extrabold text-white mb-8 tracking-tight">{t.ctaTitle}</h2>
          <p className="text-xl text-indigo-200 mb-12 font-light max-w-2xl mx-auto">{t.ctaDesc}</p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-white text-slate-900 px-10 py-5 rounded-full font-bold text-xl hover:bg-indigo-50 transition-colors shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:scale-105 active:scale-95"
          >
            {t.getDigitalMenu}
          </button>
        </div>
      </section>

      {/* Contact Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-[2rem] p-8 md:p-12 max-w-lg w-full relative shadow-2xl"
            >
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors bg-slate-100 p-2 rounded-full hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
              
              {isSubmitted ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900 mb-3">{t.modalSuccessTitle}</h2>
                  <p className="text-slate-600 text-lg">{t.modalSuccessDesc}</p>
                </div>
              ) : (
                <>
                  <h2 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">{t.modalTitle}</h2>
                  <p className="text-slate-600 mb-8">{t.modalDesc}</p>
                  
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">{t.formName}</label>
                      <input 
                        required 
                        type="text" 
                        value={formData.restaurantName}
                        onChange={(e) => setFormData({...formData, restaurantName: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 placeholder:text-slate-400" 
                        placeholder="e.g. Bella Italia" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">{t.formContact}</label>
                      <input 
                        required 
                        type="text" 
                        value={formData.contactPerson}
                        onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 placeholder:text-slate-400" 
                        placeholder="e.g. John Doe" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">{t.formEmail}</label>
                      <input 
                        required 
                        type="email" 
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 placeholder:text-slate-400" 
                        placeholder="john@example.com" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">{t.formPhone}</label>
                      <input 
                        required 
                        type="tel" 
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 placeholder:text-slate-400" 
                        placeholder="(555) 123-4567" 
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all mt-6 shadow-lg shadow-indigo-200 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? t.formSubmitting : t.formSubmit}
                    </button>
                  </form>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper icon component
function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}
