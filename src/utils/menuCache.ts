// Helper functions for offline caching and fallback menus

export const DEFAULT_FALLBACK_RESTAURANT = {
  id: 'demo-restaurant-1',
  name: 'Le Petit Gourmet & Cafe',
  slug: 'le-petit-gourmet',
  phone: '+212 600 000 000',
  instagram: 'lepetitgourmet',
  address: 'Center City, Main Boulevard',
  description: 'Artisanal burgers, authentic wood-fired pizzas, fresh salads, and delicious drinks.',
  coverImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80',
  logoUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80'
};

export const DEFAULT_FALLBACK_MENU = {
  id: 'demo-restaurant-1',
  restaurantId: 'demo-restaurant-1',
  updatedAt: new Date().toISOString(),
  categories: [
    {
      name: 'Burgers Gourmet',
      imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
      items: [
        {
          name: 'Classic Cheeseburger',
          price: 45,
          description: '100% pure beef patty, melted cheddar, crispy lettuce, tomato, pickles & signature sauce.',
          imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80'
        },
        {
          name: 'Smokey BBQ Bacon Burger',
          price: 55,
          description: 'Double beef patty, smoked bacon, caramelized onions, crispy onion rings & hickory BBQ sauce.',
          imageUrl: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?auto=format&fit=crop&w=800&q=80'
        }
      ]
    },
    {
      name: 'Pizzas Artisanales',
      imageUrl: 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?auto=format&fit=crop&w=800&q=80',
      items: [
        {
          name: 'Pizza Margherita Supreme',
          price: 50,
          description: 'San Marzano tomato sauce, fresh mozzarella di bufala, basil & extra virgin olive oil.',
          imageUrl: 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?auto=format&fit=crop&w=800&q=80'
        },
        {
          name: 'Pizza Quattro Formaggi',
          price: 65,
          description: 'Mozzarella, gorgonzola, parmesan, and creamy ricotta on garlic herb crust.',
          imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80'
        }
      ]
    },
    {
      name: 'Suppléments & Extras',
      imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=800&q=80',
      items: [
        {
          name: 'Extra Double Cheddar',
          price: 5,
          description: 'Slice of rich melted cheddar cheese topping.',
          imageUrl: 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?auto=format&fit=crop&w=800&q=80'
        },
        {
          name: 'Sauce House Garlic Dip',
          price: 5,
          description: 'Creamy homemade garlic dip.',
          imageUrl: 'https://images.unsplash.com/photo-1472476443507-c7a5948772fc?auto=format&fit=crop&w=800&q=80'
        },
        {
          name: 'Frites Croustillantes Extra',
          price: 15,
          description: 'Golden crispy french fries basket with seasoning.',
          imageUrl: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=800&q=80'
        }
      ]
    },
    {
      name: 'Boissons & Drinks',
      imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80',
      items: [
        {
          name: 'Coca-Cola Zero 33cl',
          price: 12,
          description: 'Chilled refreshing can.',
          imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800&q=80'
        },
        {
          name: 'Jus d’Orange Frais',
          price: 20,
          description: '100% freshly squeezed orange juice.',
          imageUrl: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=800&q=80'
        }
      ]
    }
  ]
};

export function saveRestaurantAndMenuToCache(restaurant: any, menu: any) {
  if (!restaurant) return;
  try {
    if (restaurant.id) {
      localStorage.setItem(`cached_restaurant_${restaurant.id}`, JSON.stringify(restaurant));
    }
    if (restaurant.slug) {
      localStorage.setItem(`cached_restaurant_${restaurant.slug}`, JSON.stringify(restaurant));
    }

    if (menu) {
      if (restaurant.id) {
        localStorage.setItem(`cached_menu_${restaurant.id}`, JSON.stringify(menu));
      }
      if (restaurant.slug) {
        localStorage.setItem(`cached_menu_${restaurant.slug}`, JSON.stringify(menu));
      }
      localStorage.setItem(`cached_menu_last`, JSON.stringify({ restaurant, menu }));
    }

    // Also update cached_restaurants array
    const cachedRestsStr = localStorage.getItem('cached_restaurants');
    let rests: any[] = cachedRestsStr ? JSON.parse(cachedRestsStr) : [];
    if (!Array.isArray(rests)) rests = [];

    const existingIdx = rests.findIndex(r => r.id === restaurant.id || (r.slug && r.slug === restaurant.slug));
    if (existingIdx >= 0) {
      rests[existingIdx] = { ...rests[existingIdx], ...restaurant };
    } else {
      rests.unshift(restaurant);
    }
    localStorage.setItem('cached_restaurants', JSON.stringify(rests));
  } catch (e) {
    console.warn("Failed to save to localStorage cache:", e);
  }
}

export function getCachedRestaurantAndMenu(restaurantId?: string): { restaurant: any, menu: any } {
  try {
    // 1. Direct key lookup by ID or slug
    if (restaurantId) {
      const restStr = localStorage.getItem(`cached_restaurant_${restaurantId}`);
      const menuStr = localStorage.getItem(`cached_menu_${restaurantId}`);

      if (restStr && menuStr) {
        return { restaurant: JSON.parse(restStr), menu: JSON.parse(menuStr) };
      }
      if (restStr) {
        const rest = JSON.parse(restStr);
        // try finding menu with rest.id or rest.slug
        const m1 = localStorage.getItem(`cached_menu_${rest.id}`) || localStorage.getItem(`cached_menu_${rest.slug}`);
        if (m1) {
          return { restaurant: rest, menu: JSON.parse(m1) };
        }
      }
    }

    // 2. Search cached_restaurants array
    const cachedRestsStr = localStorage.getItem('cached_restaurants');
    if (cachedRestsStr) {
      const rests: any[] = JSON.parse(cachedRestsStr);
      if (Array.isArray(rests) && rests.length > 0) {
        // match by restaurantId or slug
        let matched = restaurantId ? rests.find(r => r.id === restaurantId || r.slug === restaurantId) : null;
        if (!matched && rests.length > 0) {
          matched = rests[0]; // fallback to first restaurant in cache
        }

        if (matched) {
          const mStr = localStorage.getItem(`cached_menu_${matched.id}`) || localStorage.getItem(`cached_menu_${matched.slug}`);
          if (mStr) {
            return { restaurant: matched, menu: JSON.parse(mStr) };
          }
          // If no specific menu for matched, return default fallback menu attached to this restaurant
          return {
            restaurant: matched,
            menu: { ...DEFAULT_FALLBACK_MENU, id: matched.id, restaurantId: matched.id }
          };
        }
      }
    }

    // 3. Try last saved menu
    const lastSavedStr = localStorage.getItem('cached_menu_last');
    if (lastSavedStr) {
      const last = JSON.parse(lastSavedStr);
      if (last.restaurant && last.menu) {
        return { restaurant: last.restaurant, menu: last.menu };
      }
    }
  } catch (e) {
    console.warn("Error reading cached restaurant and menu:", e);
  }

  // 4. Default fallback
  return {
    restaurant: DEFAULT_FALLBACK_RESTAURANT,
    menu: DEFAULT_FALLBACK_MENU
  };
}
