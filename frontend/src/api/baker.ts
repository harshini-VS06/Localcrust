import { apiCall, getAuthHeaders } from './config';

// Types
export interface DashboardStats {
  totalOrders: number;
  totalProducts: number;
  totalRevenue: number;
  pendingOrders: number;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  description: string;
  in_stock: boolean;
  created_at: string;
}

export interface BakerOrder {
  id: number;
  order_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  items: OrderItem[];
  total_amount: number;
  status: string;
  payment_status: string;
  delivery_address: any;
  created_at: string;
  time_ago?: string;
}

export interface OrderItem {
  product_id: number;
  product_name: string;
  quantity: number;
  price: number;
}

export interface ProductFormData {
  name: string;
  category: string;
  price: number;
  description?: string;
  in_stock?: boolean;
}

export interface RevenueTrend {
  month: string;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  id: number;
  name: string;
  category: string;
  price: number;
  total_sales: number;
  total_revenue: number;
  order_count: number;
}

export interface PeakHour {
  hour: string;
  order_count: number;
}

export interface CategoryDistribution {
  name: string;
  value: number;
  sales: number;
  color: string;
}

export interface CustomerInsights {
  total_customers: number;
  repeat_customers: number;
  avg_order_value: number;
  repeat_rate: number;
  top_customers: TopCustomer[];
}

export interface TopCustomer {
  name: string;
  email: string;
  order_count: number;
  total_spent: number;
}

export interface Review {
  id: number;
  product_id: number;
  product_name: string;
  customer_name: string;
  customer_email: string;
  rating: number;
  comment: string;
  created_at: string;
  time_ago: string;
}

export interface InventoryItem {
  id: number;
  name: string;
  category: string;
  price: number;
  in_stock: boolean;
  weekly_sales: number;
  created_at: string;
}

export interface BakerProfile {
  id: number;
  user_id: number;
  shop_name: string;
  owner_name: string;
  phone: string;
  email: string;
  business_license: string;
  tax_id: string;
  shop_address: string;
  city: string;
  state: string;
  zip_code: string;
  shop_description: string;
  verified: boolean;
  created_at: string;
}

// Currency configuration
export const CURRENCY = {
  symbol: '₹',
  code: 'INR',
  format: (amount: number) => `₹${amount.toFixed(2)}`
};

// Baker API calls
export const bakerAPI = {
  // Get dashboard statistics
  getDashboardStats: (): Promise<DashboardStats> => {
    return apiCall<DashboardStats>('/baker/dashboard/stats', {
      headers: getAuthHeaders(),
    });
  },

  // Get baker's products
  getMyProducts: (): Promise<{ products: Product[] }> => {
    return apiCall<{ products: Product[] }>('/baker/products', {
      headers: getAuthHeaders(),
    });
  },

  // Get baker's orders
  getMyOrders: (): Promise<{ orders: BakerOrder[] }> => {
    return apiCall<{ orders: BakerOrder[] }>('/baker/orders', {
      headers: getAuthHeaders(),
    });
  },

  // Add new product
  addProduct: (data: ProductFormData): Promise<{ message: string; product: Product }> => {
    return apiCall<{ message: string; product: Product }>('/baker/products', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },

  // Update product
  updateProduct: (
    productId: number,
    data: Partial<ProductFormData>
  ): Promise<{ message: string; product: Product }> => {
    return apiCall<{ message: string; product: Product }>(`/baker/products/${productId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },

  // Delete product
  deleteProduct: (productId: number): Promise<{ message: string }> => {
    return apiCall<{ message: string }>(`/baker/products/${productId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
  },

  // Update order status
  updateOrderStatus: (
    orderId: number,
    status: string
  ): Promise<{ message: string; order: BakerOrder }> => {
    return apiCall<{ message: string; order: BakerOrder }>(`/baker/orders/${orderId}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    });
  },

  // Analytics endpoints
  getRevenueTrends: (months: number = 6): Promise<{ revenue_trends: RevenueTrend[]; currency: string; currency_symbol: string }> => {
    return apiCall<{ revenue_trends: RevenueTrend[]; currency: string; currency_symbol: string }>(
      `/baker/analytics/revenue-trends?months=${months}`,
      {
        headers: getAuthHeaders(),
      }
    );
  },

  getTopProducts: (limit: number = 10): Promise<{ top_products: TopProduct[]; currency: string; currency_symbol: string }> => {
    return apiCall<{ top_products: TopProduct[]; currency: string; currency_symbol: string }>(
      `/baker/analytics/top-products?limit=${limit}`,
      {
        headers: getAuthHeaders(),
      }
    );
  },

  getPeakHours: (): Promise<{ peak_hours: PeakHour[] }> => {
    return apiCall<{ peak_hours: PeakHour[] }>('/baker/analytics/peak-hours', {
      headers: getAuthHeaders(),
    });
  },

  getCategoryDistribution: (): Promise<{ category_distribution: CategoryDistribution[]; currency: string; currency_symbol: string }> => {
    return apiCall<{ category_distribution: CategoryDistribution[]; currency: string; currency_symbol: string }>(
      '/baker/analytics/category-distribution',
      {
        headers: getAuthHeaders(),
      }
    );
  },

  getCustomerInsights: (): Promise<{ customer_insights: CustomerInsights; currency: string; currency_symbol: string }> => {
    return apiCall<{ customer_insights: CustomerInsights; currency: string; currency_symbol: string }>(
      '/baker/analytics/customer-insights',
      {
        headers: getAuthHeaders(),
      }
    );
  },

  // Reviews endpoint
  getReviews: (): Promise<{ reviews: Review[]; average_rating: number; total_reviews: number }> => {
    return apiCall<{ reviews: Review[]; average_rating: number; total_reviews: number }>(
      '/baker/reviews',
      {
        headers: getAuthHeaders(),
      }
    );
  },

  // Inventory endpoint
  getInventory: (): Promise<{ inventory: InventoryItem[]; total_products: number; in_stock_count: number; out_of_stock_count: number; currency: string; currency_symbol: string }> => {
    return apiCall<{ inventory: InventoryItem[]; total_products: number; in_stock_count: number; out_of_stock_count: number; currency: string; currency_symbol: string }>(
      '/baker/inventory',
      {
        headers: getAuthHeaders(),
      }
    );
  },

  // Order history with filters
  getOrderHistory: (filters?: { status?: string; start_date?: string; end_date?: string }): Promise<{ orders: BakerOrder[]; total_orders: number; currency: string; currency_symbol: string }> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    
    const queryString = params.toString();
    const url = queryString ? `/baker/order-history?${queryString}` : '/baker/order-history';
    
    return apiCall<{ orders: BakerOrder[]; total_orders: number; currency: string; currency_symbol: string }>(
      url,
      {
        headers: getAuthHeaders(),
      }
    );
  },

  // Profile management
  getProfile: (): Promise<BakerProfile> => {
    return apiCall<BakerProfile>('/baker/profile', {
      headers: getAuthHeaders(),
    });
  },

  updateProfile: (data: Partial<BakerProfile>): Promise<{ message: string; profile: BakerProfile }> => {
    return apiCall<{ message: string; profile: BakerProfile }>('/baker/profile', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },
};
