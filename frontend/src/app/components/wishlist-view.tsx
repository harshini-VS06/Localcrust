import { useState, useEffect } from "react";
import { Heart, Trash2, ShoppingCart, Package } from "lucide-react";
import { Card, CardContent } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { wishlistAPI, type WishlistItem } from "@/api/features";

interface WishlistViewProps {
  onAddToCart: (product: any) => void;
}

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

export function WishlistView({ onAddToCart }: WishlistViewProps) {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWishlist();
  }, []);

  const loadWishlist = async () => {
    try {
      setLoading(true);
      const data = await wishlistAPI.getWishlist();
      setWishlist(data.wishlist);
    } catch (error) {
      console.error("Failed to load wishlist:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (productId: number) => {
    try {
      await wishlistAPI.removeFromWishlist(productId);
      setWishlist(wishlist.filter((item) => item.product_id !== productId));
    } catch (error) {
      console.error("Failed to remove from wishlist:", error);
    }
  };

  const handleAddToCart = (product: any) => {
    onAddToCart(product);
    // Optionally remove from wishlist after adding to cart
    // handleRemove(product.id);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#D35400] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Wishlist Header - Positioned below navigation tabs */}
      <div className="bg-white border-b border-[#D35400]/10 fixed top-[141px] left-0 right-0 z-30 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <Heart className="w-8 h-8 text-[#D35400] fill-[#D35400]" />
            <h1 className="text-3xl text-[#4E342E]">My Wishlist</h1>
            <span className="bg-[#D35400] text-white px-3 py-1 rounded-full text-sm font-medium">
              {wishlist.length} items
            </span>
          </div>
        </div>
      </div>

      {/* Content - With proper top padding */}
      <div className="container mx-auto px-6 py-8 pt-24">
        {wishlist.length === 0 ? (
          <Card className="bg-white rounded-2xl border-2 border-[#D35400]/10">
            <CardContent className="p-12 text-center">
              <div className="w-32 h-32 bg-[#FFF9F5] rounded-full flex items-center justify-center mx-auto mb-6">
                <Heart className="w-16 h-16 text-[#D35400]/30" />
              </div>
              <h2 className="text-2xl text-[#4E342E] mb-3">Your wishlist is empty</h2>
              <p className="text-[#4E342E]/70 mb-6">
                Save your favorite items here and shop them later!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {wishlist.map((item, index) => (
              <Card
                key={item.id}
                className="group hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden border-2 border-[#D35400]/10 hover:border-[#D35400]/30 stagger-item hover-lift"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Product Image */}
                <div className="relative h-48 overflow-hidden bg-gradient-to-br from-[#FFE5D9] to-[#FFD4C1]">
                  <img
                    src={item.product.image_url || getCategoryImage(item.product.category)}
                    alt={item.product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute top-3 right-3 bg-[#2E7D32] text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">
                    ₹{Math.round(item.product.price)}
                  </div>
                  
                  {/* Remove Button */}
                  <button
                    onClick={() => handleRemove(item.product_id)}
                    className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm p-2 rounded-full hover:bg-red-50 transition-colors group/remove"
                  >
                    <Trash2 className="w-4 h-4 text-red-500 group-hover/remove:scale-110 transition-transform" />
                  </button>

                  {!item.product.in_stock && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold">
                        Out of Stock
                      </span>
                    </div>
                  )}
                </div>

                <CardContent className="p-5">
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-[#4E342E] mb-2 group-hover:text-[#D35400] transition-colors">
                      {item.product.name}
                    </h3>
                    <p className="text-sm text-[#4E342E]/70 line-clamp-2 mb-2">
                      {item.product.description || "Fresh and delicious bakery item"}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-[#4E342E]/60">
                      <Package className="w-4 h-4" />
                      <span>{item.product.baker.shop_name}</span>
                    </div>
                  </div>

                  {item.product.in_stock ? (
                    <Button
                      onClick={() => handleAddToCart(item.product)}
                      className="w-full bg-[#D35400] hover:bg-[#D35400]/90 text-white rounded-xl py-6 ripple"
                    >
                      <ShoppingCart className="w-5 h-5 mr-2" />
                      Add to Cart
                    </Button>
                  ) : (
                    <Button
                      disabled
                      className="w-full bg-gray-400 text-white rounded-xl py-6 cursor-not-allowed"
                    >
                      Out of Stock
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
