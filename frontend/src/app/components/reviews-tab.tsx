// Reviews Tab Component
import React, { useState } from 'react';
import { Card, CardContent } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Star, MessageSquare, Send } from 'lucide-react';

interface Review {
  id: number;
  product_id: number;
  product_name: string;
  customer_name: string;
  rating: number;
  comment: string;
  created_at: string;
  reply?: string;
  replied_at?: string;
}

interface ReviewsTabProps {
  reviews: Review[];
  onReplySubmit: (reviewId: number, reply: string) => void;
}

export function ReviewsTab({ reviews, onReplySubmit }: ReviewsTabProps) {
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");

  const handleReply = (reviewId: number) => {
    if (!replyText.trim()) return;
    onReplySubmit(reviewId, replyText);
    setReplyingTo(null);
    setReplyText("");
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-5 h-5 ${
              star <= rating
                ? "fill-[#D35400] text-[#D35400]"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  const pendingReviews = reviews.filter(r => !r.reply);
  const repliedReviews = reviews.filter(r => r.reply);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl text-[#4E342E] font-semibold">Customer Reviews</h2>
        <div className="flex gap-4 text-sm">
          <span className="text-[#4E342E]/60">
            {reviews.length} total reviews
          </span>
          {pendingReviews.length > 0 && (
            <span className="text-red-600 font-medium">
              {pendingReviews.length} pending replies
            </span>
          )}
        </div>
      </div>

      {reviews.length === 0 ? (
        <Card className="bg-white rounded-2xl border-2 border-[#D35400]/10">
          <CardContent className="p-12 text-center">
            <MessageSquare className="w-16 h-16 text-[#D35400]/30 mx-auto mb-4" />
            <p className="text-xl text-[#4E342E] mb-2">No reviews yet</p>
            <p className="text-[#4E342E]/60">
              Reviews from customers will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Pending Reviews */}
          {pendingReviews.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg text-[#4E342E] font-semibold flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                Pending Replies ({pendingReviews.length})
              </h3>
              {pendingReviews.map((review) => (
                <Card
                  key={review.id}
                  className="bg-white rounded-2xl border-2 border-red-200 hover:shadow-lg transition-all"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium text-[#4E342E]">
                            {review.customer_name}
                          </h4>
                          {renderStars(review.rating)}
                        </div>
                        <p className="text-sm text-[#4E342E]/70 mb-1">
                          {review.product_name}
                        </p>
                        <p className="text-xs text-[#4E342E]/50">
                          {new Date(review.created_at).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="bg-[#FFF9F5] rounded-xl p-4 mb-4">
                      <p className="text-[#4E342E]">{review.comment}</p>
                    </div>

                    {replyingTo === review.id ? (
                      <div className="space-y-3">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Write your reply..."
                          className="w-full p-3 border-2 border-[#D35400]/20 rounded-xl focus:outline-none focus:border-[#D35400] text-[#4E342E]"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleReply(review.id)}
                            className="bg-[#D35400] hover:bg-[#D35400]/90 text-white rounded-xl"
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Send Reply
                          </Button>
                          <Button
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyText("");
                            }}
                            className="bg-gray-200 hover:bg-gray-300 text-[#4E342E] rounded-xl"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        onClick={() => setReplyingTo(review.id)}
                        className="bg-[#D35400] hover:bg-[#D35400]/90 text-white rounded-xl"
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Reply to Review
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Replied Reviews */}
          {repliedReviews.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg text-[#4E342E] font-semibold">
                Replied Reviews ({repliedReviews.length})
              </h3>
              {repliedReviews.map((review) => (
                <Card
                  key={review.id}
                  className="bg-white rounded-2xl border-2 border-[#D35400]/10 hover:shadow-lg transition-all"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium text-[#4E342E]">
                            {review.customer_name}
                          </h4>
                          {renderStars(review.rating)}
                        </div>
                        <p className="text-sm text-[#4E342E]/70 mb-1">
                          {review.product_name}
                        </p>
                        <p className="text-xs text-[#4E342E]/50">
                          {new Date(review.created_at).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                      <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                        Replied
                      </span>
                    </div>

                    {/* Customer Review */}
                    <div className="bg-[#FFF9F5] rounded-xl p-4 mb-4">
                      <p className="text-[#4E342E]">{review.comment}</p>
                    </div>

                    {/* Baker Reply */}
                    {review.reply && (
                      <div className="bg-gradient-to-br from-[#D35400]/5 to-[#D35400]/10 rounded-xl p-4 border-l-4 border-[#D35400]">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="w-4 h-4 text-[#D35400]" />
                          <span className="text-sm font-medium text-[#D35400]">
                            Your Reply
                          </span>
                          <span className="text-xs text-[#4E342E]/50 ml-auto">
                            {review.replied_at &&
                              new Date(review.replied_at).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                        <p className="text-[#4E342E]">{review.reply}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
