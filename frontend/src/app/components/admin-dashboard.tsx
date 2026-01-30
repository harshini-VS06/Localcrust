import { useState, useEffect } from "react";
import { 
  Users, Store, ShoppingBag, Package, DollarSign, 
  TrendingUp, CheckCircle, XCircle, Clock, AlertTriangle,
  Eye, Search, Filter, ArrowLeft, BarChart3
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { apiCall, getAuthHeaders } from "@/api/config";

interface AdminStats {
  total_users: number;
  total_bakers: number;
  verified_bakers: number;
  pending_bakers: number;
  total_products: number;
  total_orders: number;
  pending_orders: number;
  total_revenue: number;
}

interface Baker {
  id: string;
  shop_name: string;
  owner_name: string;
  phone: string;
  city: string;
  state: string;
  business_license: string;
  tax_id: string;
  shop_description: string;
  verified: boolean;
  user_email?: string;
  product_count?: number;
}

interface Order {
  id: string;
  order_id: string;
  customer_name: string;
  customer_email: string;
  total_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
  items: any[];
}

interface Review {
  id: string;
  user_name: string;
  product_name: string;
  rating: number;
  comment: string;
  baker_reply?: string;
  created_at: string;
}

interface SalesReport {
  total_revenue: number;
  total_orders: number;
  revenue_by_baker: Array<{
    baker_id: string;
    baker_name: string;
    revenue: number;
    orders: number;
  }>;
  top_products: Array<{
    product_id: string;
    product_name: string;
    quantity_sold: number;
    revenue: number;
  }>;
}

type AdminView = 'dashboard' | 'bakers' | 'orders' | 'users' | 'reviews' | 'reports';

export function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [activeView, setActiveView] = useState<AdminView>('dashboard');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pendingBakers, setPendingBakers] = useState<Baker[]>([]);
  const [allBakers, setAllBakers] = useState<Baker[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBaker, setSelectedBaker] = useState<Baker | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showAddBakerModal, setShowAddBakerModal] = useState(false);
  

  useEffect(() => {
    loadDashboardData();
  }, [activeView]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      if (activeView === 'dashboard') {
        await loadStats();
      } else if (activeView === 'bakers') {
        await Promise.all([loadPendingBakers(), loadAllBakers()]);
      } else if (activeView === 'orders') {
        await loadOrders();
      } else if (activeView === 'reviews') {
        await loadReviews();
      } else if (activeView === 'reports') {
        await loadSalesReport();
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    const data = await apiCall<AdminStats>('/admin/stats', {
      headers: getAuthHeaders(),
    });
    setStats(data);
  };

  const loadPendingBakers = async () => {
    const data = await apiCall<{ bakers: Baker[] }>('/admin/bakers/pending', {
      headers: getAuthHeaders(),
    });
    setPendingBakers(data.bakers);
  };

  const loadAllBakers = async () => {
    const data = await apiCall<{ bakers: Baker[] }>('/admin/bakers', {
      headers: getAuthHeaders(),
    });
    setAllBakers(data.bakers);
  };

  const loadOrders = async () => {
    const data = await apiCall<{ orders: Order[] }>('/admin/orders', {
      headers: getAuthHeaders(),
    });
    setOrders(data.orders);
  };

  const loadReviews = async () => {
    const data = await apiCall<{ reviews: Review[] }>('/admin/reviews', {
      headers: getAuthHeaders(),
    });
    setReviews(data.reviews);
  };

  const loadSalesReport = async () => {
    const data = await apiCall<SalesReport>('/admin/reports/sales', {
      headers: getAuthHeaders(),
    });
    setSalesReport(data);
  };

  const handleVerifyBaker = async (bakerId: string) => {
    if (!confirm('Are you sure you want to approve this baker?')) return;

    try {
      await apiCall(`/admin/bakers/${bakerId}/verify`, {
        method: 'PUT',
        headers: getAuthHeaders(),
      });
      alert('Baker verified successfully!');
      await loadPendingBakers();
      await loadAllBakers();
      await loadStats();
    } catch (error: any) {
      alert(error.message || 'Failed to verify baker');
    }
  };

  const handleRejectBaker = async (bakerId: string) => {
    const reason = prompt('Enter reason for rejection:');
    if (!reason) return;

    try {
      await apiCall(`/admin/bakers/${bakerId}/reject`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason }),
      });
      alert('Baker application rejected');
      await loadPendingBakers();
      await loadAllBakers();
      await loadStats();
    } catch (error: any) {
      alert(error.message || 'Failed to reject baker');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      preparing: 'bg-purple-100 text-purple-800',
      ready: 'bg-green-100 text-green-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`text-lg ${
              star <= rating ? 'text-yellow-400' : 'text-gray-300'
            }`}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF9F5] via-[#FFF5ED] to-[#FDFBF7]">
      {/* Header */}
      <header className="bg-white border-b border-[#D35400]/10 shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-[#D35400] to-[#E67E22] rounded-lg">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#4E342E]">Admin Dashboard</h1>
                <p className="text-sm text-[#4E342E]/60">Local Crust Management</p>
              </div>
            </div>
            <Button
              onClick={onLogout}
              className="bg-red-500 hover:bg-red-600 text-white rounded-xl"
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <div className="bg-white border-b border-[#D35400]/10">
        <div className="container mx-auto px-6">
          <div className="flex gap-4 overflow-x-auto">
            {[
              { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { key: 'bakers', label: 'Bakers', icon: Store },
              { key: 'orders', label: 'Orders', icon: ShoppingBag },
              { key: 'reviews', label: 'Reviews', icon: Eye },
              { key: 'reports', label: 'Reports', icon: TrendingUp },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveView(item.key as AdminView)}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-all border-b-2 ${
                  activeView === item.key
                    ? 'text-[#D35400] border-[#D35400]'
                    : 'text-[#4E342E]/60 border-transparent hover:text-[#4E342E]'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#D35400] border-t-transparent"></div>
          </div>
        ) : (
          <>
            {/* Dashboard View */}
            {activeView === 'dashboard' && stats && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-[#4E342E]">Platform Overview</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-blue-600 font-medium">Total Users</p>
                          <p className="text-3xl font-bold text-blue-900 mt-1">
                            {stats.total_users}
                          </p>
                        </div>
                        <Users className="w-12 h-12 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-orange-600 font-medium">Total Bakers</p>
                          <p className="text-3xl font-bold text-orange-900 mt-1">
                            {stats.total_bakers}
                          </p>
                          <p className="text-xs text-orange-600 mt-1">
                            {stats.pending_bakers} pending
                          </p>
                        </div>
                        <Store className="w-12 h-12 text-orange-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-purple-600 font-medium">Total Orders</p>
                          <p className="text-3xl font-bold text-purple-900 mt-1">
                            {stats.total_orders}
                          </p>
                          <p className="text-xs text-purple-600 mt-1">
                            {stats.pending_orders} pending
                          </p>
                        </div>
                        <ShoppingBag className="w-12 h-12 text-purple-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-green-600 font-medium">Total Revenue</p>
                          <p className="text-3xl font-bold text-green-900 mt-1">
                            ₹{Math.round(stats.total_revenue)}
                          </p>
                        </div>
                        <DollarSign className="w-12 h-12 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="bg-white border-2 border-[#D35400]/10">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold text-[#4E342E] mb-4">
                      Quick Actions
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Button
                        onClick={() => setActiveView('bakers')}
                        className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-6"
                      >
                        <Clock className="w-5 h-5 mr-2" />
                        Review Pending Bakers ({stats.pending_bakers})
                      </Button>
                      <Button
                        onClick={() => setActiveView('orders')}
                        className="bg-purple-500 hover:bg-purple-600 text-white rounded-xl py-6"
                      >
                        <ShoppingBag className="w-5 h-5 mr-2" />
                        View Pending Orders ({stats.pending_orders})
                      </Button>
                      <Button
                        onClick={() => setActiveView('reports')}
                        className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl py-6"
                      >
                        <TrendingUp className="w-5 h-5 mr-2" />
                        View Sales Reports
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Bakers View */}
            {activeView === 'bakers' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-[#4E342E]">Baker Management</h2>
                  <div className="flex gap-2">
                    <span className="px-4 py-2 bg-orange-100 text-orange-800 rounded-lg font-medium">
                      {pendingBakers.length} Pending
                    </span>
                    <span className="px-4 py-2 bg-green-100 text-green-800 rounded-lg font-medium">
                      {allBakers.filter(b => b.verified).length} Verified
                    </span>
                  </div>
                </div>

                {/* Pending Bakers */}
                {pendingBakers.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-orange-500" />
                      <h3 className="text-xl font-bold text-[#4E342E]">
                        Pending Applications ({pendingBakers.length})
                      </h3>
                    </div>

                    {pendingBakers.map((baker) => (
                      <Card key={baker.id} className="bg-white border-2 border-orange-200">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="text-lg font-bold text-[#4E342E] mb-2">
                                {baker.shop_name}
                              </h4>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="text-[#4E342E]/60">Owner</p>
                                  <p className="text-[#4E342E] font-medium">{baker.owner_name}</p>
                                </div>
                                <div>
                                  <p className="text-[#4E342E]/60">Email</p>
                                  <p className="text-[#4E342E] font-medium">{baker.user_email}</p>
                                </div>
                                <div>
                                  <p className="text-[#4E342E]/60">Phone</p>
                                  <p className="text-[#4E342E] font-medium">{baker.phone}</p>
                                </div>
                                <div>
                                  <p className="text-[#4E342E]/60">Location</p>
                                  <p className="text-[#4E342E] font-medium">
                                    {baker.city}, {baker.state}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[#4E342E]/60">Business License</p>
                                  <p className="text-[#4E342E] font-medium">{baker.business_license}</p>
                                </div>
                                <div>
                                  <p className="text-[#4E342E]/60">Tax ID</p>
                                  <p className="text-[#4E342E] font-medium">{baker.tax_id}</p>
                                </div>
                              </div>
                              <div className="mt-4">
                                <p className="text-[#4E342E]/60 text-sm">Description</p>
                                <p className="text-[#4E342E] mt-1">{baker.shop_description}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-3 mt-6">
                            <Button
                              onClick={() => handleVerifyBaker(baker.id)}
                              className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-xl"
                            >
                              <CheckCircle className="w-5 h-5 mr-2" />
                              Approve Baker
                            </Button>
                            <Button
                              onClick={() => handleRejectBaker(baker.id)}
                              className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl"
                            >
                              <XCircle className="w-5 h-5 mr-2" />
                              Reject Application
                            </Button>
                            <Button
                              onClick={() => setSelectedBaker(baker)}
                              className="px-6 bg-blue-500 hover:bg-blue-600 text-white rounded-xl"
                            >
                              <Eye className="w-5 h-5" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* All Bakers */}
                <div className="space-y-4 mt-8">
                  <h3 className="text-xl font-bold text-[#4E342E]">
                    All Bakers ({allBakers.length})
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {allBakers.map((baker) => (
                      <Card
                        key={baker.id}
                        className={`bg-white border-2 ${
                          baker.verified
                            ? 'border-green-200'
                            : 'border-orange-200'
                        }`}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h4 className="text-lg font-bold text-[#4E342E]">
                                {baker.shop_name}
                              </h4>
                              <p className="text-sm text-[#4E342E]/60">
                                {baker.city}, {baker.state}
                              </p>
                            </div>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                baker.verified
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-orange-100 text-orange-800'
                              }`}
                            >
                              {baker.verified ? 'Verified' : 'Pending'}
                            </span>
                          </div>
                          <div className="text-sm space-y-2">
                            <p className="text-[#4E342E]/60">
                              Owner: <span className="text-[#4E342E] font-medium">{baker.owner_name}</span>
                            </p>
                            <p className="text-[#4E342E]/60">
                              Products: <span className="text-[#4E342E] font-medium">{baker.product_count || 0}</span>
                            </p>
                            <p className="text-[#4E342E]/60">
                              Email: <span className="text-[#4E342E] font-medium">{baker.user_email}</span>
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Orders View */}
            {activeView === 'orders' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-[#4E342E]">All Orders</h2>
                  <div className="flex items-center gap-2">
                    <Search className="w-5 h-5 text-[#4E342E]/40" />
                    <input
                      type="text"
                      placeholder="Search orders..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="px-4 py-2 border-2 border-[#D35400]/20 rounded-xl focus:border-[#D35400] outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  {orders
                    .filter(
                      (order) =>
                        order.order_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        order.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((order) => (
                      <Card key={order.id} className="bg-white border-2 border-[#D35400]/10">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h4 className="text-lg font-bold text-[#4E342E]">
                                Order {order.order_id}
                              </h4>
                              <p className="text-sm text-[#4E342E]/60">
                                Customer: {order.customer_name} ({order.customer_email})
                              </p>
                              <p className="text-sm text-[#4E342E]/60">
                                {new Date(order.created_at).toLocaleString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-[#D35400]">
                                ₹{Math.round(order.total_amount)}
                              </p>
                              <span
                                className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                  order.status
                                )}`}
                              >
                                {order.status.toUpperCase()}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <p className="text-sm font-medium text-[#4E342E]">Items:</p>
                            {order.items.map((item, index) => (
                              <div
                                key={index}
                                className="flex justify-between text-sm bg-[#FFF9F5] rounded-lg p-3"
                              >
                                <span className="text-[#4E342E]">
                                  {item.product_name} × {item.quantity}
                                </span>
                                <span className="text-[#4E342E] font-medium">
                                  ₹{Math.round(item.price * item.quantity)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>
            )}

            {/* Reviews View */}
            {activeView === 'reviews' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-[#4E342E]">
                  All Reviews ({reviews.length})
                </h2>

                <div className="space-y-4">
                  {reviews.map((review) => (
                    <Card key={review.id} className="bg-white border-2 border-[#D35400]/10">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h4 className="text-lg font-bold text-[#4E342E]">
                              {review.product_name}
                            </h4>
                            <p className="text-sm text-[#4E342E]/60">
                              by {review.user_name}
                            </p>
                            <p className="text-xs text-[#4E342E]/40">
                              {new Date(review.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          {renderStars(review.rating)}
                        </div>

                        <div className="bg-[#FFF9F5] rounded-xl p-4 mb-4">
                          <p className="text-[#4E342E]">{review.comment}</p>
                        </div>

                        {review.baker_reply && (
                          <div className="bg-gradient-to-br from-[#D35400]/5 to-[#D35400]/10 rounded-xl p-4 border-l-4 border-[#D35400]">
                            <p className="text-sm font-semibold text-[#D35400] mb-2">
                              Baker's Response:
                            </p>
                            <p className="text-[#4E342E]">{review.baker_reply}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Reports View */}
            {activeView === 'reports' && salesReport && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-[#4E342E]">Sales Reports</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-bold text-green-900 mb-2">
                        Total Revenue
                      </h3>
                      <p className="text-4xl font-bold text-green-600">
                        ₹{Math.round(salesReport.total_revenue)}
                      </p>
                      <p className="text-sm text-green-700 mt-2">
                        From {salesReport.total_orders} completed orders
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-bold text-blue-900 mb-2">
                        Average Order Value
                      </h3>
                      <p className="text-4xl font-bold text-blue-600">
                        ₹
                        {Math.round(
                          salesReport.total_revenue / (salesReport.total_orders || 1)
                        )}
                      </p>
                      <p className="text-sm text-blue-700 mt-2">Per completed order</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Revenue by Baker */}
                <Card className="bg-white border-2 border-[#D35400]/10">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold text-[#4E342E] mb-4">
                      Top Performing Bakers
                    </h3>
                    <div className="space-y-3">
                      {salesReport.revenue_by_baker.map((baker, index) => (
                        <div
                          key={baker.baker_id}
                          className="flex items-center justify-between bg-[#FFF9F5] rounded-xl p-4"
                        >
                          <div className="flex items-center gap-4">
                            <span className="text-2xl font-bold text-[#D35400]">
                              #{index + 1}
                            </span>
                            <div>
                              <p className="font-bold text-[#4E342E]">
                                {baker.baker_name}
                              </p>
                              <p className="text-sm text-[#4E342E]/60">
                                {baker.orders} orders
                              </p>
                            </div>
                          </div>
                          <p className="text-xl font-bold text-green-600">
                            ₹{Math.round(baker.revenue)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Top Products */}
                <Card className="bg-white border-2 border-[#D35400]/10">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold text-[#4E342E] mb-4">
                      Top Selling Products
                    </h3>
                    <div className="space-y-3">
                      {salesReport.top_products.map((product, index) => (
                        <div
                          key={product.product_id}
                          className="flex items-center justify-between bg-[#FFF9F5] rounded-xl p-4"
                        >
                          <div className="flex items-center gap-4">
                            <span className="text-2xl font-bold text-[#D35400]">
                              #{index + 1}
                            </span>
                            <div>
                              <p className="font-bold text-[#4E342E]">
                                {product.product_name}
                              </p>
                              <p className="text-sm text-[#4E342E]/60">
                                {product.quantity_sold} units sold
                              </p>
                            </div>
                          </div>
                          <p className="text-xl font-bold text-green-600">
                            ₹{Math.round(product.revenue)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </div>

      {/* Baker Details Modal */}
      {selectedBaker && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => setSelectedBaker(null)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <Card className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <CardContent className="p-8">
                <div className="flex items-start justify-between mb-6">
                  <h3 className="text-2xl font-bold text-[#4E342E]">
                    Baker Details
                  </h3>
                  <button
                    onClick={() => setSelectedBaker(null)}
                    className="p-2 hover:bg-[#FFF9F5] rounded-lg transition-colors"
                  >
                    <XCircle className="w-6 h-6 text-[#4E342E]" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-[#4E342E]/60">Shop Name</p>
                    <p className="text-lg font-bold text-[#4E342E]">
                      {selectedBaker.shop_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#4E342E]/60">Owner Name</p>
                    <p className="text-[#4E342E] font-medium">
                      {selectedBaker.owner_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#4E342E]/60">Email</p>
                    <p className="text-[#4E342E] font-medium">
                      {selectedBaker.user_email}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#4E342E]/60">Phone</p>
                    <p className="text-[#4E342E] font-medium">
                      {selectedBaker.phone}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#4E342E]/60">Location</p>
                    <p className="text-[#4E342E] font-medium">
                      {selectedBaker.city}, {selectedBaker.state}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#4E342E]/60">Business License</p>
                    <p className="text-[#4E342E] font-medium">
                      {selectedBaker.business_license}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#4E342E]/60">Tax ID</p>
                    <p className="text-[#4E342E] font-medium">
                      {selectedBaker.tax_id}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#4E342E]/60">Description</p>
                    <p className="text-[#4E342E]">
                      {selectedBaker.shop_description}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#4E342E]/60">Status</p>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                        selectedBaker.verified
                          ? 'bg-green-100 text-green-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}
                    >
                      {selectedBaker.verified ? 'Verified' : 'Pending Verification'}
                    </span>
                  </div>
                </div>

                {!selectedBaker.verified && (
                  <div className="flex gap-3 mt-6">
                    <Button
                      onClick={() => {
                        handleVerifyBaker(selectedBaker.id);
                        setSelectedBaker(null);
                      }}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-xl"
                    >
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => {
                        handleRejectBaker(selectedBaker.id);
                        setSelectedBaker(null);
                      }}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl"
                    >
                      <XCircle className="w-5 h-5 mr-2" />
                      Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}