import { useState, useEffect } from "react";
import { ArrowLeft, MapPin, CreditCard, CheckCircle } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import type { CartItem, Address } from "@/api/marketplace";
import { orderAPI } from "@/api/marketplace";
import { OrderSuccessView } from "@/app/components/order-success-view";
import { apiCall, getAuthHeaders } from "@/api/config";

interface CheckoutViewProps {
  cart: CartItem[];
  onBack: () => void;
  onClose: () => void;
}

// Razorpay types
declare global {
  interface Window {
    Razorpay: any;
  }
}

const getCategoryImage = (category: string) => {
  const images: Record<string, string> = {
    Bread: "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=100&h=100&fit=crop",
    Pastries: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=100&h=100&fit=crop",
    Cakes: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=100&h=100&fit=crop",
    Cookies: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=100&h=100&fit=crop",
    "Specialty Items": "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=100&h=100&fit=crop",
  };
  return images[category] || images.Bread;
};

export function CheckoutView({ cart, onBack, onClose }: CheckoutViewProps) {
  const [step, setStep] = useState<"address" | "payment" | "success">("address");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [orderId, setOrderId] = useState<string>("");

  // Address form state
  const [address, setAddress] = useState<Address>({
    fullName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
    landmark: "",
  });

  const getTotalPrice = () => {
    return cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  };

  // Load saved address on mount
  useEffect(() => {
    loadSavedAddress();
  }, []);

  const loadSavedAddress = async () => {
    try {
      const response = await apiCall('/customer/profile', {
        headers: getAuthHeaders(),
      });
      
      if (response.saved_address) {
        setAddress(response.saved_address);
      }
    } catch (error) {
      console.error('Failed to load saved address:', error);
      // Continue without saved address
    }
  };

  const saveAddress = async (addressData: Address) => {
    try {
      await apiCall('/customer/profile/address', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(addressData),
      });
    } catch (error) {
      console.error('Failed to save address:', error);
      // Continue anyway, don't block checkout
    }
  };

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // Save address for future use
    await saveAddress(address);
    
    setStep("payment");
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    setLoading(true);
    setError("");

    try {
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Failed to load Razorpay SDK");
      }

      // Create order in backend
      const orderData = {
        items: cart.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          price: item.product.price,
        })),
        delivery_address: address,
        total_amount: getTotalPrice(),
      };

      const order = await orderAPI.createOrder(orderData);

      // Check if Razorpay order was created successfully
      if (!order.razorpay_order_id) {
        throw new Error('Failed to create payment order. Please try again.');
      }

      // Razorpay options
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_S7iArHgIG9ECr3", // Use environment variable
        amount: Math.round(getTotalPrice() * 100), // Amount in paise
        currency: "INR",
        name: "Local Crust Bakery",
        description: "Fresh Bakery Products",
        order_id: order.razorpay_order_id, // Use Razorpay order ID from backend
        handler: async function (response: any) {
          try {
            // Update payment status
            await orderAPI.updatePaymentStatus(order.id, {
              payment_id: response.razorpay_payment_id,
              payment_status: "completed",
            });

            setOrderId(order.order_id);
            setStep("success");
            
            // Clear cart
            localStorage.removeItem('cart');
          } catch (err) {
            console.error("Payment verification failed:", err);
            setError("Payment verification failed. Please contact support.");
          }
        },
        prefill: {
          name: address.fullName,
          contact: address.phone,
        },
        theme: {
          color: "#D35400",
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err: any) {
      console.error("Payment failed:", err);
      setError(err.message || "Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (step === "success") {
    return <OrderSuccessView orderId={orderId} onClose={onClose} />;
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />

      {/* Checkout Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full md:w-[600px] bg-white shadow-2xl z-50 flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-[#D35400]/10 sticky top-0 bg-white z-10">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[#4E342E] hover:text-[#D35400] transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Cart</span>
          </button>
          <h2 className="text-2xl text-[#4E342E]">
            {step === "address" ? "Delivery Address" : "Payment"}
          </h2>
        </div>

        {/* Content */}
        <div className="flex-1 p-6">
          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center gap-4">
              <div
                className={`flex items-center gap-2 ${
                  step === "address" ? "text-[#D35400]" : "text-[#2E7D32]"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step === "address"
                      ? "bg-[#D35400] text-white"
                      : "bg-[#2E7D32] text-white"
                  }`}
                >
                  {step === "address" ? "1" : <CheckCircle className="w-5 h-5" />}
                </div>
                <span className="font-medium">Address</span>
              </div>

              <div className="w-16 h-1 bg-[#D35400]/20"></div>

              <div
                className={`flex items-center gap-2 ${
                  step === "payment" ? "text-[#D35400]" : "text-[#4E342E]/40"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step === "payment"
                      ? "bg-[#D35400] text-white"
                      : "bg-[#4E342E]/10 text-[#4E342E]/40"
                  }`}
                >
                  2
                </div>
                <span className="font-medium">Payment</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
              {error}
            </div>
          )}

          {/* Address Form */}
          {step === "address" && (
            <form onSubmit={handleAddressSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#4E342E] mb-2">
                    Full Name <span className="text-[#D35400]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={address.fullName}
                    onChange={(e) =>
                      setAddress({ ...address, fullName: e.target.value })
                    }
                    className="w-full px-4 py-3 border-2 border-[#4E342E]/20 rounded-xl focus:border-[#D35400] outline-none"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#4E342E] mb-2">
                    Phone Number <span className="text-[#D35400]">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={address.phone}
                    onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-[#4E342E]/20 rounded-xl focus:border-[#D35400] outline-none"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4E342E] mb-2">
                  Address Line 1 <span className="text-[#D35400]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={address.addressLine1}
                  onChange={(e) =>
                    setAddress({ ...address, addressLine1: e.target.value })
                  }
                  className="w-full px-4 py-3 border-2 border-[#4E342E]/20 rounded-xl focus:border-[#D35400] outline-none"
                  placeholder="House/Flat No., Building Name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4E342E] mb-2">
                  Address Line 2
                </label>
                <input
                  type="text"
                  value={address.addressLine2}
                  onChange={(e) =>
                    setAddress({ ...address, addressLine2: e.target.value })
                  }
                  className="w-full px-4 py-3 border-2 border-[#4E342E]/20 rounded-xl focus:border-[#D35400] outline-none"
                  placeholder="Road Name, Area, Colony"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#4E342E] mb-2">
                    City <span className="text-[#D35400]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-[#4E342E]/20 rounded-xl focus:border-[#D35400] outline-none"
                    placeholder="Mumbai"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#4E342E] mb-2">
                    State <span className="text-[#D35400]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={address.state}
                    onChange={(e) => setAddress({ ...address, state: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-[#4E342E]/20 rounded-xl focus:border-[#D35400] outline-none"
                    placeholder="Maharashtra"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#4E342E] mb-2">
                    Pincode <span className="text-[#D35400]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={address.pincode}
                    onChange={(e) =>
                      setAddress({ ...address, pincode: e.target.value })
                    }
                    className="w-full px-4 py-3 border-2 border-[#4E342E]/20 rounded-xl focus:border-[#D35400] outline-none"
                    placeholder="400001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#4E342E] mb-2">
                    Landmark
                  </label>
                  <input
                    type="text"
                    value={address.landmark}
                    onChange={(e) =>
                      setAddress({ ...address, landmark: e.target.value })
                    }
                    className="w-full px-4 py-3 border-2 border-[#4E342E]/20 rounded-xl focus:border-[#D35400] outline-none"
                    placeholder="Near Metro Station"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-[#D35400] hover:bg-[#D35400]/90 text-white rounded-xl py-6 text-lg mt-6"
              >
                Continue to Payment
              </Button>
            </form>
          )}

          {/* Payment Step */}
          {step === "payment" && (
            <div className="space-y-6">
              {/* Delivery Address Summary */}
              <div className="bg-[#FFF9F5] rounded-xl p-6 border-2 border-[#D35400]/10">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-5 h-5 text-[#D35400]" />
                  <h3 className="font-medium text-[#4E342E]">Delivery Address</h3>
                </div>
                <p className="text-[#4E342E] font-medium">{address.fullName}</p>
                <p className="text-[#4E342E]/70">{address.phone}</p>
                <p className="text-[#4E342E]/70 mt-2">
                  {address.addressLine1}
                  {address.addressLine2 && `, ${address.addressLine2}`}
                </p>
                <p className="text-[#4E342E]/70">
                  {address.city}, {address.state} - {address.pincode}
                </p>
                {address.landmark && (
                  <p className="text-[#4E342E]/70">Landmark: {address.landmark}</p>
                )}
                <button
                  onClick={() => setStep("address")}
                  className="text-[#D35400] text-sm mt-3 hover:underline"
                >
                  Change Address
                </button>
              </div>

              {/* Order Summary */}
              <div className="bg-white rounded-xl p-6 border-2 border-[#D35400]/10">
                <h3 className="font-medium text-[#4E342E] mb-4">Order Summary</h3>
                <div className="space-y-3 mb-4">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex gap-3">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-[#FFE5D9] to-[#FFD4C1]">
                        <img
                          src={
                            item.product.image_url ||
                            getCategoryImage(item.product.category)
                          }
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-[#4E342E] text-sm">
                          {item.product.name}
                        </p>
                        <p className="text-xs text-[#4E342E]/60">
                          {item.product.baker.shop_name}
                        </p>
                        <p className="text-sm text-[#4E342E]/70 mt-1">
                          Qty: {item.quantity} × ₹{Math.round(item.product.price)}
                        </p>
                      </div>
                      <p className="text-[#D35400] font-bold">
                        ₹{Math.round(item.product.price * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-[#D35400]/10 pt-4 space-y-2">
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
                    <span className="text-[#D35400]">
                      ₹{Math.round(getTotalPrice())}
                    </span>
                  </div>
                </div>
              </div>

              <Button
                onClick={handlePayment}
                disabled={loading}
                className="w-full bg-[#2E7D32] hover:bg-[#2E7D32]/90 text-white rounded-xl py-6 text-lg"
              >
                {loading ? "Processing..." : `Pay ₹${Math.round(getTotalPrice())}`}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
