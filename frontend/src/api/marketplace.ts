import { apiCall, getAuthHeaders } from './config';

// Types
export interface Baker {
  id: number;
  shop_name: string;
  shop_description: string;
  city: string;
  state: string;
  product_count?: number;
  verified: boolean;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  description?: string;
  image_url?: string;
  in_stock: boolean;
  baker: {
    id: number;
    shop_name: string;
    city: string;
  };
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Address {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
}

export interface Order {
  id: number;
  order_id: string;
  user_id: number;
  total_amount: number;
  status: string;
  payment_status: string;
  delivery_address: string;
  items: OrderItem[];
  created_at: string;
}

export interface OrderItem {
  product_id: number;
  product_name: string;
  quantity: number;
  price: number;
  baker_name: string;
}

// Marketplace API calls
export const marketplaceAPI = {
  // Get all products
  getAllProducts: (): Promise<{ products: Product[] }> => {
    return apiCall<{ products: Product[] }>('/products');
  },

  // Get all verified bakers
  getAllBakers: (): Promise<{ bakers: Baker[] }> => {
    return apiCall<{ bakers: Baker[] }>('/bakers');
  },

  // Get baker profile
  getBakerProfile: (bakerId: number): Promise<Baker> => {
    return apiCall<Baker>(`/baker/profile/${bakerId}`);
  },

  // Get products by category
  getProductsByCategory: (category: string): Promise<{ products: Product[] }> => {
    return apiCall<{ products: Product[] }>(`/products?category=${category}`);
  },
};

// Order API calls
export const orderAPI = {
  // Create order
  createOrder: (data: {
    items: { product_id: number; quantity: number; price: number }[];
    delivery_address: Address;
    total_amount: number;
  }): Promise<Order> => {
    return apiCall<Order>('/orders', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },

  // Update payment status
  updatePaymentStatus: (
    orderId: number,
    paymentData: {
      payment_id: string;
      payment_status: string;
    }
  ): Promise<Order> => {
    return apiCall<Order>(`/orders/${orderId}/payment`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(paymentData),
    });
  },

  // Get user orders
  getUserOrders: (): Promise<{ orders: Order[] }> => {
    return apiCall<{ orders: Order[] }>('/orders/my-orders', {
      headers: getAuthHeaders(),
    });
  },

  // Get order by ID
  getOrderById: (orderId: number): Promise<Order> => {
    return apiCall<Order>(`/orders/${orderId}`, {
      headers: getAuthHeaders(),
    });
  },
};
