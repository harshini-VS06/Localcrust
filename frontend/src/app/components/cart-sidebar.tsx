import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import type { CartItem } from "@/api/marketplace";
import { useState } from "react";
import { CheckoutView } from "@/app/components/checkout-view";

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (productId: number, quantity: number) => void;
  onRemoveItem: (productId: number) => void;
}

const getCategoryImage = (category: string) => {
  const images: Record<string, string> = {
    Bread: "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=200&h=200&fit=crop",
    Pastries: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&h=200&fit=crop",
    Cakes: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=200&h=200&fit=crop",
    Cookies: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=200&h=200&fit=crop",
    "Specialty Items": "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=200&h=200&fit=crop",
  };
  return images[category] || images.Bread;
};

export function CartSidebar({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
}: CartSidebarProps) {
  const [showCheckout, setShowCheckout] = useState(false);

  const getTotalPrice = () => {
    return cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  };

  const getTotalItems = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  };

  if (showCheckout) {
    return (
      <CheckoutView
        cart={cart}
        onBack={() => setShowCheckout(false)}
        onClose={() => {
          setShowCheckout(false);
          onClose();
        }}
      />
    );
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 bottom-0 w-full md:w-[450px] bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[#D35400]/10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#D35400] rounded-lg">
                <ShoppingBag className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl text-[#4E342E]">Your Cart</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#FFF9F5] rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-[#4E342E]" />
            </button>
          </div>
          <p className="text-sm text-[#4E342E]/60">
            {getTotalItems()} {getTotalItems() === 1 ? "item" : "items"}
          </p>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-32 h-32 bg-[#FFF9F5] rounded-full flex items-center justify-center mb-4">
                <ShoppingBag className="w-16 h-16 text-[#D35400]/30" />
              </div>
              <p className="text-xl text-[#4E342E] mb-2">Your cart is empty</p>
              <p className="text-[#4E342E]/60">Add some delicious items to get started!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="bg-[#FFF9F5] rounded-xl p-4 border-2 border-[#D35400]/10"
                >
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-gradient-to-br from-[#FFE5D9] to-[#FFD4C1] flex-shrink-0">
                      <img
                        src={item.product.image_url || getCategoryImage(item.product.category)}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-[#4E342E] mb-1 truncate">
                        {item.product.name}
                      </h3>
                      <p className="text-sm text-[#4E342E]/60 mb-2">
                        {item.product.baker.shop_name}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-[#D35400] font-bold">
                          ₹{Math.round(item.product.price)}
                        </p>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2 bg-white rounded-lg border-2 border-[#D35400]/20">
                          <button
                            onClick={() =>
                              onUpdateQuantity(item.product.id, item.quantity - 1)
                            }
                            className="p-2 hover:bg-[#FFF9F5] transition-colors rounded-l-lg"
                          >
                            <Minus className="w-4 h-4 text-[#D35400]" />
                          </button>
                          <span className="text-[#4E342E] font-medium px-3">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              onUpdateQuantity(item.product.id, item.quantity + 1)
                            }
                            className="p-2 hover:bg-[#FFF9F5] transition-colors rounded-r-lg"
                          >
                            <Plus className="w-4 h-4 text-[#D35400]" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Remove Button */}
                    <button
                      onClick={() => onRemoveItem(item.product.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors self-start"
                    >
                      <Trash2 className="w-5 h-5 text-red-500" />
                    </button>
                  </div>

                  {/* Item Total */}
                  <div className="mt-3 pt-3 border-t border-[#D35400]/10 flex justify-between items-center">
                    <span className="text-sm text-[#4E342E]/60">Item Total</span>
                    <span className="text-[#4E342E] font-bold">
                      ₹{Math.round(item.product.price * item.quantity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="p-6 border-t border-[#D35400]/10 bg-white">
            {/* Bill Summary */}
            <div className="mb-4 space-y-2">
              <div className="flex justify-between text-[#4E342E]/70">
                <span>Subtotal</span>
                <span>₹{Math.round(getTotalPrice())}</span>
              </div>
              <div className="flex justify-between text-[#4E342E]/70">
                <span>Delivery Fee</span>
                <span className="text-[#2E7D32]">FREE</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-[#4E342E] pt-2 border-t border-[#D35400]/10">
                <span>Total</span>
                <span className="text-[#D35400]">₹{Math.round(getTotalPrice())}</span>
              </div>
            </div>

            {/* Checkout Button */}
            <Button
              onClick={() => setShowCheckout(true)}
              className="w-full bg-[#D35400] hover:bg-[#D35400]/90 text-white rounded-xl py-6 text-lg shadow-lg"
            >
              Proceed to Checkout
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
