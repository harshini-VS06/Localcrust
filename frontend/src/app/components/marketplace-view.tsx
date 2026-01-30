import { useState, useEffect } from "react";
import { ShoppingCart, Search, Filter, X, Plus, Minus, MapPin, Heart, Bell, Sparkles, TrendingUp, User, LogOut, Settings, Package, Globe } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { marketplaceAPI, type Product, type CartItem } from "@/api/marketplace";
import { wishlistAPI } from "@/api/features";
import { ProductDetailModal } from "@/app/components/product-detail-modal";
import { CartSidebar } from "@/app/components/cart-sidebar";
import { NotificationsPanel, NotificationBell } from "@/app/components/notifications-panel";
import { WishlistView } from "@/app/components/wishlist-view";

import { AIRecipeModal } from "@/app/components/ai-recipe-modal";
import { CustomerProfile } from "@/app/components/customer-profile";

interface MarketplaceViewProps {
  onViewCart: () => void;
}

type ActiveView = 'marketplace' | 'wishlist' | 'profile';

const categories = [
  "All",
  "Bread",
  "Pastries",
  "Cakes",
  "Cookies",
  "Specialty Items",
];

const countries = [
  { value: "All Countries", label: "All Countries", flag: "🌍" },
  { value: "Italy", label: "Italy", flag: "🇮🇹" },
  { value: "Japan", label: "Japan", flag: "🇯🇵" },
  { value: "Portugal", label: "Portugal", flag: "🇵🇹" },
  { value: "Turkey", label: "Turkey", flag: "🇹🇷" },
  { value: "Denmark", label: "Denmark", flag: "🇩🇰" },
  { value: "Germany", label: "Germany", flag: "🇩🇪" },
  { value: "Austria", label: "Austria", flag: "🇦🇹" },
  { value: "Spain", label: "Spain", flag: "🇪🇸" },
  { value: "France", label: "France", flag: "🇫🇷" },
];

const getCategoryImage = (category: string) => {
  const images: Record<string, string> = {
    Bread: "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=400&h=300&fit=crop",
    Pastries: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop",
    Cakes: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=300&fit=crop",
    Cookies: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&h=300&fit=crop",
    "Specialty Items": "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&h=300&fit=crop",
  };
  return images[category] || images.Bread;
};

export function MarketplaceView({ onViewCart }: MarketplaceViewProps) {
  const [activeView, setActiveView] = useState<ActiveView>('marketplace');
  const [profileInitialTab, setProfileInitialTab] = useState<'orders' | 'reviews' | 'settings'>('orders');
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedCountry, setSelectedCountry] = useState("All Countries");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAIRecipes, setShowAIRecipes] = useState(false);
  const [wishlistIds, setWishlistIds] = useState<Set<number>>(new Set());
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowProfileMenu(false);
    if (showProfileMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showProfileMenu]);

  useEffect(() => {
    loadProducts();
    loadCartFromStorage();
    loadWishlistIds();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [selectedCategory, selectedCountry, searchQuery, products]);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await marketplaceAPI.getAllProducts();
      setProducts(response.products);
    } catch (error) {
      console.error("Failed to load products:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadWishlistIds = async () => {
    try {
      const response = await wishlistAPI.getWishlist();
      const ids = new Set(response.wishlist.map(item => item.product_id));
      setWishlistIds(ids);
    } catch (error) {
      console.error("Failed to load wishlist:", error);
    }
  };

  const loadCartFromStorage = () => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  };

  const filterProducts = () => {
    let filtered = products;

    if (selectedCategory !== "All") {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    if (selectedCountry !== "All Countries") {
      filtered = filtered.filter((p) => {
        const bakerCity = p.baker.city?.toLowerCase() || '';
        const bakerState = p.baker.state?.toLowerCase() || '';
        const bakerAddress = p.baker.shop_address?.toLowerCase() || '';
        
        // Map country names to city/state identifiers
        const countryMap: Record<string, string[]> = {
          'Italy': ['rome', 'italy', 'italia', 'lazio'],
          'Japan': ['tokyo', 'japan'],
          'Portugal': ['lisbon', 'lisboa', 'portugal'],
          'Turkey': ['istanbul', 'turkey', 'türkiye'],
          'Denmark': ['copenhagen', 'denmark', 'danish'],
          'Germany': ['munich', 'münchen', 'germany', 'bavaria'],
          'Austria': ['vienna', 'wien', 'austria'],
          'Spain': ['spain', 'españa', 'barcelona', 'madrid', 'seville'],
          'France': ['france', 'paris', 'lyon', 'marseille', 'french'],
          'India': ['india', 'delhi', 'mumbai', 'bangalore', 'chennai', 'kolkata'],
        };
        
        const keywords = countryMap[selectedCountry] || [];
        return keywords.some(keyword => 
          bakerCity.includes(keyword) || 
          bakerState.includes(keyword) || 
          bakerAddress.includes(keyword)
        );
      });
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.baker.shop_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  };

  const addToCart = (product: Product) => {
    const existingItem = cart.find((item) => item.product.id === product.id);

    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity === 0) {
      removeFromCart(productId);
    } else {
      setCart(
        cart.map((item) =>
          item.product.id === productId
            ? { ...item, quantity: newQuantity }
            : item
        )
      );
    }
  };

  const toggleWishlist = async (productId: number) => {
    try {
      if (wishlistIds.has(productId)) {
        await wishlistAPI.removeFromWishlist(productId);
        const newWishlistIds = new Set(wishlistIds);
        newWishlistIds.delete(productId);
        setWishlistIds(newWishlistIds);
        console.log(`Removed product ${productId} from wishlist`);
      } else {
        await wishlistAPI.addToWishlist(productId);
        setWishlistIds(new Set([...wishlistIds, productId]));
        console.log(`Added product ${productId} to wishlist`);
      }
    } catch (error: any) {
      console.error("Failed to toggle wishlist:", error);
      // Show user-friendly error
      if (error.message?.includes('401') || error.message?.includes('authentication')) {
        alert('Please log in to add items to your wishlist!');
      } else {
        alert('Failed to update wishlist. Please try again.');
      }
    }
  };

  const getTotalItems = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  };

  const getProductQuantityInCart = (productId: number) => {
    const item = cart.find((i) => i.product.id === productId);
    return item ? item.quantity : 0;
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    localStorage.removeItem('cart');
    window.location.href = '/';
  };

  const getUserInfo = () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : { name: 'Guest User', email: 'guest@example.com' };
  };

  const user = getUserInfo();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF9F5] via-[#FFF5ED] to-[#FDFBF7]">
      {/* Header */}
      <header className="bg-white border-b border-[#D35400]/10 fixed top-0 left-0 right-0 z-50 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl text-[#4E342E]">Local Crust</h1>
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-2xl mx-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#4E342E]/40" />
                <input
                  type="text"
                  placeholder="Search for breads, pastries, cakes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-[#4E342E]/20 focus:border-[#D35400] outline-none transition-smooth"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <NotificationBell onClick={() => setShowNotifications(true)} />
              
              <button
                onClick={() => setActiveView('wishlist')}
                className="relative p-2 hover:bg-[#FFF9F5] rounded-lg transition-colors"
              >
                <Heart className={activeView === 'wishlist' ? "w-6 h-6 text-red-500 fill-red-500" : "w-6 h-6 text-[#4E342E]"} />
                {wishlistIds.size > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {wishlistIds.size}
                  </span>
                )}
              </button>

              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowProfileMenu(!showProfileMenu);
                  }}
                  className="relative p-2 hover:bg-[#FFF9F5] rounded-lg transition-colors"
                >
                  <User className="w-6 h-6 text-[#4E342E]" />
                </button>

                {showProfileMenu && (
                  <>
                    <div 
                      className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-[#D35400]/20 overflow-hidden z-50 animate-fadeIn"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="bg-gradient-to-r from-[#D35400] to-[#E67E22] p-4 text-white">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                            <User className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-bold text-lg">{user.name}</p>
                            <p className="text-sm text-white/80">{user.email}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-2">
                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            setActiveView('profile');
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#FFF9F5] rounded-lg transition-colors text-left"
                        >
                          <Package className="w-5 h-5 text-[#D35400]" />
                          <div>
                            <p className="font-medium text-[#4E342E]">My Orders</p>
                            <p className="text-xs text-[#4E342E]/60">Track your purchases</p>
                          </div>
                        </button>

                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            setActiveView('profile');
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#FFF9F5] rounded-lg transition-colors text-left"
                        >
                          <Settings className="w-5 h-5 text-[#D35400]" />
                          <div>
                            <p className="font-medium text-[#4E342E]">Settings</p>
                            <p className="text-xs text-[#4E342E]/60">Manage your account</p>
                          </div>
                        </button>

                        <div className="my-2 border-t border-[#D35400]/10" />

                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 rounded-lg transition-colors text-left"
                        >
                          <LogOut className="w-5 h-5 text-red-500" />
                          <div>
                            <p className="font-medium text-red-500">Logout</p>
                            <p className="text-xs text-red-400">Sign out of your account</p>
                          </div>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => setIsCartOpen(true)}
                className="relative flex items-center gap-2 bg-[#D35400] hover:bg-[#D35400]/90 text-white px-6 py-3 rounded-xl shadow-lg transition-all hover-lift"
              >
                <ShoppingCart className="w-5 h-5" />
                <span className="font-medium">Cart</span>
                {getTotalItems() > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[#2E7D32] text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center animate-bounce">
                    {getTotalItems()}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-[#D35400]/10 fixed top-[73px] left-0 right-0 z-40">
        <div className="container mx-auto px-6 pt-3 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveView('marketplace')}
                className={`px-6 py-4 font-medium transition-all ${
                  activeView === 'marketplace'
                    ? 'text-[#D35400] border-b-2 border-[#D35400]'
                    : 'text-[#4E342E]/60 hover:text-[#4E342E]'
                }`}
              >
                <ShoppingCart className="w-4 h-4 inline mr-2" />
                Shop
              </button>
              <button
                onClick={() => setActiveView('wishlist')}
                className={`px-6 py-4 font-medium transition-all ${
                  activeView === 'wishlist'
                    ? 'text-[#D35400] border-b-2 border-[#D35400]'
                    : 'text-[#4E342E]/60 hover:text-[#4E342E]'
                }`}
              >
                <Heart className="w-4 h-4 inline mr-2" />
                Wishlist
                {wishlistIds.size > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {wishlistIds.size}
                  </span>
                )}
              </button>

            </div>
            
            {/* AI Recipe Button - Small and Compact */}
            {cart.length > 0 && (
              <button
                onClick={() => setShowAIRecipes(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-[#D35400] to-[#E67E22] text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all text-sm font-medium"
              >
                <Sparkles className="w-4 h-4" />
                AI Recipes
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="animate-fadeIn pt-[209px]">
        {/* Marketplace View */}
        {activeView === 'marketplace' && (
          <>
            {/* Category Filter */}
            <div className="bg-white/60 backdrop-blur-sm border-b border-[#D35400]/10 fixed top-[141px] left-0 right-0 z-30">
              <div className="container mx-auto px-6 pt-5 pb-4">
                {/* Filters */}
                <div className="flex items-center gap-3 overflow-x-auto">
                  <Filter className="w-5 h-5 text-[#4E342E]/60 flex-shrink-0" />
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-6 py-2 rounded-full whitespace-nowrap transition-all hover-lift ${
                        selectedCategory === category
                          ? "bg-[#D35400] text-white shadow-md"
                          : "bg-white text-[#4E342E]/70 hover:bg-[#FFF9F5] border border-[#D35400]/20"
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                  
                  {/* Country Dropdown */}
                  <div className="ml-auto flex-shrink-0">
                    <div className="relative">
                      <select
                        value={selectedCountry}
                        onChange={(e) => setSelectedCountry(e.target.value)}
                        className="appearance-none bg-white border-2 border-[#2E7D32]/30 text-[#4E342E] pl-10 pr-10 py-2 rounded-full cursor-pointer hover:border-[#2E7D32] focus:border-[#2E7D32] focus:outline-none transition-all shadow-sm hover:shadow-md text-sm font-medium"
                      >
                        {countries.map((country) => (
                          <option key={country.value} value={country.value}>
                            {country.flag} {country.label}
                          </option>
                        ))}
                      </select>
                      <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#2E7D32] pointer-events-none" />
                      <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#4E342E] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Products Grid */}
            <div className="container mx-auto px-6 py-8">
              {loading ? (
                <div className="text-center py-20">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#D35400] border-t-transparent"></div>
                  <p className="mt-4 text-[#4E342E]/70">Loading delicious items...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-xl text-[#4E342E]/70">No products found</p>
                  <p className="text-[#4E342E]/50 mt-2">Try a different category or search term</p>
                </div>
              ) : (
                <>
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-2xl text-[#4E342E]">
                      {selectedCategory === "All" && selectedCountry === "All Countries" 
                        ? "All Products" 
                        : `${selectedCountry !== "All Countries" ? selectedCountry + " " : ""}${selectedCategory !== "All" ? selectedCategory : "Products"}`}
                      <span className="text-[#4E342E]/60 text-lg ml-2">
                        ({filteredProducts.length} items)
                      </span>
                    </h2>
                    <div className="flex items-center gap-2 text-sm text-[#4E342E]/70">
                      <TrendingUp className="w-4 h-4" />
                      <span>
                        {selectedCountry !== "All Countries" 
                          ? `From ${countries.find(c => c.value === selectedCountry)?.flag} ${selectedCountry}` 
                          : "From around the world 🌍"}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredProducts.map((product, index) => {
                      const quantityInCart = getProductQuantityInCart(product.id);
                      const isInWishlist = wishlistIds.has(product.id);
                      
                      return (
                        <Card
                          key={product.id}
                          className="group hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden cursor-pointer border-2 border-[#D35400]/10 hover:border-[#D35400]/30 stagger-item hover-lift"
                          style={{ animationDelay: `${index * 0.05}s` }}
                        >
                          <div onClick={() => setSelectedProduct(product)}>
                            <div className="relative h-48 overflow-hidden bg-gradient-to-br from-[#FFE5D9] to-[#FFD4C1]">
                              <img
                                src={product.image_url || getCategoryImage(product.category)}
                                alt={product.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                              />
                              <div className="absolute top-3 right-3 bg-[#2E7D32] text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">
                                ₹{Math.round(product.price)}
                              </div>
                              
                              {/* Wishlist Heart Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleWishlist(product.id);
                                }}
                                className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm p-2 rounded-full hover:bg-white hover:scale-110 transition-all duration-200 active:scale-95"
                                title={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
                              >
                                <Heart className={`w-5 h-5 transition-all duration-200 ${isInWishlist ? 'fill-red-500 text-red-500 scale-110' : 'text-gray-400 hover:text-red-400'}`} />
                              </button>

                              {!product.in_stock && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                  <span className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold">
                                    Out of Stock
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          <CardContent className="p-5">
                            <div onClick={() => setSelectedProduct(product)} className="mb-4">
                              <h3 className="text-lg font-medium text-[#4E342E] mb-2 group-hover:text-[#D35400] transition-colors">
                                {product.name}
                              </h3>
                              <div className="flex items-center gap-2 text-sm text-[#4E342E]/60 mb-2">
                                <MapPin className="w-4 h-4" />
                                <span>{product.baker.shop_name}</span>
                              </div>
                              <p className="text-sm text-[#4E342E]/70 line-clamp-2">
                                {product.description || "Fresh and delicious bakery item"}
                              </p>
                            </div>

                            {product.in_stock && (
                              <>
                                {quantityInCart === 0 ? (
                                  <Button
                                    onClick={() => addToCart(product)}
                                    className="w-full bg-[#D35400] hover:bg-[#D35400]/90 text-white rounded-xl py-6 ripple"
                                  >
                                    Add to Cart
                                  </Button>
                                ) : (
                                  <div className="flex items-center justify-between bg-[#D35400] rounded-xl p-2">
                                    <button
                                      onClick={() => updateQuantity(product.id, quantityInCart - 1)}
                                      className="bg-white text-[#D35400] w-10 h-10 rounded-lg flex items-center justify-center hover:bg-[#FFF9F5] transition-colors"
                                    >
                                      <Minus className="w-5 h-5" />
                                    </button>
                                    <span className="text-white font-bold text-lg px-4">
                                      {quantityInCart}
                                    </span>
                                    <button
                                      onClick={() => updateQuantity(product.id, quantityInCart + 1)}
                                      className="bg-white text-[#D35400] w-10 h-10 rounded-lg flex items-center justify-center hover:bg-[#FFF9F5] transition-colors"
                                    >
                                      <Plus className="w-5 h-5" />
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* Wishlist View */}
        {activeView === 'wishlist' && (
          <WishlistView onAddToCart={addToCart} />
        )}

        {/* Profile View */}
        {activeView === 'profile' && (
          <CustomerProfile 
            onBack={() => {
              setActiveView('marketplace');
              setProfileInitialTab('orders'); // Reset to orders tab when going back
            }} 
            initialTab={profileInitialTab}
          />
        )}
      </div>

      {/* Modals */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={addToCart}
          quantityInCart={getProductQuantityInCart(selectedProduct.id)}
          onUpdateQuantity={updateQuantity}
        />
      )}

      <CartSidebar
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeFromCart}
      />

      <NotificationsPanel
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        onNavigateToReviews={() => {
          setShowNotifications(false);
          setProfileInitialTab('reviews');
          setActiveView('profile');
        }}
      />

      {showAIRecipes && (
        <AIRecipeModal
          cartItems={cart.map(item => item.product.name)}
          onClose={() => setShowAIRecipes(false)}
        />
      )}
    </div>
  );
}
