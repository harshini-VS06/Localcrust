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
  const [error, setError] = useState<string | null>(null);
  const [selectedBaker, setSelectedBaker] = useState<Baker | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadDashboardData();
  }, [activeView]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Loading data for view:', activeView);
      console.log('Auth token:', localStorage.getItem('auth_token'));
      
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
    } catch (error: any) {
      console.error('Failed to load data:', error);
      setError(error.message || 'Failed to load data. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    console.log('Calling /admin/stats...');
    const data = await apiCall<AdminStats>('/admin/stats', {
      headers: getAuthHeaders(),
    });
    console.log('Stats loaded:', data);
    setStats(data);
  };

  const loadPendingBakers = async () => {
    console.log('Calling /admin/bakers/pending...');
    const data = await apiCall<{ bakers: Baker[] }>('/admin/bakers/pending', {
      headers: getAuthHeaders(),
    });
    console.log('Pending bakers loaded:', data);
    setPendingBakers(data.bakers);
  };

  const loadAllBakers = async () => {
    console.log('Calling /admin/bakers...');
    const data = await apiCall<{ bakers: Baker[] }>('/admin/bakers', {
      headers: getAuthHeaders(),
    });
    console.log('All bakers loaded:', data);
    setAllBakers(data.bakers);
  };

  const loadOrders = async () => {
    console.log('Calling /admin/orders...');
    const data = await apiCall<{ orders: Order[] }>('/admin/orders', {
      headers: getAuthHeaders(),
    });
    console.log('Orders loaded:', data);
    setOrders(data.orders);
  };

  const loadReviews = async () => {
    console.log('Calling /admin/reviews...');
    const data = await apiCall<{ reviews: Review[] }>('/admin/reviews', {
      headers: getAuthHeaders(),
    });
    console.log('Reviews loaded:', data);
    setReviews(data.reviews);
  };

  const loadSalesReport = async () => {
    console.log('Calling /admin/reports/sales...');
    const data = await apiCall<SalesReport>('/admin/reports/sales', {
      headers: getAuthHeaders(),
    });
    console.log('Sales report loaded:', data);
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
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
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
        {error && (
          <div className="mb-6 p-6 bg-red-50 border-2 border-red-200 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-bold text-red-900 mb-1">Error Loading Data</h3>
                <p className="text-red-700">{error}</p>
                <p className="text-sm text-red-600 mt-2">
                  Please check the browser console for more details. Make sure your backend is running and you're properly logged in.
                </p>
                <Button
                  onClick={() => loadDashboardData()}
                  className="mt-3 bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2"
                >
                  Retry
                </Button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#D35400] border-t-transparent mx-auto mb-4"></div>
              <p className="text-[#4E342E]/60">Loading {activeView}...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Dashboard View */}
            {activeView === 'dashboard' && (
              <div className="space-y-6">
                {!stats ? (
                  <div className="text-center py-20">
                    <AlertTriangle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-[#4E342E] mb-2">No Data Available</h3>
                    <p className="text-[#4E342E]/60 mb-4">
                      Could not load dashboard statistics. Please ensure your backend is running.
                    </p>
                    <Button onClick={() => loadDashboardData()} className="bg-[#D35400] hover:bg-[#C34000] text-white rounded-xl px-6 py-3">
                      Retry Loading Data
                    </Button>
                  </div>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            )}

            {/* Other views - truncated for space but include similar error handling */}
          </>
        )}
      </div>
    </div>
  );
}
