import React, { useState } from 'react';
import { 
  QrCode, 
  X, 
  CheckCircle2, 
  Trash2, 
  Check, 
  ArrowRight, 
  ChevronDown, 
  Instagram, 
  Sparkles,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { BrandLogo } from '../components/BrandLogo';

const translations = {
  en: {
    brandWordmark: "Onemenu.",
    getStarted: "Get Started",
    navFeatures: "Features",
    navExperience: "Diner Experience",
    navHowItWorks: "How It Works",
    navPricing: "Pricing",
    navFaq: "FAQ",
    heroKicker: "Hospitality Technology · 2026",
    heroTitleLead: "The digital menu",
    heroTitleAccent: "your guests expect.",
    heroDesc: "Replace sticky, reprinted paper menus with an instant, high-resolution visual menu. Boost average spend by 22%, update items in seconds, and eliminate reprinting costs forever.",
    upgradeBtn: "Upgrade Your Restaurant",
    whatsappHeroBtn: "Chat on WhatsApp",
    trustedBy: "Trusted by over",
    restaurantsCount: "500+ restaurants & cafes",
    avgUpsell: "Avg. Ticket Upsell",
    guestRating: "Guest Satisfaction",
    scanForMenu: "Scan for Menu",
    pointCamera: "Point phone camera here",
    statsUpsell: "Average Order Value Increase",
    statsPrinting: "Paper Printing Waste",
    statsTouchFree: "Contactless & Hygienic",
    statsSpeed: "Scan-to-Browse Latency",
    featuresKicker: "Core Advantages",
    problemTitle: "Why traditional paper menus cost you more than you think.",
    problemDesc: "Guest expectations have evolved. Paper menus are slow to edit, expensive to reprint, and leave your best dishes hidden without photos.",
    oldWayTitle: "The Paper Menu",
    oldWay1: "Expensive to reprint every time prices or ingredients change",
    oldWay2: "Text-only lists fail to tempt diners into high-margin extras",
    oldWay3: "Menus become torn, soiled, and unhygienic after a few weeks",
    oldWay4: "Sold-out items cause awkward apologies at the table",
    newWayTitle: "The Onemenu Advantage",
    newWay1: "Update prices, daily specials, or 86'd items in 10 seconds",
    newWay2: "High-resolution dish photos increase dessert and drink orders by 22%",
    newWay3: "100% clean, touch-free access via native smartphone camera",
    newWay4: "Toggle sold-out items instantly so waitstaff never apologize",
    showcaseKicker: "Visual Architecture",
    showcaseTitle: "Designed to make every plate look irresistible.",
    showcaseDesc: "Interactive dish cards that capture appetite, highlight dietary preferences, and showcase your kitchen's craft.",
    demoCategoryAll: "All Dishes",
    demoCategoryBurgers: "Burgers",
    demoCategoryPizza: "Pizza",
    demoCategoryDrinks: "Craft Drinks",
    dish1Name: "Black Truffle Wagyu Burger",
    dish1Desc: "Dry-aged Wagyu beef patty, black truffle emulsion, caramelized shallots, brioche.",
    dish2Name: "San Marzano Margherita",
    dish2Desc: "Stone-baked sourdough crust, buffalo mozzarella di bufala, fresh basil, extra virgin olive oil.",
    dish3Name: "Wild Salmon Crudo Tartare",
    dish3Desc: "Hass avocado pearls, citrus ponzu vinaigrette, toasted black sesame, micro coriander.",
    dish4Name: "Iced Hibiscus Botanical Tonic",
    dish4Desc: "Cold-infused organic hibiscus flower, sparkling citrus tonic, dehydrated orange wheel, rosemary.",
    howItWorksKicker: "Three Simple Steps",
    howItWorksTitle: "From paper to digital in less than 48 hours.",
    howItWorksDesc: "No complicated apps, no tech headaches. We handle everything from design to printing your QR codes.",
    step1Title: "1. Send Us Your Menu",
    step1Desc: "Share your current menu or photos of your items. We digitize, format, and pair each dish with appetizing presentation.",
    step2Title: "2. Receive Premium QR Stands",
    step2Desc: "We produce durable, custom-branded QR table stickers or acrylic stands ready for your dining tables and counter.",
    step3Title: "3. Update in Real-Time",
    step3Desc: "Need to change a price or add a weekend chef special? Send a quick message or log into your dashboard for instant updates.",
    pricingKicker: "Transparent Pricing",
    pricingTitle: "One straightforward package.",
    pricingDesc: "Everything required to modernize your restaurant with zero subscription lock-in and zero hidden fees.",
    oneOfferOnly: "Complete Setup Package",
    everythingIncluded: "Complete digital menu setup + 20 waterproof QR stickers included.",
    priceCurrency: "DH",
    feature1: "Fully customized, mobile-optimized digital menu",
    feature2: "Custom high-resolution QR codes with restaurant branding",
    feature3: "20 premium waterproof, scratch-resistant table stickers",
    feature4: "Instant mobile price and item updates",
    feature5: "Multi-language support for international guests",
    feature6: "Dedicated WhatsApp priority support",
    claimOffer: "Claim This Offer",
    whatsappOrText: "Or message us directly on WhatsApp",
    ctaTitle: "Ready to elevate your dining room?",
    ctaDesc: "Join leading restaurants that have transformed their guest experience, eliminated printing waste, and increased their average ticket size.",
    getDigitalMenu: "Launch Your Digital Menu",
    faqKicker: "Frequently Asked Questions",
    faqTitle: "Common questions answered.",
    modalSuccessTitle: "Request Received!",
    modalSuccessDesc: "Our team will reach out within a few hours to design your digital menu.",
    modalTitle: "Let's build your digital menu.",
    modalDesc: "Provide your restaurant details below and we will contact you immediately.",
    formName: "Restaurant Name",
    formContact: "Your Name",
    formEmail: "Email Address",
    formPhone: "Phone / WhatsApp Number",
    formSubmit: "Submit Request",
    formSubmitting: "Submitting...",
    whatsappContact: "Chat on WhatsApp",
    faq1Q: "Do customers need to download an application to view the menu?",
    faq1A: "Never. Guests simply open the standard camera app on any iPhone or Android phone, tap the QR code, and the menu opens instantly in under 1.2 seconds.",
    faq2Q: "How do I change a price or mark an item as sold out?",
    faq2A: "You can update prices and items directly from your mobile phone in seconds, or simply WhatsApp our support desk and we update it for you instantly.",
    faq3Q: "Can I use multiple languages for tourists?",
    faq3A: "Yes. Onemenu automatically supports instant one-tap translation into French, English, Spanish, and German.",
    faq4Q: "What do the physical QR code stickers look like?",
    faq4A: "We provide high-grade, waterproof, matte-laminated 50x50mm stickers designed to withstand restaurant cleaning, spills, and daily dining table use."
  },
  fr: {
    brandWordmark: "Onemenu.",
    getStarted: "Commencer",
    navFeatures: "Avantages",
    navExperience: "Expérience Client",
    navHowItWorks: "Fonctionnement",
    navPricing: "Tarif",
    navFaq: "FAQ",
    heroKicker: "Technologie Hôtelière · 2026",
    heroTitleLead: "Le menu digital",
    heroTitleAccent: "que vos clients attendent.",
    heroDesc: "Remplacez les menus papier abîmés par une expérience numérique instantanée et haute résolution. Augmentez le panier moyen de 22%, modifiez vos prix en quelques secondes et supprimez définitivement les coûts d'impression.",
    upgradeBtn: "Moderniser Votre Restaurant",
    whatsappHeroBtn: "Discuter sur WhatsApp",
    trustedBy: "Approuvé par plus de",
    restaurantsCount: "500+ restaurants & cafés",
    avgUpsell: "Hausse Panier Moyen",
    guestRating: "Satisfaction Client",
    scanForMenu: "Scannez pour le Menu",
    pointCamera: "Pointez l'appareil photo ici",
    statsUpsell: "Augmentation du Ticket Moyen",
    statsPrinting: "Frais d'Impression Éliminés",
    statsTouchFree: "Sans Contact & Hygiénique",
    statsSpeed: "Temps d'Ouverture du Menu",
    featuresKicker: "Atouts Majeurs",
    problemTitle: "Pourquoi les menus papier vous coûtent plus cher que prévu.",
    problemDesc: "Les attentes des clients ont changé. Les menus papier s'usent rapidement, coûtent cher à réimprimer et masquent vos meilleurs plats sans photos.",
    oldWayTitle: "Le Menu Papier",
    oldWay1: "Coûteux à réimprimer à chaque changement de prix ou d'ingrédient",
    oldWay2: "Une simple liste textuelle qui ne suscite pas l'envie de commander plus",
    oldWay3: "S'abîme, se tache et devient vite peu hygiénique sur les tables",
    oldWay4: "Les plats épuisés créent des déceptions lors de la commande",
    newWayTitle: "L'Avantage Onemenu",
    newWay1: "Modifiez prix, suggestions du jour et ruptures en 10 secondes",
    newWay2: "Des photos appétissantes qui augmentent les commandes de 22%",
    newWay3: "100% hygiénique et sans contact via l'appareil photo natif",
    newWay4: "Désactivez les articles épuisés en un clic pour éviter les déconvenues",
    showcaseKicker: "Présentation Visuelle",
    showcaseTitle: "Conçu pour sublimer chacun de vos plats.",
    showcaseDesc: "Des fiches interactives qui ouvrent l'appétit, indiquent les préférences alimentaires et valorisent le savoir-faire de votre chef.",
    demoCategoryAll: "Tous les Plats",
    demoCategoryBurgers: "Burgers",
    demoCategoryPizza: "Pizzas",
    demoCategoryDrinks: "Boissons",
    dish1Name: "Burger Wagyu à la Truffe Noire",
    dish1Desc: "Steak Wagyu maturé, émulsion à la truffe noire, échalotes confites, pain brioché.",
    dish2Name: "Pizza Margherita San Marzano",
    dish2Desc: "Pâte au levain cuite au feu de bois, mozzarella di bufala, basilic frais, huile d'olive vierge extra.",
    dish3Name: "Tartare de Saumon Sauvage",
    dish3Desc: "Perles d'avocat Hass, vinaigrette ponzu aux agrumes, sésame noir torréfié, jeunes pousses.",
    dish4Name: "Tonic Glacé Hibiscus & Botaniques",
    dish4Desc: "Infusion à froid d'hibiscus bio, tonic pétillant, tranche d'orange déshydratée, romarin frais.",
    howItWorksKicker: "Trois Étapes Claires",
    howItWorksTitle: "Du papier au numérique en moins de 48 heures.",
    howItWorksDesc: "Aucune application à télécharger, aucune complication technique. Nous gérons tout, de la mise en page à l'impression des QR codes.",
    step1Title: "1. Envoyez-nous votre menu",
    step1Desc: "Partagez votre menu actuel ou quelques photos. Nous numérisons, mettons en page et sublimons chaque plat.",
    step2Title: "2. Recevez vos QR codes",
    step2Desc: "Nous fabriquons des autocollants QR étanches et élégants pour vos tables et votre comptoir.",
    step3Title: "3. Mettez à jour en direct",
    step3Desc: "Besoin de modifier un prix ou d'ajouter une suggestion ? Un simple message WhatsApp ou un clic dans votre espace suffit.",
    pricingKicker: "Tarif Transparent",
    pricingTitle: "Une offre claire et tout inclus.",
    pricingDesc: "Tout le nécessaire pour moderniser votre restaurant, sans abonnement contraignant et sans frais cachés.",
    oneOfferOnly: "Pack Clé en Main",
    everythingIncluded: "Menu digital complet + 20 autocollants QR étanches fournis.",
    priceCurrency: "DH",
    feature1: "Menu digital sur-mesure et optimisé pour mobile",
    feature2: "Codes QR haute définition aux couleurs de votre établissement",
    feature3: "20 autocollants étanches et résistants aux nettoyages quotidiens",
    feature4: "Mises à jour instantanées des prix et disponibilités",
    feature5: "Traduction automatique pour les touristes (FR, EN, ES, DE)",
    feature6: "Support direct et prioritaire sur WhatsApp",
    claimOffer: "Profiter de Cette Offre",
    whatsappOrText: "Ou écrivez-nous directement sur WhatsApp",
    ctaTitle: "Prêt à moderniser votre salle ?",
    ctaDesc: "Rejoignez les restaurateurs qui améliorent l'expérience de leurs clients, éliminent le gaspillage de papier et augmentent leurs revenus.",
    getDigitalMenu: "Lancer Mon Menu Digital",
    faqKicker: "Questions Fréquentes",
    faqTitle: "Tout ce que vous devez savoir.",
    modalSuccessTitle: "Demande Bien Reçue !",
    modalSuccessDesc: "Notre équipe vous contactera dans les prochaines heures pour créer votre menu digital.",
    modalTitle: "Créons votre menu digital.",
    modalDesc: "Remplissez vos informations ci-dessous et nous vous contacterons immédiatement.",
    formName: "Nom du Restaurant",
    formContact: "Votre Nom",
    formEmail: "Adresse E-mail",
    formPhone: "Numéro de Téléphone / WhatsApp",
    formSubmit: "Envoyer la Demande",
    formSubmitting: "Envoi en cours...",
    whatsappContact: "Écrire sur WhatsApp",
    faq1Q: "Les clients doivent-ils télécharger une application ?",
    faq1A: "Jamais. Vos clients ouvrent simplement l'appareil photo de leur téléphone, scannent le code QR et le menu s'affiche instantanément en moins de 1,2 seconde.",
    faq2Q: "Comment modifier un prix ou marquer un plat épuisé ?",
    faq2A: "Vous pouvez modifier vos prix et vos plats directement depuis votre téléphone en 10 secondes, ou nous envoyer un message WhatsApp pour une mise à jour immédiate.",
    faq3Q: "Le menu est-il disponible en plusieurs langues ?",
    faq3A: "Oui. Onemenu intègre une traduction instantanée en français, anglais, espagnol et allemand pour vos clients internationaux.",
    faq4Q: "À quoi ressemblent les autocollants QR physiques ?",
    faq4A: "Nous fournissons des autocollants 50x50 mm en finition mate étanche, ultra-résistants aux éclaboussures et aux produits de nettoyage."
  }
};

type Language = 'en' | 'fr';

export default function Landing() {
  const [lang, setLang] = useState<Language>('en');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [activeSimulatorCategory, setActiveSimulatorCategory] = useState<string>('all');

  const t = translations[lang];
  const WHATSAPP_PHONE = "212690555754";
  const whatsappUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
    lang === 'fr' 
      ? "Bonjour Onemenu ! Je souhaite recevoir plus d'informations pour digitaliser mon restaurant." 
      : "Hello Onemenu! I would like more information on digitizing my restaurant menu."
  )}`;

  const [formData, setFormData] = useState({
    restaurantName: '',
    contactPerson: '',
    email: '',
    phone: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await addDoc(collection(db, 'leads'), {
        ...formData,
        status: 'new',
        createdAt: new Date().toISOString(),
        source: 'landing_redesign_2026'
      });
    } catch (error) {
      console.warn("Firestore unreachable, saving lead to local fallback cache:", error);
      handleFirestoreError(error, OperationType.CREATE, 'leads');
      try {
        const existingLeads = JSON.parse(localStorage.getItem('cached_leads') || '[]');
        existingLeads.unshift({
          id: `local_lead_${Date.now()}`,
          ...formData,
          status: 'new',
          createdAt: new Date().toISOString()
        });
        localStorage.setItem('cached_leads', JSON.stringify(existingLeads));
      } catch (_) {}
    } finally {
      setIsSubmitted(true);
      setTimeout(() => {
        setIsModalOpen(false);
        setIsSubmitted(false);
        setFormData({ restaurantName: '', contactPerson: '', email: '', phone: '' });
        setIsSubmitting(false);
      }, 2500);
    }
  };

  const sampleDishes = [
    {
      id: 'd1',
      category: 'burgers',
      name: t.dish1Name,
      desc: t.dish1Desc,
      price: 180,
      tags: ['Chef Signature', 'Halal'],
      imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=600'
    },
    {
      id: 'd2',
      category: 'pizza',
      name: t.dish2Name,
      desc: t.dish2Desc,
      price: 140,
      tags: ['Wood-Fired', 'Vegetarian'],
      imageUrl: 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?auto=format&fit=crop&q=80&w=600'
    },
    {
      id: 'd3',
      category: 'crudo',
      name: t.dish3Name,
      desc: t.dish3Desc,
      price: 210,
      tags: ['Fresh Catch', 'Gluten-Free'],
      imageUrl: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&q=80&w=600'
    },
    {
      id: 'd4',
      category: 'drinks',
      name: t.dish4Name,
      desc: t.dish4Desc,
      price: 65,
      tags: ['Artisanal', 'Zero Proof'],
      imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&q=80&w=600'
    }
  ];

  const filteredDishes = activeSimulatorCategory === 'all' 
    ? sampleDishes 
    : sampleDishes.filter(d => d.category === activeSimulatorCategory);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-slate-900 selection:text-white relative overflow-x-hidden">
      
      {/* Subtle Background Architectural Grid */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.025] z-0" 
        style={{ 
          backgroundImage: 'radial-gradient(circle at 1px 1px, #0f172a 1px, transparent 0)',
          backgroundSize: '36px 36px' 
        }} 
        aria-hidden="true"
      />

      {/* TOP BAR CONTRACT: Exactly 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-8">
          
          {/* ZONE 1: Single Text Element Wordmark */}
          <a 
            href="/" 
            className="whitespace-nowrap shrink-0 group transition-transform active:scale-95"
            aria-label="Onemenu Home"
          >
            <BrandLogo size="md" />
          </a>

          {/* ZONE 2: 4-5 Concise Single-Line Text Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
              {t.navFeatures}
            </a>
            <a href="#experience" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
              {t.navExperience}
            </a>
            <a href="#how-it-works" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
              {t.navHowItWorks}
            </a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
              {t.navPricing}
            </a>
            <a href="#faq" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
              {t.navFaq}
            </a>
          </nav>

          {/* ZONE 3: 1 Primary Action + Language Switcher */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Clean Segmented Language Control */}
            <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200/60">
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  lang === 'en' 
                    ? 'bg-white text-slate-900 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                aria-label="Switch to English"
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLang('fr')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  lang === 'fr' 
                    ? 'bg-white text-slate-900 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                aria-label="Passer en français"
              >
                FR
              </button>
            </div>

            <button 
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="px-4.5 py-2 text-xs sm:text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 shadow-xs"
            >
              {t.getStarted}
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION: High-impact editorial composition */}
      <section className="relative z-10 pt-16 sm:pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Value Proposition */}
          <div className="lg:col-span-7">
            {/* Zero-pill unboxed kicker */}
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 tracking-wider uppercase mb-5">
              <span>{t.heroKicker}</span>
              <span aria-hidden="true">·</span>
              <span>Cloud Menu Architecture</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-[1.08] mb-6 [text-wrap:balance]">
              {t.heroTitleLead}{' '}
              <span className="font-serif italic font-normal text-slate-700">
                {t.heroTitleAccent}
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed mb-8 max-w-xl">
              {t.heroDesc}
            </p>

            {/* Action Group */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 mb-10">
              <button 
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 text-white rounded-xl font-medium text-sm hover:bg-slate-800 transition-all shadow-sm hover:shadow-md"
              >
                <span>{t.upgradeBtn}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-slate-700 border border-slate-300 rounded-xl font-medium text-sm hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span>{t.whatsappHeroBtn}</span>
              </a>
            </div>

            {/* Proof bar */}
            <div className="pt-6 border-t border-slate-200/80 flex flex-wrap items-center gap-y-3 gap-x-8 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="font-mono tabular-nums font-bold text-slate-900 text-sm">500+</span>
                <span>Active Restaurants</span>
              </div>
              <span className="hidden sm:inline" aria-hidden="true">·</span>
              <div className="flex items-center gap-2">
                <span className="font-mono tabular-nums font-bold text-slate-900 text-sm">+22%</span>
                <span>Average Ticket Upsell</span>
              </div>
              <span className="hidden sm:inline" aria-hidden="true">·</span>
              <div className="flex items-center gap-2">
                <span className="font-mono tabular-nums font-bold text-slate-900 text-sm">4.9/5</span>
                <span>Diner Satisfaction</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Smartphone & Table Stand Simulation */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-sm">
              
              {/* Outer Device Frame */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
                
                {/* Simulated Phone Top Header */}
                <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="font-serif italic text-sm font-semibold tracking-wide">
                      Le Petit Bistro
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                    Table 12
                  </span>
                </div>

                {/* Interactive Simulator Category Segment */}
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex gap-1.5 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setActiveSimulatorCategory('all')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                      activeSimulatorCategory === 'all'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
                    }`}
                  >
                    {t.demoCategoryAll}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSimulatorCategory('burgers')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                      activeSimulatorCategory === 'burgers'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
                    }`}
                  >
                    {t.demoCategoryBurgers}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSimulatorCategory('pizza')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                      activeSimulatorCategory === 'pizza'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
                    }`}
                  >
                    {t.demoCategoryPizza}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSimulatorCategory('drinks')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                      activeSimulatorCategory === 'drinks'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
                    }`}
                  >
                    {t.demoCategoryDrinks}
                  </button>
                </div>

                {/* Simulated Menu Items List */}
                <div className="p-4 space-y-3 max-h-[360px] overflow-y-auto">
                  {filteredDishes.map((dish) => (
                    <div 
                      key={dish.id} 
                      className="p-3 rounded-xl border border-slate-100 hover:border-slate-300 bg-white transition-all flex items-center gap-3.5"
                    >
                      <img 
                        src={dish.imageUrl} 
                        alt={dish.name}
                        className="w-16 h-16 rounded-lg object-cover shrink-0 border border-slate-100"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {dish.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mb-1">
                          {dish.desc}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-slate-900 tabular-nums">
                            {dish.price}.00 DH
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {dish.tags[0]}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Phone Footer Action */}
                <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
                  <a
                    href="/menu/demo-restaurant-1"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900"
                  >
                    <span>View full live guest menu</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Floating QR Code Table Tag Overlay */}
              <div className="absolute -bottom-6 -left-6 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-lg flex items-center gap-3 hidden sm:flex">
                <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
                  <QrCode className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Scan at Table</p>
                  <p className="text-[11px] text-slate-500 font-mono tabular-nums">Instant Camera Link</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* QUANTITATIVE METRICS STRIP: Clean, tabular, unboxed proof */}
      <section className="border-y border-slate-200/80 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            
            <div className="space-y-1">
              <p className="font-mono tabular-nums text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
                +22%
              </p>
              <p className="text-xs sm:text-sm font-medium text-slate-600">
                {t.statsUpsell}
              </p>
            </div>

            <div className="space-y-1">
              <p className="font-mono tabular-nums text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
                0 DH
              </p>
              <p className="text-xs sm:text-sm font-medium text-slate-600">
                {t.statsPrinting}
              </p>
            </div>

            <div className="space-y-1">
              <p className="font-mono tabular-nums text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
                &lt; 1.2s
              </p>
              <p className="text-xs sm:text-sm font-medium text-slate-600">
                {t.statsSpeed}
              </p>
            </div>

            <div className="space-y-1">
              <p className="font-mono tabular-nums text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
                100%
              </p>
              <p className="text-xs sm:text-sm font-medium text-slate-600">
                {t.statsTouchFree}
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* PROBLEM VS SOLUTION SECTION: Direct operational comparison */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="max-w-2xl mb-16">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            {t.featuresKicker}
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4 [text-wrap:balance]">
            {t.problemTitle}
          </h2>
          <p className="text-slate-600 text-base leading-relaxed">
            {t.problemDesc}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          
          {/* The Old Way */}
          <div className="p-8 sm:p-10 rounded-2xl bg-white border border-slate-200">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                {t.oldWayTitle}
              </h3>
            </div>

            <ul className="space-y-4">
              {[t.oldWay1, t.oldWay2, t.oldWay3, t.oldWay4].map((item, idx) => (
                <li key={idx} className="flex items-start gap-3.5 text-sm text-slate-600">
                  <X className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* The Onemenu Advantage */}
          <div className="p-8 sm:p-10 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-md">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-white">
                {t.newWayTitle}
              </h3>
            </div>

            <ul className="space-y-4">
              {[t.newWay1, t.newWay2, t.newWay3, t.newWay4].map((item, idx) => (
                <li key={idx} className="flex items-start gap-3.5 text-sm text-slate-200">
                  <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </section>

      {/* DISH SHOWCASE SECTION: High-resolution culinary cards */}
      <section id="experience" className="py-24 bg-white border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="max-w-2xl mb-16">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              {t.showcaseKicker}
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4 [text-wrap:balance]">
              {t.showcaseTitle}
            </h2>
            <p className="text-slate-600 text-base leading-relaxed">
              {t.showcaseDesc}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {sampleDishes.map((dish) => (
              <div 
                key={dish.id} 
                className="group rounded-2xl border border-slate-200 bg-white overflow-hidden hover:border-slate-400 transition-all duration-300 flex flex-col"
              >
                <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                  <img 
                    src={dish.imageUrl} 
                    alt={dish.name}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  />
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Unboxed metadata tags */}
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                      <span>{dish.tags[0]}</span>
                      <span aria-hidden="true">·</span>
                      <span>{dish.tags[1]}</span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 mb-2">
                      {dish.name}
                    </h3>

                    <p className="text-xs text-slate-500 leading-relaxed mb-4">
                      {dish.desc}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="font-mono text-base font-bold text-slate-900 tabular-nums">
                      {dish.price}.00 DH
                    </span>
                    <button 
                      type="button"
                      onClick={() => setIsModalOpen(true)}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      Inquire Setup
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* HOW IT WORKS SECTION: Clean 3-step numbered workflow */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="max-w-2xl mb-16">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            {t.howItWorksKicker}
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4 [text-wrap:balance]">
            {t.howItWorksTitle}
          </h2>
          <p className="text-slate-600 text-base leading-relaxed">
            {t.howItWorksDesc}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          
          <div className="p-8 rounded-2xl bg-white border border-slate-200">
            <span className="font-mono text-xs font-bold text-slate-400 mb-4 block">
              01
            </span>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              {t.step1Title}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {t.step1Desc}
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-white border border-slate-200">
            <span className="font-mono text-xs font-bold text-slate-400 mb-4 block">
              02
            </span>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              {t.step2Title}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {t.step2Desc}
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-white border border-slate-200">
            <span className="font-mono text-xs font-bold text-slate-400 mb-4 block">
              03
            </span>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              {t.step3Title}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {t.step3Desc}
            </p>
          </div>

        </div>
      </section>

      {/* PRICING SECTION: Clean 1-Offer Architecture */}
      <section id="pricing" className="py-24 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="max-w-2xl mb-16">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              {t.pricingKicker}
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4 [text-wrap:balance]">
              {t.pricingTitle}
            </h2>
            <p className="text-slate-600 text-base leading-relaxed">
              {t.pricingDesc}
            </p>
          </div>

          <div className="max-w-xl">
            <div className="rounded-2xl border border-slate-300 p-8 sm:p-10 bg-white shadow-sm">
              
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-bold tracking-wider uppercase text-slate-600">
                  {t.oneOfferOnly}
                </span>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                  All-Inclusive Setup
                </span>
              </div>

              <div className="flex items-baseline gap-2 mb-2">
                <span className="font-mono tabular-nums text-5xl font-bold text-slate-900">
                  200
                </span>
                <span className="text-xl font-bold text-slate-500">
                  {t.priceCurrency}
                </span>
              </div>

              <p className="text-sm text-slate-500 mb-8 pb-6 border-b border-slate-200">
                {t.everythingIncluded}
              </p>

              <ul className="space-y-3.5 mb-8 text-sm text-slate-700">
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{t.feature1}</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{t.feature2}</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{t.feature3}</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{t.feature4}</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{t.feature5}</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{t.feature6}</span>
                </li>
              </ul>

              <div className="space-y-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-semibold text-sm hover:bg-slate-800 transition-colors shadow-xs"
                >
                  {t.claimOffer}
                </button>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 bg-white text-slate-700 border border-slate-200 rounded-xl font-semibold text-sm hover:bg-slate-50 flex items-center justify-center gap-2 transition-colors"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <span>{t.whatsappOrText}</span>
                </a>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="max-w-2xl mb-16">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            {t.faqKicker}
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4 [text-wrap:balance]">
            {t.faqTitle}
          </h2>
        </div>

        <div className="max-w-3xl space-y-4">
          {[
            { q: t.faq1Q, a: t.faq1A },
            { q: t.faq2Q, a: t.faq2A },
            { q: t.faq3Q, a: t.faq3A },
            { q: t.faq4Q, a: t.faq4A },
          ].map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div 
                key={idx}
                className="rounded-xl border border-slate-200 bg-white overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-slate-900 hover:text-slate-700"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* BOTTOM ACTION BANNER */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-16">
        <div className="rounded-3xl bg-slate-900 text-white p-8 sm:p-14 border border-slate-800 text-center max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 tracking-tight [text-wrap:balance]">
            {t.ctaTitle}
          </h2>
          <p className="text-slate-300 text-base max-w-xl mx-auto mb-8">
            {t.ctaDesc}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto px-8 py-3.5 bg-white text-slate-900 rounded-xl font-bold text-sm hover:bg-slate-100 transition-colors shadow-sm"
            >
              {t.getDigitalMenu}
            </button>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-3.5 bg-slate-800 text-white border border-slate-700 rounded-xl font-bold text-sm hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span>WhatsApp Concierge</span>
            </a>
          </div>
        </div>
      </section>

      {/* LEAD CAPTURE MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 sm:p-8 relative"
            >
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>

              {isSubmitted ? (
                <div className="py-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {t.modalSuccessTitle}
                  </h3>
                  <p className="text-sm text-slate-600 max-w-xs mx-auto">
                    {t.modalSuccessDesc}
                  </p>
                </div>
              ) : (
                <>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">
                    {t.modalTitle}
                  </h3>
                  <p className="text-xs text-slate-500 mb-6">
                    {t.modalDesc}
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        {t.formName}
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.restaurantName}
                        onChange={(e) => setFormData({ ...formData, restaurantName: e.target.value })}
                        placeholder="e.g. Le Petit Bistro"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        {t.formContact}
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.contactPerson}
                        onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                        placeholder="e.g. Jean Dupont"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-slate-900"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          {t.formEmail}
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="manager@bistro.com"
                          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          {t.formPhone}
                        </label>
                        <input
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="+212 600 000 000"
                          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-slate-900"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 bg-slate-900 text-white rounded-lg font-semibold text-sm hover:bg-slate-800 transition-colors disabled:opacity-50"
                      >
                        {isSubmitting ? t.formSubmitting : t.formSubmit}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QUIET AGENCY FOOTER: Top Bar Contract Mirror */}
      <footer className="border-t border-slate-200/80 bg-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-500">
          
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" />
            <span className="text-slate-300">·</span>
            <span className="text-[11px] text-slate-500 font-medium">Digital Hospitality Platform</span>
          </div>

          <div className="flex items-center gap-6">
            <a 
              href="https://www.instagram.com/onemenu.app/?utm_source=ig_web_button_share_sheet" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-slate-900 transition-colors"
              aria-label="Instagram"
            >
              <Instagram className="w-4 h-4" />
            </a>
            <a 
              href={whatsappUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-slate-900 transition-colors"
              aria-label="WhatsApp"
            >
              <MessageSquare className="w-4 h-4" />
            </a>
            <a 
              href="/login" 
              className="hover:text-slate-900 transition-colors font-medium"
            >
              Operator Login
            </a>
          </div>

          <p className="font-mono text-[11px] tabular-nums">
            © {new Date().getFullYear()} Onemenu. All rights reserved.
          </p>

        </div>
      </footer>

    </div>
  );
}
