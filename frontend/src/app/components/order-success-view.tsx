import { CheckCircle, Package, MapPin, Calendar, X } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import confetti from "canvas-confetti";
import { useEffect } from "react";

interface OrderSuccessViewProps {
  orderId: string;
  onClose: () => void;
}

export function OrderSuccessView({ orderId, onClose }: OrderSuccessViewProps) {
  useEffect(() => {
    // Trigger confetti animation
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        particleCount,
        startVelocity: 30,
        spread: 360,
        origin: {
          x: randomInRange(0.1, 0.9),
          y: Math.random() - 0.2,
        },
        colors: ["#D35400", "#FFE5D9", "#2E7D32", "#C8E6C9", "#FFD4C1"],
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  const handleContinueShopping = () => {
    onClose();
    window.location.reload(); // Reload to update cart
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />

      {/* Success Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl relative">
          {/* Close Button */}
          <button
            onClick={handleContinueShopping}
            className="absolute top-6 right-6 bg-white/80 rounded-full p-2 hover:bg-[#FFF9F5] transition-colors z-10"
          >
            <X className="w-6 h-6 text-[#4E342E]" />
          </button>

          <div className="p-12 text-center">
            {/* Success Icon */}
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-br from-[#2E7D32] to-[#66BB6A] rounded-full shadow-2xl animate-bounce">
                <CheckCircle className="w-20 h-20 text-white" />
              </div>
            </div>

            {/* Success Message */}
            <h1 className="text-4xl font-bold text-[#4E342E] mb-4">
              Order Placed Successfully!
            </h1>
            <p className="text-xl text-[#4E342E]/70 mb-8">
              Thank you for your order. Your delicious treats are on the way!
            </p>

            {/* Order ID */}
            <div className="bg-gradient-to-r from-[#FFE5D9] to-[#FFD4C1] rounded-2xl p-6 mb-8 border-2 border-[#D35400]/20">
              <p className="text-sm text-[#4E342E]/60 mb-2">Order ID</p>
              <p className="text-2xl font-bold text-[#D35400] font-mono">
                {orderId}
              </p>
            </div>

            {/* Order Details */}
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <div className="bg-[#FFF9F5] rounded-xl p-6 border-2 border-[#D35400]/10">
                <div className="flex justify-center mb-3">
                  <div className="p-3 bg-[#D35400] rounded-xl">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                </div>
                <p className="text-sm text-[#4E342E]/60 mb-1">Status</p>
                <p className="font-medium text-[#4E342E]">Order Confirmed</p>
              </div>

              <div className="bg-[#F1F8E9] rounded-xl p-6 border-2 border-[#C8E6C9]">
                <div className="flex justify-center mb-3">
                  <div className="p-3 bg-[#2E7D32] rounded-xl">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                </div>
                <p className="text-sm text-[#4E342E]/60 mb-1">Estimated Delivery</p>
                <p className="font-medium text-[#4E342E]">
                  {new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString()}
                </p>
              </div>

              <div className="bg-[#FFF3E0] rounded-xl p-6 border-2 border-[#FFE0B2]">
                <div className="flex justify-center mb-3">
                  <div className="p-3 bg-[#E67E50] rounded-xl">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                </div>
                <p className="text-sm text-[#4E342E]/60 mb-1">Tracking</p>
                <p className="font-medium text-[#4E342E]">Available Soon</p>
              </div>
            </div>

            {/* Next Steps */}
            <div className="bg-white rounded-2xl p-6 border-2 border-[#D35400]/10 mb-8 text-left">
              <h3 className="font-medium text-[#4E342E] mb-4">What's Next?</h3>
              <ul className="space-y-3 text-[#4E342E]/70">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-[#2E7D32] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">1</span>
                  </div>
                  <span>
                    You'll receive an order confirmation email shortly
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-[#2E7D32] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">2</span>
                  </div>
                  <span>
                    Our artisan bakers will prepare your items fresh
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-[#2E7D32] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">3</span>
                  </div>
                  <span>
                    Your order will be delivered to your doorstep
                  </span>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button
                onClick={handleContinueShopping}
                className="flex-1 bg-[#D35400] hover:bg-[#D35400]/90 text-white rounded-xl py-6 text-lg"
              >
                Continue Shopping
              </Button>
              <Button
                onClick={() => {
                  // TODO: Navigate to orders page
                  alert("Order tracking feature coming soon!");
                }}
                className="flex-1 bg-white hover:bg-[#FFF9F5] text-[#D35400] border-2 border-[#D35400] rounded-xl py-6 text-lg"
              >
                Track Order
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
