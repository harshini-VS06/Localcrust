import { apiCall, getAuthHeaders } from './config';

// Types
export interface Review {
  id: number;
  user_id: number;
  user_name: string;
  product_id: number;
  product_name: string;
  baker_id: number;
  rating: number;
  comment: string;
  baker_reply?: string;
  reply_at?: string;
  created_at: string;
}

export interface WishlistItem {
  id: number;
  product_id: number;
  product: {
    id: number;
    name: string;
    category: string;
    price: number;
    description: string;
    image_url?: string;
    in_stock: boolean;
    baker: {
      id: number;
      shop_name: string;
      city: string;
    };
  };
  created_at: string;
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  created_at: string;
}

export interface LoyaltyInfo {
  total_points: number;
  level: string;
  next_level: string | null;
  points_needed: number;
  progress: number;
}

export interface Badge {
  badge_key: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  earned_at: string;
}

export interface Recommendation {
  id: number;
  name: string;
  category: string;
  price: number;
  description: string;
  reason: string;
}

// Review API
export const reviewAPI = {
  // Get reviews for a product
  getProductReviews: (productId: number): Promise<{ reviews: Review[] }> => {
    return apiCall<{ reviews: Review[] }>(`/reviews/product/${productId}`);
  },

  // Get reviews for a baker
  getBakerReviews: (bakerId: number): Promise<{ reviews: Review[]; average_rating: number }> => {
    return apiCall<{ reviews: Review[]; average_rating: number }>(`/reviews/baker/${bakerId}`);
  },

  // Add review
  addReview: (data: {
    product_id: number;
    baker_id: number;
    rating: number;
    comment: string;
  }): Promise<{ message: string; review: Review }> => {
    return apiCall<{ message: string; review: Review }>('/reviews', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },

  // Get user's reviews
  getMyReviews: (): Promise<{ reviews: Review[] }> => {
    return apiCall<{ reviews: Review[] }>('/reviews/my-reviews', {
      headers: getAuthHeaders(),
    });
  },

  // Baker reply to review
  replyToReview: (reviewId: number, reply: string): Promise<{ message: string }> => {
    return apiCall<{ message: string }>(`/baker/reviews/${reviewId}/reply`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reply }),
    });
  },
};

// Wishlist API
export const wishlistAPI = {
  // Get wishlist
  getWishlist: (): Promise<{ wishlist: WishlistItem[] }> => {
    return apiCall<{ wishlist: WishlistItem[] }>('/wishlist', {
      headers: getAuthHeaders(),
    });
  },

  // Add to wishlist
  addToWishlist: (productId: number): Promise<{ message: string }> => {
    return apiCall<{ message: string }>(`/wishlist/${productId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  // Remove from wishlist
  removeFromWishlist: (productId: number): Promise<{ message: string }> => {
    return apiCall<{ message: string }>(`/wishlist/${productId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
  },

  // Check if product is in wishlist
  isInWishlist: (productId: number): Promise<{ in_wishlist: boolean }> => {
    return apiCall<{ in_wishlist: boolean }>(`/wishlist/check/${productId}`, {
      headers: getAuthHeaders(),
    });
  },
};

// Notification API
export const notificationAPI = {
  // Get notifications
  getNotifications: (): Promise<{ notifications: Notification[] }> => {
    return apiCall<{ notifications: Notification[] }>('/notifications', {
      headers: getAuthHeaders(),
    });
  },

  // Mark as read
  markAsRead: (notificationId: number): Promise<{ message: string }> => {
    return apiCall<{ message: string }>(`/notifications/${notificationId}/read`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });
  },

  // Mark all as read
  markAllAsRead: (): Promise<{ message: string }> => {
    return apiCall<{ message: string }>('/notifications/mark-all-read', {
      method: 'PUT',
      headers: getAuthHeaders(),
    });
  },

  // Get unread count
  getUnreadCount: (): Promise<{ count: number }> => {
    return apiCall<{ count: number }>('/notifications/unread-count', {
      headers: getAuthHeaders(),
    });
  },
};

// Loyalty API
export const loyaltyAPI = {
  // Get loyalty info
  getLoyaltyInfo: (): Promise<LoyaltyInfo> => {
    return apiCall<LoyaltyInfo>('/loyalty/info', {
      headers: getAuthHeaders(),
    });
  },

  // Get badges
  getBadges: (): Promise<{ badges: Badge[]; available_badges: any[] }> => {
    return apiCall<{ badges: Badge[]; available_badges: any[] }>('/loyalty/badges', {
      headers: getAuthHeaders(),
    });
  },

  // Get leaderboard
  getLeaderboard: (): Promise<{ leaderboard: any[] }> => {
    return apiCall<{ leaderboard: any[] }>('/loyalty/leaderboard');
  },
};

// Recommendation API
export const recommendationAPI = {
  // Get personalized recommendations
  getRecommendations: (): Promise<{ recommendations: Recommendation[] }> => {
    return apiCall<{ recommendations: Recommendation[] }>('/recommendations', {
      headers: getAuthHeaders(),
    });
  },

  // Get trending products
  getTrending: (): Promise<{ trending: any[] }> => {
    return apiCall<{ trending: any[] }>('/recommendations/trending');
  },
};
