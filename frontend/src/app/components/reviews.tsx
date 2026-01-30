import { useState } from "react";
import { Star, X, Send } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { reviewAPI, type Review } from "@/api/features";

interface ReviewModalProps {
  productId: number;
  productName: string;
  bakerId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReviewModal({ productId, productName, bakerId, onClose, onSuccess }: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      setError("Please select a rating");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await reviewAPI.addReview({
        product_id: productId,
        baker_id: bakerId,
        rating,
        comment,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to submit review");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fadeIn" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl relative animate-scaleIn">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 bg-white/80 rounded-full p-2 hover:bg-[#FFF9F5] transition-colors z-10"
          >
            <X className="w-6 h-6 text-[#4E342E]" />
          </button>

          <div className="p-8">
            <h2 className="text-3xl text-[#4E342E] mb-2">Write a Review</h2>
            <p className="text-[#4E342E]/70 mb-6">{productName}</p>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Star Rating */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-[#4E342E] mb-3">
                  Your Rating <span className="text-[#D35400]">*</span>
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
                        className={`w-12 h-12 ${
                          star <= (hoverRating || rating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <p className="text-sm text-[#4E342E]/70 mt-2">
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
                <label className="block text-sm font-medium text-[#4E342E] mb-2">
                  Your Review (Optional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-3 border-2 border-[#4E342E]/20 rounded-xl focus:border-[#D35400] outline-none resize-none"
                  placeholder="Share your experience with this product..."
                />
              </div>

              {/* Submit Button */}
              <div className="flex gap-4">
                <Button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-white hover:bg-[#FFF9F5] text-[#4E342E] border-2 border-[#4E342E]/20 rounded-xl py-6 text-lg"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading || rating === 0}
                  className="flex-1 bg-[#D35400] hover:bg-[#D35400]/90 text-white rounded-xl py-6 text-lg disabled:opacity-50"
                >
                  {loading ? (
                    "Submitting..."
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      Submit Review
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

// Reviews List Component
interface ReviewsListProps {
  productId?: number;
  bakerId?: number;
}

export function ReviewsList({ productId, bakerId }: ReviewsListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [loading, setLoading] = useState(true);

  useState(() => {
    loadReviews();
  });

  const loadReviews = async () => {
    try {
      setLoading(true);
      if (productId) {
        const data = await reviewAPI.getProductReviews(productId);
        setReviews(data.reviews);
        const avg = data.reviews.reduce((sum, r) => sum + r.rating, 0) / data.reviews.length;
        setAverageRating(avg || 0);
      } else if (bakerId) {
        const data = await reviewAPI.getBakerReviews(bakerId);
        setReviews(data.reviews);
        setAverageRating(data.average_rating);
      }
    } catch (error) {
      console.error("Failed to load reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#D35400] border-t-transparent"></div>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8">
        <Star className="w-12 h-12 text-[#D35400]/30 mx-auto mb-3" />
        <p className="text-[#4E342E]/70">No reviews yet</p>
        <p className="text-sm text-[#4E342E]/50 mt-1">Be the first to review!</p>
      </div>
    );
  }

  return (
    <div>
      {/* Average Rating */}
      <div className="mb-6 p-6 bg-gradient-to-br from-[#FFE5D9] to-[#FFD4C1] rounded-2xl">
        <div className="flex items-center justify-center gap-4">
          <div className="text-center">
            <p className="text-5xl font-bold text-[#D35400] mb-2">
              {averageRating.toFixed(1)}
            </p>
            <div className="flex gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${
                    star <= Math.round(averageRating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-[#4E342E]/70">{reviews.length} reviews</p>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <div className="space-y-4">
        {reviews.map((review, index) => (
          <div
            key={review.id}
            className="p-6 bg-white rounded-xl border-2 border-[#D35400]/10 hover:shadow-md transition-all stagger-item"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-medium text-[#4E342E]">{review.user_name}</p>
                <div className="flex gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= review.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <p className="text-sm text-[#4E342E]/60">
                {new Date(review.created_at).toLocaleDateString()}
              </p>
            </div>
            {review.comment && (
              <p className="text-[#4E342E]/70 leading-relaxed">{review.comment}</p>
            )}
            
            {/* Baker Reply */}
            {review.baker_reply && (
              <div className="mt-4 p-4 bg-gradient-to-br from-[#D35400]/5 to-[#D35400]/10 rounded-xl border-l-4 border-[#D35400]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-[#D35400] rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">🥖</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#D35400]">Baker's Response</p>
                    {review.reply_at && (
                      <p className="text-xs text-[#4E342E]/50">
                        {new Date(review.reply_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-[#4E342E] ml-10">{review.baker_reply}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
