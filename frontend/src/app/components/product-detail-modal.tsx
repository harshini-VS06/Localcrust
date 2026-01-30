import { ArrowLeft, MapPin, Store, Plus, Minus, ShoppingCart, Heart, Star, Users, Clock, Check } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import type { Product } from "@/api/marketplace";

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
  quantityInCart: number;
  onUpdateQuantity: (productId: number, quantity: number) => void;
}

const getCategoryImage = (category: string) => {
  const images: Record<string, string> = {
    Bread: "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=800&h=600&fit=crop",
    Pastries: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&h=600&fit=crop",
    Cakes: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&h=600&fit=crop",
    Cookies: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800&h=600&fit=crop",
    "Specialty Items": "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&h=600&fit=crop",
  };
  return images[category] || images.Bread;
};

export function ProductDetailModal({
  product,
  onClose,
  onAddToCart,
  quantityInCart,
  onUpdateQuantity,
}: ProductDetailModalProps) {
  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#FFF9F5] via-[#FFF5ED] to-[#FDFBF7] z-50 overflow-y-auto">
      <div className="min-h-screen">
        {/* Header */}
        <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-[#D35400]/10 z-10">
          <div className="container mx-auto px-6 py-4">
            <button
              onClick={onClose}
              className="flex items-center gap-2 text-[#4E342E] hover:text-[#D35400] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Market</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-6 py-8">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Left Column - Image */}
            <div className="sticky top-24 h-fit">
              <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#FFE5D9] to-[#FFD4C1] aspect-square shadow-2xl">
                <img
                  src={product.image_url || getCategoryImage(product.category)}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                {!product.in_stock && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="bg-red-500 text-white px-6 py-3 rounded-xl font-bold text-lg">
                      Out of Stock
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Details */}
            <div className="space-y-6">
              {/* Category Badge */}
              <div>
                <span className="inline-block bg-[#D35400]/10 text-[#D35400] px-4 py-1.5 rounded-full text-sm font-semibold uppercase tracking-wide">
                  {product.category}
                </span>
              </div>

              {/* Product Name */}
              <h1 className="text-5xl lg:text-6xl font-serif text-[#4E342E] leading-tight">
                {product.name}
              </h1>

              {/* Price and Stock Status */}
              <div className="flex items-baseline gap-4">
                <div className="text-5xl font-bold text-[#4E342E]">
                  ₹{Math.round(product.price)}
                </div>
                {product.in_stock && (
                  <div className="flex items-center gap-2 bg-[#E8F5E9] px-3 py-1.5 rounded-full">
                    <Check className="w-4 h-4 text-[#2E7D32]" />
                    <span className="text-sm font-medium text-[#2E7D32]">Freshly Baked Today</span>
                  </div>
                )}
              </div>

              {/* Description */}
              <p className="text-lg text-[#4E342E]/80 leading-relaxed">
                {product.description ||
                  "Double-stuffed dark chocolate layers in buttery puff pastry."}
              </p>

              {/* Add to Cart Section */}
              {product.in_stock && (
                <div className="py-6">
                  {quantityInCart === 0 ? (
                    <Button
                      onClick={() => onAddToCart(product)}
                      className="w-full bg-[#D35400] hover:bg-[#D35400]/90 text-white rounded-2xl py-8 text-xl font-bold shadow-lg hover:shadow-xl transition-all"
                    >
                      Add to Basket
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between bg-[#D35400] rounded-2xl p-4">
                        <button
                          onClick={() => onUpdateQuantity(product.id, quantityInCart - 1)}
                          className="bg-white text-[#D35400] w-14 h-14 rounded-xl flex items-center justify-center hover:bg-[#FFF9F5] transition-colors"
                        >
                          <Minus className="w-6 h-6" />
                        </button>
                        <span className="text-white font-bold text-3xl px-6">
                          {quantityInCart}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(product.id, quantityInCart + 1)}
                          className="bg-white text-[#D35400] w-14 h-14 rounded-xl flex items-center justify-center hover:bg-[#FFF9F5] transition-colors"
                        >
                          <Plus className="w-6 h-6" />
                        </button>
                      </div>
                      <p className="text-center text-[#2E7D32] font-semibold text-lg">
                        ✓ In your basket
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Baker Info Card */}
              <Card className="border-2 border-[#D35400]/20 bg-white shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-[#D35400] rounded-xl">
                      <Store className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-[#4E342E]/60">Artisan Baker</p>
                      <p className="text-xl font-bold text-[#4E342E]">{product.baker.shop_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[#4E342E]/70">
                    <MapPin className="w-4 h-4" />
                    <span>{product.baker.city}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Product Features */}
              <Card className="border-2 border-[#C8E6C9] bg-[#F1F8E9]">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-[#4E342E] mb-4">Why You'll Love It</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#2E7D32] rounded-lg">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm text-[#4E342E]">Made Fresh Daily</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#2E7D32] rounded-lg">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm text-[#4E342E]">Premium Ingredients</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#2E7D32] rounded-lg">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm text-[#4E342E]">Handcrafted</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#2E7D32] rounded-lg">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm text-[#4E342E]">No Preservatives</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Additional Info */}
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="flex items-center gap-3 text-[#4E342E]/70">
                  <Clock className="w-5 h-5" />
                  <div>
                    <p className="text-xs">Best within</p>
                    <p className="font-medium text-[#4E342E]">2-3 days</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[#4E342E]/70">
                  <Users className="w-5 h-5" />
                  <div>
                    <p className="text-xs">Serves</p>
                    <p className="font-medium text-[#4E342E]">2-3 people</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
