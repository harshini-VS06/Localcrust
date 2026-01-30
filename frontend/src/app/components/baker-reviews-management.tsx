import { useState, useEffect } from "react";
import { Star, MessageSquare, Send, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { apiCall, getAuthHeaders } from "@/api/config";

interface Review {
  id: number;
  product_id: number;
  product_name: string;
  customer_name: string;
  customer_email: string;
  rating: number;
  comment: string;
  baker_reply: string | null;
  reply_at: string | null;
  created_at: string;
  has_reply: boolean;
}

interface ReviewStats {
  total_reviews: number;
  average_rating: number;
  pending_replies: number;
  rating_distribution: { [key: number]: number };
}

export function BakerReviewsManagement() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'replied'>('all');

  useEffect(() => {
    fetchReviews();
    fetchStats();
  }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const data = await apiCall<{ reviews: Review[] }>('/baker/reviews', {
        headers: getAuthHeaders(),
      });
      console.log('RAW RESPONSE FROM BACKEND:', JSON.stringify(data, null, 2));
      console.log('Fetched reviews from backend:', data.reviews);
      console.log('Number of reviews:', data.reviews.length);
      
      // FIX: Ensure has_reply is properly set based on baker_reply
      const reviewsWithCorrectFlag = data.reviews.map(review => ({
        ...review,
        has_reply: Boolean(review.baker_reply)  // Ensure has_reply is correctly calculated
      }));
      
      if (reviewsWithCorrectFlag.length > 0) {
        console.log('First review FULL OBJECT:', JSON.stringify(reviewsWithCorrectFlag[0], null, 2));
        console.log('First review has_reply:', reviewsWithCorrectFlag[0].has_reply);
        console.log('First review baker_reply:', reviewsWithCorrectFlag[0].baker_reply);
      }
      
      setReviews(reviewsWithCorrectFlag);
    } catch (error: any) {
      console.error('Failed to fetch reviews:', error);
      alert(error.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await apiCall<ReviewStats>('/baker/reviews/stats', {
        headers: getAuthHeaders(),
      });
      setStats(data);
    } catch (error: any) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleReply = async (reviewId: number) => {
    if (!replyText.trim()) {
      alert('Please enter a reply');
      return;
    }

    try {
      setSubmitting(true);
      console.log('Posting reply to review:', reviewId);
      
      const response = await apiCall<{ message: string; review: { id: number; baker_reply: string; reply_at: string } }>(`/baker/reviews/${reviewId}/reply`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reply: replyText }),
      });

      console.log('Reply response:', response);

      // Update the review in the local state immediately
      const updatedReviews = reviews.map(review => 
        review.id === reviewId 
          ? { 
              ...review, 
              baker_reply: response.review.baker_reply, 
              reply_at: response.review.reply_at,
              has_reply: true 
            }
          : review
      );
      
      console.log('Updated reviews:', updatedReviews);
      console.log('Review 0 details:', JSON.stringify(updatedReviews[0], null, 2));
      setReviews(updatedReviews);

      alert('Reply posted successfully!');
      setReplyingTo(null);
      setReplyText('');
      
      // Fetch fresh data from backend to ensure sync
      console.log('Fetching fresh reviews...');
      await fetchReviews();
      await fetchStats();
      console.log('Fresh data fetched');
    } catch (error: any) {
      console.error('Failed to post reply:', error);
      alert(error.message || 'Failed to post reply');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'fill-[#D35400] text-[#D35400]' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  // FIX: More robust filtering logic - always calculate from baker_reply
  const filteredReviews = reviews.filter((review) => {
    // Ensure has_reply is correctly calculated from baker_reply
    const hasActualReply = Boolean(review.baker_reply);
    
    if (filter === 'all') return true;
    if (filter === 'pending') return !hasActualReply;
    if (filter === 'replied') return hasActualReply;
    return true;
  });
  
  // FIX: Calculate counts directly from reviews array
  const pendingCount = reviews.filter(r => !Boolean(r.baker_reply)).length;
  const repliedCount = reviews.filter(r => Boolean(r.baker_reply)).length;
  
  console.log(`Total reviews: ${reviews.length}, Filtered: ${filteredReviews.length}, Filter: ${filter}`);
  console.log('Pending count:', pendingCount);
  console.log('Replied count:', repliedCount);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#4E342E]/60">Loading reviews...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-[#FFF9F5] to-white border-2 border-[#D35400]/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#4E342E]/60">Total Reviews</p>
                  <p className="text-3xl font-bold text-[#4E342E] mt-1">
                    {stats.total_reviews}
                  </p>
                </div>
                <MessageSquare className="w-12 h-12 text-[#D35400]" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#FFF9F5] to-white border-2 border-[#D35400]/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#4E342E]/60">Average Rating</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-3xl font-bold text-[#4E342E]">
                      {stats.average_rating}
                    </p>
                    <Star className="w-6 h-6 fill-[#D35400] text-[#D35400]" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#FFF9F5] to-white border-2 border-[#D35400]/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#4E342E]/60">Pending Replies</p>
                  <p className="text-3xl font-bold text-[#D35400] mt-1">
                    {pendingCount}
                  </p>
                </div>
                <Clock className="w-12 h-12 text-[#D35400]" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#FFF9F5] to-white border-2 border-[#D35400]/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#4E342E]/60">Replied</p>
                  <p className="text-3xl font-bold text-[#2E7D32] mt-1">
                    {repliedCount}
                  </p>
                </div>
                <CheckCircle className="w-12 h-12 text-[#2E7D32]" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-[#D35400]/20">
        <button
          onClick={() => setFilter('all')}
          className={`px-6 py-3 font-medium transition-colors ${
            filter === 'all'
              ? 'text-[#D35400] border-b-2 border-[#D35400]'
              : 'text-[#4E342E]/60 hover:text-[#4E342E]'
          }`}
        >
          All Reviews ({reviews.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-6 py-3 font-medium transition-colors ${
            filter === 'pending'
              ? 'text-[#D35400] border-b-2 border-[#D35400]'
              : 'text-[#4E342E]/60 hover:text-[#4E342E]'
          }`}
        >
          Pending ({reviews.filter((r) => !r.has_reply).length})
        </button>
        <button
          onClick={() => setFilter('replied')}
          className={`px-6 py-3 font-medium transition-colors ${
            filter === 'replied'
              ? 'text-[#D35400] border-b-2 border-[#D35400]'
              : 'text-[#4E342E]/60 hover:text-[#4E342E]'
          }`}
        >
          Replied ({reviews.filter((r) => r.has_reply).length})
        </button>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.length === 0 ? (
          <Card className="bg-white border-2 border-[#D35400]/20">
            <CardContent className="p-12 text-center">
              <MessageSquare className="w-16 h-16 text-[#4E342E]/20 mx-auto mb-4" />
              <p className="text-[#4E342E]/60">
                {filter === 'pending'
                  ? 'No pending reviews'
                  : filter === 'replied'
                  ? 'No replied reviews yet'
                  : 'No reviews yet'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredReviews.map((review) => (
            <Card
              key={review.id}
              className="bg-white border-2 border-[#D35400]/20 hover:shadow-lg transition-shadow"
            >
              <CardContent className="p-6">
                {/* Review Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-[#4E342E] text-lg">
                        {review.product_name}
                      </h3>
                      {review.has_reply && (
                        <span className="px-3 py-1 bg-[#2E7D32]/10 text-[#2E7D32] text-xs font-medium rounded-full">
                          Replied
                        </span>
                      )}
                      {!review.has_reply && (
                        <span className="px-3 py-1 bg-[#D35400]/10 text-[#D35400] text-xs font-medium rounded-full">
                          Pending
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-[#4E342E]/60">
                      <span>{review.customer_name}</span>
                      <span>•</span>
                      <span>{new Date(review.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {renderStars(review.rating)}
                </div>

                {/* Customer Comment */}
                <div className="bg-[#FFF9F5] rounded-xl p-4 mb-4">
                  <p className="text-[#4E342E]">{review.comment}</p>
                </div>

                {/* Baker Reply */}
                {review.baker_reply && (
                  <div className="bg-[#2E7D32]/5 rounded-xl p-4 mb-4 border-l-4 border-[#2E7D32]">
                    <p className="text-sm font-medium text-[#2E7D32] mb-2">
                      Your Reply
                      {review.reply_at && (
                        <span className="text-[#4E342E]/60 font-normal ml-2">
                          • {new Date(review.reply_at).toLocaleDateString()}
                        </span>
                      )}
                    </p>
                    <p className="text-[#4E342E]">{review.baker_reply}</p>
                  </div>
                )}

                {/* Reply Form */}
                {!review.has_reply && (
                  <div>
                    {replyingTo === review.id ? (
                      <div className="space-y-3">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Write your reply to the customer..."
                          className="w-full px-4 py-3 border-2 border-[#D35400]/20 rounded-xl focus:border-[#D35400] focus:ring-2 focus:ring-[#D35400]/20 outline-none resize-none"
                          rows={4}
                        />
                        <div className="flex gap-3">
                          <Button
                            onClick={() => handleReply(review.id)}
                            disabled={submitting}
                            className="flex-1 bg-[#2E7D32] hover:bg-[#2E7D32]/90 text-white rounded-xl"
                          >
                            <Send className="w-4 h-4 mr-2" />
                            {submitting ? 'Posting...' : 'Post Reply'}
                          </Button>
                          <Button
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyText('');
                            }}
                            disabled={submitting}
                            className="px-6 bg-gray-200 hover:bg-gray-300 text-[#4E342E] rounded-xl"
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
                        Reply to Customer
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
