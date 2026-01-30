import { useState } from "react";
import { X, Star } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { apiCall, getAuthHeaders } from "@/api/config";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    id: number;
    order_id: string;
    items: Array<{
      product_id?: number;
      product_name: string;
      quantity: number;
      price: number;
    }>;
  };
  onSuccess: () => void;
}

export function ReviewModal({ isOpen, onClose, order, onSuccess }: ReviewModalProps) {
  const [selectedProduct, setSelectedProduct] = useState<number>(0);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (rating === 0) {
      alert("Please select a rating");
      return;
    }

    if (!comment.trim()) {
      alert("Please write a comment");
      return;
    }

    const product = order.items[selectedProduct];
    if (!product.product_id) {
      alert("Product ID not found");
      return;
    }

    try {
      setSubmitting(true);
      await apiCall(`/orders/${order.id}/review`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          product_id: product.product_id,
          rating,
          comment: comment.trim(),
        }),
      });

      alert("Review submitted successfully!");
      onSuccess();
      onClose();
      
      // Reset form
      setRating(0);
      setComment("");
      setSelectedProduct(0);
    } catch (error: any) {
      console.error("Failed to submit review:", error);
      alert(error.message || "Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" 
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 bg-white/80 rounded-full p-2 hover:bg-[#FFF9F5] transition-colors z-10"
          >
            <X className="w-6 h-6 text-[#4E342E]" />
          </button>

          <div className="p-8">
            {/* Header */}
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-[#4E342E] mb-2">Write a Review</h2>
              <p className="text-[#4E342E]/60">Order {order.order_id}</p>
            </div>

            {/* Product Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-[#4E342E] mb-3">
                Select Product to Review
              </label>
              <div className="space-y-2">
                {order.items.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedProduct(index)}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                      selectedProduct === index
                        ? 'border-[#D35400] bg-[#FFF9F5]'
                        : 'border-[#D35400]/20 hover:border-[#D35400]/50'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-[#4E342E]">{item.product_name}</p>
                        <p className="text-sm text-[#4E342E]/60">Quantity: {item.quantity}</p>
                      </div>
                      <p className="font-bold text-[#D35400]">₹{Math.round(item.price * item.quantity)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Rating */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-[#4E342E] mb-3">
                Rating
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-10 h-10 ${
                        star <= (hoverRating || rating)
                          ? 'fill-[#D35400] text-[#D35400]'
                          : 'text-[#D35400]/30'
                      }`}
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="mt-2 text-sm text-[#4E342E]/60">
                  {rating === 1 && "Poor"}
                  {rating === 2 && "Fair"}
                  {rating === 3 && "Good"}
                  {rating === 4 && "Very Good"}
                  {rating === 5 && "Excellent"}
                </p>
              )}
            </div>

            {/* Comment */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-[#4E342E] mb-3">
                Your Review
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience with this product..."
                className="w-full px-4 py-3 border-2 border-[#D35400]/20 rounded-xl focus:border-[#D35400] focus:ring-2 focus:ring-[#D35400]/20 outline-none resize-none"
                rows={5}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 bg-[#2E7D32] hover:bg-[#2E7D32]/90 text-white rounded-xl py-6 text-lg disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Review'}
              </Button>
              <Button
                onClick={onClose}
                disabled={submitting}
                className="px-8 bg-gray-200 hover:bg-gray-300 text-[#4E342E] rounded-xl py-6 text-lg"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
