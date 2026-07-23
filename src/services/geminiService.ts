import { GoogleGenAI } from "@google/genai";

let ai: GoogleGenAI | null = null;

const getAI = () => {
  if (!ai) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.error("GEMINI_API_KEY environment variable is missing.");
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    ai = new GoogleGenAI({ apiKey: key });
  }
  return ai;
};

export const digitizeMenuImage = async (images: {base64Image: string, mimeType: string}[]) => {
  try {
    const aiInstance = getAI();
    
    const parts: any[] = images.map(img => ({
      inlineData: {
        data: img.base64Image.split(',')[1], // Remove data:image/jpeg;base64, prefix
        mimeType: img.mimeType,
      },
    }));

    parts.push({
      text: `Extract all menu items, descriptions, and prices from these images.
      IMPORTANT: You must extract and preserve the exact food categories and sections listed in the menu image (for example: "Pizza", "Tacos", "Tajines", "Couscous", "Poissons" (or Poison), "Grillades", "Entrées", "Plats", "Desserts", "Boissons", "Burgers", etc.). 
      DO NOT merge, omit, or consolidate distinct food categories into generic ones like "Mains" or "Starters" unless they are explicitly written that way on the menu. Keep all food categories exactly as they appear in the original language of the menu.

      Return ONLY a valid JSON object with the following structure. Do not include markdown formatting like \`\`\`json.
      {
        "categories": [
          {
            "name": "Exact category/section name from the menu (e.g. Pizza, Tacos, Tajines, Couscous, Poissons, etc.)",
            "items": [
              {
                "name": "Item Name",
                "description": "Item Description (if any, otherwise empty string)",
                "price": 10.50
              }
            ]
          }
        ]
      }
      For the price, return a number, not a string, and remove currency symbols. Combine items from all images into a single cohesive menu structure.`,
    });

    const response = await aiInstance.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: parts,
      },
      config: {
        responseMimeType: "application/json",
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    throw new Error("No text returned from Gemini");
  } catch (error: any) {
    console.error("Error digitizing menu:", error);
    if (error?.message?.includes('429') || error?.status === 'RESOURCE_EXHAUSTED' || JSON.stringify(error).includes('RESOURCE_EXHAUSTED')) {
      throw new Error("Gemini API rate limit reached. Please wait a moment and try again.");
    }
    throw error;
  }
};

export interface LibraryPhotoEntry {
  id: string;
  name: string;
  imageUrl: string;
  category?: string;
  tags?: string[];
  restaurant?: string;
}

export interface MenuItemToMatch {
  id?: string;
  name: string;
  description?: string;
  categoryName?: string;
}

export interface MatchResult {
  itemName: string;
  matchedLibraryId: string | null;
  matchedImageUrl: string | null;
  confidence: number;
  matchReason?: string;
}

export const semanticMatchMenuWithLibrary = async (
  menuItems: MenuItemToMatch[],
  libraryPhotos: LibraryPhotoEntry[]
): Promise<MatchResult[]> => {
  if (!menuItems.length || !libraryPhotos.length) {
    return menuItems.map(item => ({
      itemName: item.name,
      matchedLibraryId: null,
      matchedImageUrl: null,
      confidence: 0
    }));
  }

  try {
    const aiInstance = getAI();

    const librarySummary = libraryPhotos.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category || '',
      tags: p.tags || []
    }));

    const itemsSummary = menuItems.map(m => ({
      name: m.name,
      category: m.categoryName || '',
      description: m.description || ''
    }));

    const prompt = `You are an expert food image matching AI for restaurant digital menus.
Given a list of NEW menu items and an existing LIBRARY of food photos (with item names, categories, and tags), perform intelligent semantic matching.

Rules:
1. Understand food synonyms, multilingual names (French, English, Arabic, Italian, Spanish, e.g. "Margherita Pizza" vs "Pizza Margherita", "Poulet" vs "Chicken", "Tajine" vs "Tagine", "Frites" vs "Fries", "Boisson" vs "Soft Drink", "Poisson" vs "Fish").
2. Compare food item name, category, and ingredient description against the library item name, category, and tags.
3. Match items semantically even if the word order is flipped, singular/plural, or translated, but DO NOT match completely different dish types (e.g. DO NOT match "Beef Burger" with "Beef Pizza", DO NOT match "Chicken Tacos" with "Chicken Salad").
4. If a match is found with high confidence (>= 0.60), return the matched library item ID.
5. If multiple photos in the library match, pick the ID of the highest quality and most specific match.
6. If no confident match exists, return null for matchedLibraryId.

NEW MENU ITEMS:
${JSON.stringify(itemsSummary, null, 2)}

EXISTING PHOTO LIBRARY:
${JSON.stringify(librarySummary, null, 2)}

Return ONLY a JSON array of match objects with this exact structure:
[
  {
    "itemName": "Exact Name of New Item",
    "matchedLibraryId": "library_id_or_null",
    "confidence": 0.95,
    "matchReason": "Brief reason for match or why no match"
  }
]`;

    const response = await aiInstance.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    if (response.text) {
      const rawMatches: { itemName: string; matchedLibraryId: string | null; confidence: number; matchReason?: string }[] = JSON.parse(response.text);
      
      const photoMap = new Map<string, string>();
      libraryPhotos.forEach(p => photoMap.set(p.id, p.imageUrl));

      return menuItems.map(item => {
        const found = rawMatches.find(m => m.itemName?.toLowerCase().trim() === item.name.toLowerCase().trim()) 
          || rawMatches.find(m => m.itemName && item.name.toLowerCase().includes(m.itemName.toLowerCase()));
        
        if (found && found.matchedLibraryId && photoMap.has(found.matchedLibraryId) && (found.confidence >= 0.55)) {
          return {
            itemName: item.name,
            matchedLibraryId: found.matchedLibraryId,
            matchedImageUrl: photoMap.get(found.matchedLibraryId) || null,
            confidence: found.confidence,
            matchReason: found.matchReason
          };
        }

        return {
          itemName: item.name,
          matchedLibraryId: null,
          matchedImageUrl: null,
          confidence: 0,
          matchReason: 'No confident semantic match in library'
        };
      });
    }

    return localSemanticMatchMenuWithLibrary(menuItems, libraryPhotos);

  } catch (error: any) {
    console.warn("Gemini API call note (falling back to high-precision local semantic photo matcher):", error?.message || error);
    return localSemanticMatchMenuWithLibrary(menuItems, libraryPhotos);
  }
};

const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const FOOD_DICTIONARY: Record<string, string[]> = {
  poulet: ["chicken", "chiken"],
  chicken: ["poulet"],
  frites: ["fries", "french fries", "batata"],
  fries: ["frites"],
  boisson: ["drink", "soda", "beverage", "jus", "coca"],
  drink: ["boisson", "beverage", "soda"],
  poisson: ["fish", "piscado"],
  fish: ["poisson"],
  viande: ["meat", "beef", "kefta"],
  meat: ["viande", "beef"],
  hache: ["ground beef", "kefta"],
  sauce: ["dressing", "dip"],
  fromage: ["cheese"],
  cheese: ["fromage"],
  eau: ["water"],
  water: ["eau"]
};

export const localSemanticMatchMenuWithLibrary = (
  menuItems: MenuItemToMatch[],
  libraryPhotos: LibraryPhotoEntry[]
): MatchResult[] => {
  return menuItems.map(item => {
    const rawName = item.name || '';
    const normName = normalizeString(rawName);
    const normCategory = normalizeString(item.categoryName || '');

    if (!normName) {
      return { itemName: rawName, matchedLibraryId: null, matchedImageUrl: null, confidence: 0 };
    }

    let bestMatch: LibraryPhotoEntry | null = null;
    let highestScore = 0;

    for (const photo of libraryPhotos) {
      const normLibName = normalizeString(photo.name || '');
      const normLibCat = normalizeString(photo.category || '');
      const libTags = (photo.tags || []).map(t => normalizeString(t));

      let score = 0;

      // 1. Exact match
      if (normName === normLibName) {
        score = 0.98;
      }
      // 2. Substring match
      else if (normName.includes(normLibName) || normLibName.includes(normName)) {
        const lenRatio = Math.min(normName.length, normLibName.length) / Math.max(normName.length, normLibName.length);
        score = 0.75 + 0.15 * lenRatio;
      }
      // 3. Token overlap Jaccard
      else {
        const itemTokens = new Set(normName.split(" ").filter(w => w.length > 2));
        const libTokens = new Set(normLibName.split(" ").filter(w => w.length > 2));

        itemTokens.forEach(token => {
          if (FOOD_DICTIONARY[token]) {
            FOOD_DICTIONARY[token].forEach(syn => itemTokens.add(syn));
          }
        });

        let overlap = 0;
        itemTokens.forEach(t => {
          if (libTokens.has(t) || libTags.some(tag => tag.includes(t))) {
            overlap++;
          }
        });

        if (itemTokens.size > 0 && overlap > 0) {
          const jaccard = overlap / Math.max(itemTokens.size, libTokens.size);
          if (jaccard > 0.25) {
            score = 0.55 + jaccard * 0.35;
          }
        }
      }

      if (score > 0.5 && normCategory && normLibCat) {
        if (normCategory === normLibCat || normCategory.includes(normLibCat) || normLibCat.includes(normCategory)) {
          score = Math.min(0.99, score + 0.08);
        }
      }

      if (score > highestScore) {
        highestScore = score;
        bestMatch = photo;
      }
    }

    if (bestMatch && highestScore >= 0.55) {
      return {
        itemName: rawName,
        matchedLibraryId: bestMatch.id,
        matchedImageUrl: bestMatch.imageUrl,
        confidence: Number(highestScore.toFixed(2)),
        matchReason: `Matched with photo library item "${bestMatch.name}"`
      };
    }

    return {
      itemName: rawName,
      matchedLibraryId: null,
      matchedImageUrl: null,
      confidence: 0,
      matchReason: 'No match in photo library'
    };
  });
};

export const generateFoodMetadata = async (itemName: string, categoryName?: string, description?: string): Promise<string[]> => {
  try {
    const aiInstance = getAI();
    const prompt = `For the food item "${itemName}" (Category: "${categoryName || ''}", Description: "${description || ''}"), generate a list of 4-8 relevant search tags in English and French (e.g. ingredients, dish type, cuisines, alternative spellings, synonyms).
    Return JSON: { "tags": ["tag1", "tag2", ...] }`;

    const response = await aiInstance.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    if (response.text) {
      const parsed = JSON.parse(response.text);
      if (Array.isArray(parsed.tags) && parsed.tags.length > 0) {
        return parsed.tags;
      }
    }
  } catch (e) {
    console.warn("Gemini tag generation notice (using fallback tag generator):", e);
  }

  // Fallback local tag generator
  const nameWords = itemName.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
  const catWords = categoryName ? categoryName.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2) : [];
  return Array.from(new Set([...nameWords, ...catWords, itemName.trim()]));
};

/**
 * Searches the web for a clean, high-resolution, professional food photograph
 * for a specific menu item. Excludes watermarked stock photo sites.
 * Does NOT rely on or reuse any existing saved image library or local database.
 */
export const searchWebFoodImage = async (
  itemName: string,
  categoryName?: string,
  description?: string
): Promise<{ imageUrl: string; source: string }> => {
  const forbiddenDomains = [
    'shutterstock', 'istockphoto', 'adobestock', 'freepik', 
    'depositphotos', 'dreamstime', 'alamy', 'vectorstock', 
    '123rf', 'gettyimages', 'stock.adobe'
  ];

  const cleanItemName = itemName.trim();
  const cleanCategory = categoryName ? categoryName.trim() : '';
  const searchQuery = `${cleanItemName} ${cleanCategory} food dish`.trim();

  // 1. Unsplash Web Search (Clean, professional, high-res, watermark-free food photography)
  try {
    const unsplashApiUrl = `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=10`;
    const res = await fetch(unsplashApiUrl);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.results) && data.results.length > 0) {
        for (const photo of data.results) {
          if (photo && photo.urls && photo.urls.regular) {
            const imgUrl = photo.urls.regular;
            const isStock = forbiddenDomains.some(domain => imgUrl.toLowerCase().includes(domain));
            if (!isStock) {
              return { imageUrl: imgUrl, source: 'Unsplash Web Search' };
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn(`Unsplash search note for "${cleanItemName}":`, err);
  }

  // 2. Wikimedia Commons Web Search (Watermark-free, authentic culinary photography)
  try {
    const wikiQuery = `${cleanItemName} food`.trim();
    const wikiUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(wikiQuery)}&gsrnamespace=6&prop=imageinfo&iiprop=url|mime|size&format=json&origin=*`;
    const res = await fetch(wikiUrl);
    if (res.ok) {
      const data = await res.json();
      if (data && data.query && data.query.pages) {
        const pages = Object.values(data.query.pages) as any[];
        for (const page of pages) {
          const info = page.imageinfo?.[0];
          if (info && info.url) {
            const urlLower = info.url.toLowerCase();
            const isValidExt = urlLower.endsWith('.jpg') || urlLower.endsWith('.jpeg') || urlLower.endsWith('.png') || urlLower.endsWith('.webp');
            const isStock = forbiddenDomains.some(domain => urlLower.includes(domain));
            if (isValidExt && !isStock && !urlLower.includes('logo') && !urlLower.includes('icon')) {
              return { imageUrl: info.url, source: 'Wikimedia Web Search' };
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn(`Wikimedia search note for "${cleanItemName}":`, err);
  }

  // 3. Gemini with Google Search Grounding for direct web food image search
  try {
    const aiInstance = getAI();
    const prompt = `Perform a web image search for a professional, realistic, high-quality food photograph of the dish: "${cleanItemName}" (Category: "${cleanCategory}", Description: "${description || ''}").

CRITICAL RULES:
1. Search for direct image URLs ending in .jpg, .jpeg, .png, or .webp from public food blogs, recipe sites, or restaurant pages.
2. Absolutely DO NOT select images with visible watermarks or from paid stock photo sites (e.g., Shutterstock, iStock, Adobe Stock, Freepik, Depositphotos, Dreamstime, Alamy, Getty).
3. The image must be clean, restaurant-style food photography.
4. Return ONLY a JSON object: { "imageUrl": "https://..." }`;

    const response = await aiInstance.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json"
      }
    });

    if (response.text) {
      const parsed = JSON.parse(response.text);
      if (parsed.imageUrl && typeof parsed.imageUrl === 'string' && parsed.imageUrl.startsWith('http')) {
        const isStock = forbiddenDomains.some(domain => parsed.imageUrl.toLowerCase().includes(domain));
        if (!isStock) {
          return { imageUrl: parsed.imageUrl, source: 'Gemini Web Search' };
        }
      }
    }
  } catch (err) {
    console.warn(`Gemini web search note for "${cleanItemName}":`, err);
  }

  // 4. Reliable Unsplash Source fallback
  return { 
    imageUrl: `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80`, 
    source: 'Web Food Search' 
  };
};

/**
 * Searches the web independently for fresh images for all menu items in a category list.
 * Completely ignores saved libraries or local databases.
 */
export const searchWebPhotosForEntireMenu = async (
  categories: any[],
  onProgress?: (processed: number, total: number, currentItem: string) => void
): Promise<{ updatedCategories: any[]; totalSearched: number; successCount: number }> => {
  let totalItemsCount = 0;
  categories.forEach(cat => {
    totalItemsCount += (cat.items || []).length;
  });

  let processedCount = 0;
  let successCount = 0;

  const updatedCategories = [];

  for (const cat of categories) {
    const updatedItems = [];
    for (const item of (cat.items || [])) {
      processedCount++;
      if (onProgress) {
        onProgress(processedCount, totalItemsCount, item.name || 'Dish');
      }

      try {
        // Trigger a fresh, independent web search for every item
        const result = await searchWebFoodImage(item.name, cat.name, item.description);
        if (result && result.imageUrl) {
          successCount++;
          updatedItems.push({
            ...item,
            imageUrl: result.imageUrl,
            isWebSearched: true,
            webSearchSource: result.source,
            isAiMatched: false
          });
        } else {
          updatedItems.push({ ...item, isWebSearched: false });
        }
      } catch (err) {
        console.error(`Error searching web photo for ${item.name}:`, err);
        updatedItems.push({ ...item, isWebSearched: false });
      }
    }

    updatedCategories.push({
      ...cat,
      items: updatedItems
    });
  }

  return {
    updatedCategories,
    totalSearched: totalItemsCount,
    successCount
  };
};
