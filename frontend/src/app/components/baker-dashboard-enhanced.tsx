import { useState, useEffect } from "react";
import {
  Package,
  ShoppingBag,
  IndianRupee,
  TrendingUp,
  Plus,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  Star,
  MessageSquare,
  BarChart3,
  Users,
  Calendar,
  Heart,
  History,
  TrendingDown,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Search,
  ChevronDown,
  Send,
  User,
  LogOut,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { bakerAPI } from "@/api/baker";
import { AddProductModal } from "@/app/components/add-product-modal";
import { EditProductModal } from "@/app/components/edit-product-modal";
import { OrderDetailsModal } from "@/app/components/order-details-modal";
import { BakerReviewsManagement } from "@/app/components/baker-reviews-management";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DashboardStats {
  totalOrders: number;
  totalProducts: number;
  totalRevenue: number;
  pendingOrders: number;
}

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  description: string;
  image_url?: string;
  in_stock: boolean;
  created_at: string;
}

interface BakerOrder {
  id: number;
  order_id: string;
  customer_name: string;
  items: OrderItem[];
  total_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
}

interface OrderItem {
  product_name: string;
  quantity: number;
  price: number;
}

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

const getCategoryImage = (category: string) => {
  const images: Record<string, string> = {
    Bread: "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=200&h=200&fit=crop",
    Pastries: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&h=200&fit=crop",
    Cakes: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=200&h=200&fit=crop",
    Cookies: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=200&h=200&fit=crop",
    "Specialty Items": "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=200&h=200&fit=crop",
  };
  return images[category] || images.Bread;
};

// Format currency in INR
const formatINR = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

interface BakerDashboardEnhancedProps {
  onLogout: () => void;
}

export function BakerDashboardEnhanced({ onLogout }: BakerDashboardEnhancedProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "products" | "orders" | "analytics" | "reviews">("overview");
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    totalProducts: 0,
    totalRevenue: 0,
    pendingOrders: 0,
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<BakerOrder[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingOrder, setViewingOrder] = useState<BakerOrder | null>(null);
  const [replyingToReview, setReplyingToReview] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [orderFilter, setOrderFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, productsData, ordersData] = await Promise.all([
        bakerAPI.getDashboardStats(),
        bakerAPI.getMyProducts(),
        bakerAPI.getMyOrders(),
      ]);

      console.log('Loaded products:', productsData); // Debug
      setStats(statsData);
      setProducts(Array.isArray(productsData) ? productsData : productsData.products || []);
      setOrders(ordersData.orders || []); // Ensure array
      
      // Mock reviews data (replace with actual API call)
      setReviews([
        {
          id: 1,
          product_id: 1,
          product_name: "Sourdough Bread",
          customer_name: "Priya Sharma",
          rating: 5,
          comment: "Absolutely delicious! Best bread in town.",
          created_at: new Date().toISOString(),
        },
        {
          id: 2,
          product_id: 2,
          product_name: "Chocolate Croissant",
          customer_name: "Rahul Verma",
          rating: 4,
          comment: "Very good, but could be flakier.",
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
      ]);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      await bakerAPI.deleteProduct(productId);
      loadDashboardData();
    } catch (error) {
      console.error("Failed to delete product:", error);
      alert("Failed to delete product");
    }
  };

  const handleToggleStock = async (product: Product) => {
    try {
      await bakerAPI.updateProduct(product.id, {
        in_stock: !product.in_stock,
      });
      loadDashboardData();
    } catch (error) {
      console.error("Failed to update stock:", error);
      alert("Failed to update stock status");
    }
  };

  const handleUpdateOrderStatus = async (orderId: number, status: string) => {
    try {
      await bakerAPI.updateOrderStatus(orderId, status);
      loadDashboardData();
    } catch (error) {
      console.error("Failed to update order status:", error);
      alert("Failed to update order status");
    }
  };

  const handleReplyToReview = async (reviewId: number) => {
    if (!replyText.trim()) return;
    
    // TODO: Implement API call
    console.log(`Replying to review ${reviewId}:`, replyText);
    
    setReviews(reviews.map(review => 
      review.id === reviewId 
        ? { ...review, reply: replyText, replied_at: new Date().toISOString() }
        : review
    ));
    
    setReplyingToReview(null);
    setReplyText("");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "confirmed":
        return "bg-blue-100 text-blue-800";
      case "preparing":
        return "bg-purple-100 text-purple-800";
      case "ready":
        return "bg-green-100 text-green-800";
      case "out_for_delivery":
        return "bg-orange-100 text-orange-800";
      case "delivered":
        return "bg-gray-100 text-gray-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Analytics calculations
  const getRevenueData = () => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toLocaleDateString('en-IN', { weekday: 'short' });
    });

    return last7Days.map((day, index) => ({
      day,
      revenue: Math.floor(Math.random() * 5000) + 2000,
      orders: Math.floor(Math.random() * 20) + 5,
    }));
  };

  const getTopProducts = () => {
    const productSales = orders.flatMap(order => 
      order.items.map(item => ({
        name: item.product_name,
        quantity: item.quantity,
        revenue: item.price * item.quantity,
      }))
    );

    const aggregated = productSales.reduce((acc, item) => {
      const existing = acc.find(p => p.name === item.name);
      if (existing) {
        existing.quantity += item.quantity;
        existing.revenue += item.revenue;
      } else {
        acc.push({ ...item });
      }
      return acc;
    }, [] as typeof productSales);

    return aggregated.sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  };

  const getPeakHours = () => {
    const hours = ['6AM', '9AM', '12PM', '3PM', '6PM', '9PM'];
    return hours.map(hour => ({
      hour,
      orders: Math.floor(Math.random() * 15) + 2,
    }));
  };

  const getCategoryDistribution = () => {
    const categories = products.reduce((acc, product) => {
      acc[product.category] = (acc[product.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const COLORS = ['#D35400', '#2E7D32', '#8E24AA', '#E65100', '#1976D2'];
    
    return Object.entries(categories).map(([name, value], index) => ({
      name,
      value,
      color: COLORS[index % COLORS.length],
    }));
  };

  const filteredOrders = orders.filter(order => {
    const matchesFilter = orderFilter === "all" || order.status === orderFilter;
    const matchesSearch = order.order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          order.customer_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  const revenueChange = 12.5; // Mock data - calculate from actual data
  const ordersChange = 8.3; // Mock data

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFF9F5] via-[#FFF5ED] to-[#FDFBF7] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#D35400] border-t-transparent"></div>
          <p className="mt-4 text-[#4E342E]/70">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF9F5] via-[#FFF5ED] to-[#FDFBF7]">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-[#D35400]/10 sticky top-0 z-40 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl text-[#4E342E] font-bold">Baker Dashboard</h1>
            <div className="flex items-center gap-4">
              <span className="text-[#4E342E]/70">Welcome back!</span>
              <Button
                onClick={() => window.location.hash = 'profile'}
                className="bg-[#829460] hover:bg-[#829460]/90 text-white rounded-xl px-4 gap-2"
              >
                <User className="w-4 h-4" />
                Profile
              </Button>
              <Button
                onClick={onLogout}
                className="bg-white hover:bg-[#FFF9F5] text-[#D35400] border-2 border-[#D35400] rounded-xl px-6 gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white/60 backdrop-blur-sm border-b border-[#D35400]/10 sticky top-[73px] z-30">
        <div className="container mx-auto px-6">
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-6 py-4 font-medium transition-all whitespace-nowrap ${
                activeTab === "overview"
                  ? "text-[#D35400] border-b-2 border-[#D35400]"
                  : "text-[#4E342E]/60 hover:text-[#4E342E]"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("products")}
              className={`px-6 py-4 font-medium transition-all whitespace-nowrap ${
                activeTab === "products"
                  ? "text-[#D35400] border-b-2 border-[#D35400]"
                  : "text-[#4E342E]/60 hover:text-[#4E342E]"
              }`}
            >
              Products
            </button>
            <button
              onClick={() => setActiveTab("orders")}
              className={`px-6 py-4 font-medium transition-all whitespace-nowrap ${
                activeTab === "orders"
                  ? "text-[#D35400] border-b-2 border-[#D35400]"
                  : "text-[#4E342E]/60 hover:text-[#4E342E]"
              }`}
            >
              Orders
              {stats.pendingOrders > 0 && (
                <span className="ml-2 bg-[#D35400] text-white text-xs px-2 py-1 rounded-full">
                  {stats.pendingOrders}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`px-6 py-4 font-medium transition-all whitespace-nowrap ${
                activeTab === "analytics"
                  ? "text-[#D35400] border-b-2 border-[#D35400]"
                  : "text-[#4E342E]/60 hover:text-[#4E342E]"
              }`}
            >
              Analytics
            </button>
            <button
              onClick={() => setActiveTab("reviews")}
              className={`px-6 py-4 font-medium transition-all whitespace-nowrap ${
                activeTab === "reviews"
                  ? "text-[#D35400] border-b-2 border-[#D35400]"
                  : "text-[#4E342E]/60 hover:text-[#4E342E]"
              }`}
            >
              Reviews
              {reviews.filter(r => !r.reply).length > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {reviews.filter(r => !r.reply).length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-[#FFE5D9] to-[#FFD4C1] border-2 border-[#D35400]/20 rounded-2xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#4E342E]/60 mb-1">Total Orders</p>
                      <p className="text-3xl font-bold text-[#D35400] mb-2">{stats.totalOrders}</p>
                      <div className="flex items-center text-sm text-green-600">
                        <ArrowUpRight className="w-4 h-4 mr-1" />
                        <span>{ordersChange}% from last week</span>
                      </div>
                    </div>
                    <div className="p-4 bg-[#D35400] rounded-xl">
                      <ShoppingBag className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-[#C8E6C9] to-[#A5D6A7] border-2 border-[#2E7D32]/20 rounded-2xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#4E342E]/60 mb-1">Total Products</p>
                      <p className="text-3xl font-bold text-[#2E7D32] mb-2">{stats.totalProducts}</p>
                      <p className="text-sm text-[#4E342E]/60">
                        {products.filter(p => p.in_stock).length} in stock
                      </p>
                    </div>
                    <div className="p-4 bg-[#2E7D32] rounded-xl">
                      <Package className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-[#FFE0B2] to-[#FFCC80] border-2 border-[#E65100]/20 rounded-2xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#4E342E]/60 mb-1">Total Revenue</p>
                      <p className="text-3xl font-bold text-[#E65100] mb-2">
                        {formatINR(stats.totalRevenue)}
                      </p>
                      <div className="flex items-center text-sm text-green-600">
                        <ArrowUpRight className="w-4 h-4 mr-1" />
                        <span>{revenueChange}% from last month</span>
                      </div>
                    </div>
                    <div className="p-4 bg-[#E65100] rounded-xl">
                      <IndianRupee className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-[#F3E5F5] to-[#E1BEE7] border-2 border-[#8E24AA]/20 rounded-2xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#4E342E]/60 mb-1">Pending Orders</p>
                      <p className="text-3xl font-bold text-[#8E24AA] mb-2">{stats.pendingOrders}</p>
                      <p className="text-sm text-[#4E342E]/60">Needs attention</p>
                    </div>
                    <div className="p-4 bg-[#8E24AA] rounded-xl">
                      <Clock className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-white rounded-2xl border-2 border-[#D35400]/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#4E342E]/60 mb-1">Average Rating</p>
                      <div className="flex items-center gap-2">
                        <p className="text-2xl font-bold text-[#D35400]">{averageRating}</p>
                        <Star className="w-5 h-5 fill-[#D35400] text-[#D35400]" />
                      </div>
                    </div>
                    <Award className="w-8 h-8 text-[#D35400]/30" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white rounded-2xl border-2 border-[#D35400]/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#4E342E]/60 mb-1">Avg Order Value</p>
                      <p className="text-2xl font-bold text-[#D35400]">
                        {formatINR(orders.length > 0 ? stats.totalRevenue / stats.totalOrders : 0)}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-[#D35400]/30" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white rounded-2xl border-2 border-[#D35400]/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#4E342E]/60 mb-1">Total Customers</p>
                      <p className="text-2xl font-bold text-[#D35400]">
                        {new Set(orders.map(o => o.customer_name)).size}
                      </p>
                    </div>
                    <Users className="w-8 h-8 text-[#D35400]/30" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Orders */}
            <Card className="bg-white rounded-2xl border-2 border-[#D35400]/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl text-[#4E342E] font-semibold">Recent Orders</h2>
                  <Button
                    onClick={() => setActiveTab("orders")}
                    className="bg-[#D35400] hover:bg-[#D35400]/90 text-white rounded-xl"
                  >
                    View All
                  </Button>
                </div>
                {orders.length === 0 ? (
                  <p className="text-center text-[#4E342E]/60 py-8">No orders yet</p>
                ) : (
                  <div className="space-y-4">
                    {orders.slice(0, 5).map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-4 bg-[#FFF9F5] rounded-xl border border-[#D35400]/10 hover:shadow-md transition-all"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <p className="font-medium text-[#4E342E]">{order.order_id}</p>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                order.status
                              )}`}
                            >
                              {order.status}
                            </span>
                          </div>
                          <p className="text-sm text-[#4E342E]/70">
                            {order.customer_name} • {order.items.length} items • {formatINR(order.total_amount)}
                          </p>
                        </div>
                        <Button
                          onClick={() => setViewingOrder(order)}
                          className="bg-[#D35400] hover:bg-[#D35400]/90 text-white rounded-xl"
                        >
                          View Details
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Products Tab - SAME AS BEFORE */}
        {activeTab === "products" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl text-[#4E342E] font-semibold">My Products</h2>
              <Button
                onClick={() => setShowAddProduct(true)}
                className="bg-[#2E7D32] hover:bg-[#2E7D32]/90 text-white rounded-xl px-6 py-3"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Product
              </Button>
            </div>

            {products.length === 0 ? (
              <Card className="bg-white rounded-2xl border-2 border-[#D35400]/10">
                <CardContent className="p-12 text-center">
                  <Package className="w-16 h-16 text-[#D35400]/30 mx-auto mb-4" />
                  <p className="text-xl text-[#4E342E] mb-2">No products yet</p>
                  <p className="text-[#4E342E]/60 mb-6">
                    Start by adding your first product
                  </p>
                  <Button
                    onClick={() => setShowAddProduct(true)}
                    className="bg-[#D35400] hover:bg-[#D35400]/90 text-white rounded-xl px-8 py-3"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Add Your First Product
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <Card
                    key={product.id}
                    className="bg-white rounded-2xl border-2 border-[#D35400]/10 hover:shadow-xl transition-all"
                  >
                    <div className="relative h-48 overflow-hidden rounded-t-2xl bg-gradient-to-br from-[#FFE5D9] to-[#FFD4C1]">
                      <img
                        src={product.image_url || getCategoryImage(product.category)}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-3 right-3 bg-[#2E7D32] text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                        <IndianRupee className="w-3 h-3" />
                        {product.price.toFixed(0)}
                      </div>
                      {!product.in_stock && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold">
                            Out of Stock
                          </span>
                        </div>
                      )}
                    </div>

                    <CardContent className="p-5">
                      <div className="mb-4">
                        <h3 className="text-lg font-medium text-[#4E342E] mb-2">
                          {product.name}
                        </h3>
                        <p className="text-sm text-[#4E342E]/70 line-clamp-2">
                          {product.description || "No description"}
                        </p>
                        <p className="text-sm text-[#D35400] mt-2">{product.category}</p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleToggleStock(product)}
                          className={`flex-1 rounded-xl text-xs ${
                            product.in_stock
                              ? "bg-yellow-500 hover:bg-yellow-600"
                              : "bg-[#2E7D32] hover:bg-[#2E7D32]/90"
                          } text-white`}
                        >
                          {product.in_stock ? "Out of Stock" : "In Stock"}
                        </Button>
                        <Button
                          onClick={() => setEditingProduct(product)}
                          className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl px-4"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="bg-red-500 hover:bg-red-600 text-white rounded-xl px-4"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}



        {/* Orders Tab */}
        {activeTab === "orders" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl text-[#4E342E] font-semibold">Orders Management</h2>
              <div className="flex gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#4E342E]/40 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search orders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border-2 border-[#D35400]/20 rounded-xl focus:border-[#D35400] focus:ring-2 focus:ring-[#D35400]/20 outline-none"
                  />
                </div>
                <select
                  value={orderFilter}
                  onChange={(e) => setOrderFilter(e.target.value)}
                  className="px-4 py-2 border-2 border-[#D35400]/20 rounded-xl focus:border-[#D35400] focus:ring-2 focus:ring-[#D35400]/20 outline-none bg-white"
                >
                  <option value="all">All Orders</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="preparing">Preparing</option>
                  <option value="ready">Ready</option>
                  <option value="out_for_delivery">Out for Delivery</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <Card className="bg-white rounded-2xl border-2 border-[#D35400]/10">
                <CardContent className="p-12 text-center">
                  <ShoppingBag className="w-16 h-16 text-[#D35400]/30 mx-auto mb-4" />
                  <p className="text-xl text-[#4E342E] mb-2">No orders found</p>
                  <p className="text-[#4E342E]/60">
                    {orderFilter !== "all" ? "Try changing your filter" : "Orders will appear here"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <Card key={order.id} className="bg-white rounded-2xl border-2 border-[#D35400]/10 hover:shadow-lg transition-all">
                    <CardContent className="p-6">
                      {/* Two Box Layout */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Left Box - Order Info */}
                        <div className="space-y-4">
                          <div>
                            <p className="text-lg font-semibold text-[#4E342E] mb-1">{order.order_id}</p>
                            <p className="text-sm text-[#4E342E]/60">{order.customer_name}</p>
                          </div>
                          <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                          
                          <div className="p-4 bg-[#FFF9F5] rounded-xl">
                            <p className="text-sm font-medium text-[#4E342E] mb-2">Order Items:</p>
                            <div className="space-y-2">
                              {order.items.map((item, index) => (
                                <div key={index} className="flex justify-between text-sm">
                                  <span className="text-[#4E342E]/70">
                                    {item.product_name} x {item.quantity}
                                  </span>
                                  <span className="font-medium text-[#D35400]">
                                    {formatINR(item.price * item.quantity)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Right Box - Total & Actions */}
                        <div className="space-y-4 flex flex-col">
                          <div className="text-left md:text-right">
                            <p className="text-2xl font-bold text-[#D35400] mb-1">{formatINR(order.total_amount)}</p>
                            <p className="text-sm text-[#4E342E]/60">
                              {new Date(order.created_at).toLocaleDateString('en-IN')}
                            </p>
                          </div>

                          <div className="flex-1 flex flex-col justify-end">
                            <div className="flex flex-wrap gap-2 justify-end">
                              <Button
                                onClick={() => setViewingOrder(order)}
                                className="bg-[#D35400] hover:bg-[#D35400]/90 text-white rounded-lg px-4 py-2 text-sm"
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View Details
                              </Button>
                              {order.status === "pending" && (
                                <Button
                                  onClick={() => handleUpdateOrderStatus(order.id, "confirmed")}
                                  className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-4 py-2 text-sm"
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Confirm
                                </Button>
                              )}
                              {order.status === "confirmed" && (
                                <Button
                                  onClick={() => handleUpdateOrderStatus(order.id, "preparing")}
                                  className="bg-purple-500 hover:bg-purple-600 text-white rounded-lg px-4 py-2 text-sm"
                                >
                                  <Clock className="w-4 h-4 mr-1" />
                                  Preparing
                                </Button>
                              )}
                              {order.status === "preparing" && (
                                <Button
                                  onClick={() => handleUpdateOrderStatus(order.id, "ready")}
                                  className="bg-green-500 hover:bg-green-600 text-white rounded-lg px-4 py-2 text-sm"
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Ready
                                </Button>
                              )}
                              {order.status === "ready" && (
                                <Button
                                  onClick={() => handleUpdateOrderStatus(order.id, "out_for_delivery")}
                                  className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-4 py-2 text-sm"
                                >
                                  <Send className="w-4 h-4 mr-1" />
                                  Out for Delivery
                                </Button>
                              )}
                              {order.status === "out_for_delivery" && (
                                <Button
                                  onClick={() => handleUpdateOrderStatus(order.id, "delivered")}
                                  className="bg-[#2E7D32] hover:bg-[#2E7D32]/90 text-white rounded-lg px-4 py-2 text-sm"
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Delivered
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            <h2 className="text-2xl text-[#4E342E] font-semibold mb-6">Analytics & Insights</h2>

            {/* Revenue Chart */}
            <Card className="bg-white rounded-2xl border-2 border-[#D35400]/10">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-[#4E342E] mb-6">Revenue Trend (Last 7 Days)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={getRevenueData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#D35400" opacity={0.1} />
                    <XAxis dataKey="day" stroke="#4E342E" />
                    <YAxis stroke="#4E342E" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFF9F5',
                        border: '2px solid #D35400',
                        borderRadius: '12px',
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#D35400" strokeWidth={3} name="Revenue (₹)" />
                    <Line type="monotone" dataKey="orders" stroke="#2E7D32" strokeWidth={3} name="Orders" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Products */}
              <Card className="bg-white rounded-2xl border-2 border-[#D35400]/10">
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold text-[#4E342E] mb-6">Top Selling Products</h3>
                  {getTopProducts().length === 0 ? (
                    <p className="text-center text-[#4E342E]/60 py-8">No sales data yet</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={getTopProducts()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#D35400" opacity={0.1} />
                        <XAxis dataKey="name" stroke="#4E342E" />
                        <YAxis stroke="#4E342E" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#FFF9F5',
                            border: '2px solid #D35400',
                            borderRadius: '12px',
                          }}
                        />
                        <Bar dataKey="revenue" fill="#D35400" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Category Distribution */}
              <Card className="bg-white rounded-2xl border-2 border-[#D35400]/10">
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold text-[#4E342E] mb-6">Product Categories</h3>
                  {getCategoryDistribution().length === 0 ? (
                    <p className="text-center text-[#4E342E]/60 py-8">No products yet</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={getCategoryDistribution()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {getCategoryDistribution().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Peak Hours */}
            <Card className="bg-white rounded-2xl border-2 border-[#D35400]/10">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-[#4E342E] mb-6">Peak Order Hours</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getPeakHours()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#D35400" opacity={0.1} />
                    <XAxis dataKey="hour" stroke="#4E342E" />
                    <YAxis stroke="#4E342E" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFF9F5',
                        border: '2px solid #D35400',
                        borderRadius: '12px',
                      }}
                    />
                    <Bar dataKey="orders" fill="#8E24AA" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === "reviews" && (
          <BakerReviewsManagement />
        )}
      </div>

      {/* Modals */}{/* Modals */}
      {showAddProduct && (
        <AddProductModal
          isOpen={showAddProduct}
          onClose={() => setShowAddProduct(false)}
          onSuccess={loadDashboardData}
        />
      )}
      {editingProduct && (
        <EditProductModal
          isOpen={!!editingProduct}
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSuccess={loadDashboardData}
        />
      )}
      {viewingOrder && (
        <OrderDetailsModal
          isOpen={!!viewingOrder}
          order={viewingOrder}
          onClose={() => setViewingOrder(null)}
          onUpdateStatus={handleUpdateOrderStatus}
        />
      )}
    </div>
  );
}
