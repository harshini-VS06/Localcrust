import { useState, useEffect } from "react";
import { Package, Settings, ArrowLeft, MapPin, Star, Truck, CheckCircle, Clock, ChefHat, X, MessageSquare } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { apiCall, getAuthHeaders } from "@/api/config";
import { ReviewModal } from "@/app/components/review-modal";
import { reviewAPI, type Review } from "@/api/features";

interface Order {
  id: number;
  order_id: string;
  total_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
  items: Array<{
    product_id?: number;
    product_name: string;
    quantity: number;
    price: number;
  }>;
}

interface SavedAddress {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
}

type TabType = 'orders' | 'reviews' | 'settings';

export function CustomerProfile({ onBack, initialTab }: { onBack: () => void; initialTab?: TabType }) {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab || 'orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [savedAddress, setSavedAddress] = useState<SavedAddress | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState<SavedAddress>({
    fullName: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    landmark: ''
  });

  useEffect(() => {
    loadProfileData();
  }, [activeTab]);

  const loadProfileData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'orders') {
        const response = await apiCall<{ orders: Order[] }>('/orders/my-orders', {
          headers: getAuthHeaders(),
        });
        setOrders(response.orders);
      } else if (activeTab === 'reviews') {
        const data = await reviewAPI.getMyReviews();
        setReviews(data.reviews);
      } else if (activeTab === 'settings') {
        const response = await apiCall<{ saved_address: SavedAddress | null }>('/customer/profile', {
          headers: getAuthHeaders(),
        });
        setSavedAddress(response.saved_address);
        if (response.saved_address) {
          setAddressForm(response.saved_address);
        }
      }
    } catch (error) {
      console.error('Failed to load profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAddress = async () => {
    try {
      // Validate all required fields
      if (!addressForm.fullName || !addressForm.phone || !addressForm.addressLine1 || 
          !addressForm.city || !addressForm.state || !addressForm.pincode) {
        alert('Please fill in all required fields');
        return;
      }

      console.log('Saving address:', addressForm); // Debug log

      const response = await apiCall('/customer/profile/address', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(addressForm),
      });
      
      console.log('Address saved response:', response); // Debug log
      
      setSavedAddress(addressForm);
      setEditingAddress(false);
      alert('Address saved successfully!');
    } catch (error: any) {
      console.error('Failed to save address:', error);
      const errorMessage = error.message || 'Failed to save address. Please try again.';
      alert(errorMessage);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5" />;
      case 'confirmed':
        return <CheckCircle className="w-5 h-5" />;
      case 'preparing':
        return <ChefHat className="w-5 h-5" />;
      case 'ready':
        return <Package className="w-5 h-5" />;
      case 'out_for_delivery':
        return <Truck className="w-5 h-5" />;
      case 'delivered':
        return <CheckCircle className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'preparing':
        return 'bg-purple-100 text-purple-800';
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'out_for_delivery':
        return 'bg-indigo-100 text-indigo-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderOrderTracking = (order: Order) => {
    const statuses = [
      { key: 'pending', label: 'Order Placed' },
      { key: 'confirmed', label: 'Confirmed' },
      { key: 'preparing', label: 'Preparing' },
      { key: 'ready', label: 'Ready' },
      { key: 'out_for_delivery', label: 'Out for Delivery' },
      { key: 'delivered', label: 'Delivered' },
    ];

    const currentIndex = statuses.findIndex(s => s.key === order.status);

    return (
      <div className="flex items-center justify-between mt-4">
        {statuses.map((status, index) => (
          <div key={status.key} className="flex items-center">
            <div className={`flex flex-col items-center ${index <= currentIndex ? 'text-[#D35400]' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                index <= currentIndex ? 'bg-[#D35400] text-white' : 'bg-gray-200'
              }`}>
                {getStatusIcon(status.key)}
              </div>
              <span className="text-xs mt-2 text-center">{status.label}</span>
            </div>
            {index < statuses.length - 1 && (
              <div className={`h-1 w-12 mx-2 ${index < currentIndex ? 'bg-[#D35400]' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF9F5] via-[#FFF5ED] to-[#FDFBF7] p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[#4E342E] hover:text-[#D35400] mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Marketplace
        </button>
        <h1 className="text-3xl font-bold text-[#4E342E]">My Profile</h1>
      </div>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex gap-4 border-b border-[#D35400]/20">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-6 py-3 font-medium transition-all ${
              activeTab === 'orders'
                ? 'text-[#D35400] border-b-2 border-[#D35400]'
                : 'text-[#4E342E]/60 hover:text-[#4E342E]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              My Orders
            </div>
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-6 py-3 font-medium transition-all ${
              activeTab === 'reviews'
                ? 'text-[#D35400] border-b-2 border-[#D35400]'
                : 'text-[#4E342E]/60 hover:text-[#4E342E]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5" />
              My Reviews
            </div>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-3 font-medium transition-all ${
              activeTab === 'settings'
                ? 'text-[#D35400] border-b-2 border-[#D35400]'
                : 'text-[#4E342E]/60 hover:text-[#4E342E]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Settings
            </div>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#D35400] border-t-transparent"></div>
          </div>
        ) : (
          <>
            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div className="space-y-6">
                {orders.length === 0 ? (
                  <Card className="bg-white rounded-2xl border-2 border-[#D35400]/10">
                    <CardContent className="p-12 text-center">
                      <Package className="w-16 h-16 text-[#D35400]/30 mx-auto mb-4" />
                      <p className="text-xl text-[#4E342E] mb-2">No orders yet</p>
                      <p className="text-[#4E342E]/60">Start shopping to see your orders here</p>
                    </CardContent>
                  </Card>
                ) : (
                  orders.map(order => (
                    <Card key={order.id} className="bg-white rounded-2xl border-2 border-[#D35400]/10">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-bold text-[#4E342E]">Order {order.order_id}</h3>
                            <p className="text-sm text-[#4E342E]/60">
                              {new Date(order.created_at).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-[#D35400]">₹{Math.round(order.total_amount)}</p>
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                              {order.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                        </div>

                        {/* Order Items */}
                        <div className="mb-4 space-y-2">
                          {order.items.map((item, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span className="text-[#4E342E]">{item.product_name} × {item.quantity}</span>
                              <span className="text-[#4E342E]/70">₹{Math.round(item.price * item.quantity)}</span>
                            </div>
                          ))}
                        </div>

                        {/* Order Tracking */}
                        {renderOrderTracking(order)}

                        {/* Actions */}
                        <div className="mt-6 flex gap-3">
                          <Button
                            onClick={() => setSelectedOrder(order)}
                            className="flex-1 bg-[#D35400] hover:bg-[#D35400]/90 text-white rounded-xl"
                          >
                            Track Order
                          </Button>
                          {order.status === 'delivered' && (
                            <Button
                              onClick={() => {
                                setSelectedOrder(order);
                                setShowReviewModal(true);
                              }}
                              className="flex-1 bg-[#2E7D32] hover:bg-[#2E7D32]/90 text-white rounded-xl"
                            >
                              <Star className="w-4 h-4 mr-2" />
                              Write Review
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* Reviews Tab */}
            {activeTab === 'reviews' && (
              <div className="space-y-6">
                {reviews.length === 0 ? (
                  <Card className="bg-white rounded-2xl border-2 border-[#D35400]/10">
                    <CardContent className="p-12 text-center">
                      <Star className="w-16 h-16 text-[#D35400]/30 mx-auto mb-4" />
                      <p className="text-xl text-[#4E342E] mb-2">No reviews yet</p>
                      <p className="text-[#4E342E]/60">Reviews you've written will appear here</p>
                    </CardContent>
                  </Card>
                ) : (
                  reviews.map((review) => (
                    <Card key={review.id} className="bg-white rounded-2xl border-2 border-[#D35400]/10">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-[#4E342E] mb-2">{review.product_name}</h3>
                            <div className="flex gap-1 mb-2">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-5 h-5 ${
                                    star <= review.rating
                                      ? 'fill-[#D35400] text-[#D35400]'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <p className="text-sm text-[#4E342E]/60">
                              {new Date(review.created_at).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                          {review.baker_reply && (
                            <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                              Baker Replied
                            </span>
                          )}
                        </div>

                        {/* Your Review */}
                        <div className="bg-[#FFF9F5] rounded-xl p-4 mb-4">
                          <p className="text-sm font-medium text-[#4E342E]/70 mb-2">Your Review:</p>
                          <p className="text-[#4E342E]">{review.comment}</p>
                        </div>

                        {/* Baker's Reply */}
                        {review.baker_reply && (
                          <div className="bg-gradient-to-br from-[#D35400]/5 to-[#D35400]/10 rounded-xl p-4 border-l-4 border-[#D35400]">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-8 h-8 bg-[#D35400] rounded-full flex items-center justify-center">
                                <span className="text-white text-sm">🥖</span>
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-[#D35400]">Baker's Response</p>
                                {review.reply_at && (
                                  <p className="text-xs text-[#4E342E]/50">
                                    {new Date(review.reply_at).toLocaleDateString('en-IN')}
                                  </p>
                                )}
                              </div>
                            </div>
                            <p className="text-[#4E342E] ml-10">{review.baker_reply}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="max-w-2xl mx-auto space-y-6">
                <Card className="bg-white rounded-2xl border-2 border-[#D35400]/10">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold text-[#4E342E]">Saved Delivery Address</h2>
                      {savedAddress && !editingAddress && (
                        <Button
                          onClick={() => setEditingAddress(true)}
                          className="bg-[#D35400] hover:bg-[#D35400]/90 text-white rounded-xl"
                        >
                          Edit Address
                        </Button>
                      )}
                    </div>

                    {!savedAddress && !editingAddress ? (
                      <div className="text-center py-8">
                        <MapPin className="w-16 h-16 text-[#D35400]/30 mx-auto mb-4" />
                        <p className="text-[#4E342E]/60 mb-4">No saved address yet</p>
                        <Button
                          onClick={() => setEditingAddress(true)}
                          className="bg-[#D35400] hover:bg-[#D35400]/90 text-white rounded-xl"
                        >
                          Add Address
                        </Button>
                      </div>
                    ) : editingAddress ? (
                      <div className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-[#4E342E] mb-2">Full Name</label>
                            <input
                              type="text"
                              value={addressForm.fullName}
                              onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value })}
                              className="w-full px-4 py-3 border-2 border-[#4E342E]/20 rounded-xl focus:border-[#D35400] outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-[#4E342E] mb-2">Phone</label>
                            <input
                              type="tel"
                              value={addressForm.phone}
                              onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                              className="w-full px-4 py-3 border-2 border-[#4E342E]/20 rounded-xl focus:border-[#D35400] outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#4E342E] mb-2">Address Line 1</label>
                          <input
                            type="text"
                            value={addressForm.addressLine1}
                            onChange={(e) => setAddressForm({ ...addressForm, addressLine1: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-[#4E342E]/20 rounded-xl focus:border-[#D35400] outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#4E342E] mb-2">Address Line 2</label>
                          <input
                            type="text"
                            value={addressForm.addressLine2}
                            onChange={(e) => setAddressForm({ ...addressForm, addressLine2: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-[#4E342E]/20 rounded-xl focus:border-[#D35400] outline-none"
                          />
                        </div>

                        <div className="grid md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-[#4E342E] mb-2">City</label>
                            <input
                              type="text"
                              value={addressForm.city}
                              onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                              className="w-full px-4 py-3 border-2 border-[#4E342E]/20 rounded-xl focus:border-[#D35400] outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-[#4E342E] mb-2">State</label>
                            <input
                              type="text"
                              value={addressForm.state}
                              onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                              className="w-full px-4 py-3 border-2 border-[#4E342E]/20 rounded-xl focus:border-[#D35400] outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-[#4E342E] mb-2">Pincode</label>
                            <input
                              type="text"
                              value={addressForm.pincode}
                              onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })}
                              className="w-full px-4 py-3 border-2 border-[#4E342E]/20 rounded-xl focus:border-[#D35400] outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#4E342E] mb-2">Landmark (Optional)</label>
                          <input
                            type="text"
                            value={addressForm.landmark}
                            onChange={(e) => setAddressForm({ ...addressForm, landmark: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-[#4E342E]/20 rounded-xl focus:border-[#D35400] outline-none"
                          />
                        </div>

                        <div className="flex gap-3">
                          <Button
                            onClick={handleSaveAddress}
                            className="flex-1 bg-[#2E7D32] hover:bg-[#2E7D32]/90 text-white rounded-xl py-3"
                          >
                            Save Address
                          </Button>
                          <Button
                            onClick={() => {
                              setEditingAddress(false);
                              if (savedAddress) {
                                setAddressForm(savedAddress);
                              }
                            }}
                            className="flex-1 bg-gray-200 hover:bg-gray-300 text-[#4E342E] rounded-xl py-3"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-[#FFF9F5] rounded-xl p-4 border border-[#D35400]/10">
                        <div className="flex items-start gap-3">
                          <MapPin className="w-5 h-5 text-[#D35400] mt-1" />
                          <div>
                            <p className="font-medium text-[#4E342E]">{savedAddress.fullName}</p>
                            <p className="text-[#4E342E]/70">{savedAddress.phone}</p>
                            <p className="text-[#4E342E]/70 mt-2">
                              {savedAddress.addressLine1}
                              {savedAddress.addressLine2 && `, ${savedAddress.addressLine2}`}
                            </p>
                            <p className="text-[#4E342E]/70">
                              {savedAddress.city}, {savedAddress.state} - {savedAddress.pincode}
                            </p>
                            {savedAddress.landmark && (
                              <p className="text-[#4E342E]/70">Landmark: {savedAddress.landmark}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </div>

      {/* Review Modal */}
      {showReviewModal && selectedOrder && (
        <ReviewModal
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedOrder(null);
          }}
          order={selectedOrder}
          onSuccess={loadProfileData}
        />
      )}
    </div>
  );
}
