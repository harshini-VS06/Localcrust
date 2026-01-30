import { apiCall, setAuthToken } from './config';

// Types
export interface User {
  id: number;
  name: string;
  email: string;
  user_type: 'customer' | 'baker';
  baker_profile?: {
    id: number;
    shop_name: string;
    verified: boolean;
  };
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  user_type: 'customer' | 'baker';
}

export interface LoginData {
  email: string;
  password: string;
}

export interface OTPResponse {
  message: string;
  email: string;
  otp?: string; // Only in development
}

export interface Product {
  id?: number;
  name: string;
  category: string;
  price: string;
  description?: string;
}

export interface BakerRegistrationData {
  // Step 1: Basic Information
  shop_name: string;
  owner_name: string;
  email: string;
  phone: string;
  password: string;
  
  // Step 2: Business Verification
  business_license: string;
  tax_id: string;
  shop_address: string;
  city: string;
  state: string;
  zip_code: string;
  license_document?: string;
  
  // Step 3: Product Catalogue
  shop_description: string;
  products: Product[];
}

// Auth API calls
export const authAPI = {
  // Register customer
  register: (data: RegisterData): Promise<AuthResponse> => {
    return apiCall<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then((response) => {
      setAuthToken(response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      return response;
    });
  },

  // Login with email/password
  login: (data: LoginData): Promise<AuthResponse> => {
    return apiCall<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then((response) => {
      setAuthToken(response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      return response;
    });
  },

  // Send OTP
  sendOTP: (email: string): Promise<OTPResponse> => {
    return apiCall<OTPResponse>('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  // Verify OTP and login
  verifyOTP: (email: string, otp: string): Promise<AuthResponse> => {
    return apiCall<AuthResponse>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    }).then((response) => {
      setAuthToken(response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      return response;
    });
  },
};

// Baker API calls
export const bakerAPI = {
  // Register baker with full details
  register: (data: BakerRegistrationData): Promise<AuthResponse> => {
    return apiCall<AuthResponse>('/baker/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then((response) => {
      setAuthToken(response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      return response;
    });
  },
};
