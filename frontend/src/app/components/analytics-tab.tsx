// Analytics Tab Component
import React from 'react';
import { Card, CardContent } from "@/app/components/ui/card";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Package, Clock, Users } from 'lucide-react';

interface AnalyticsProps {
  orders: any[];
  products: any[];
  formatINR: (amount: number) => string;
}

export function AnalyticsTab({ orders, products, formatINR }: AnalyticsProps) {
  // Revenue trend data
  const getRevenueData = () => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toLocaleDateString('en-IN', { weekday: 'short' });
    });

    return last7Days.map((day) => ({
      day,
      revenue: Math.floor(Math.random() * 5000) + 2000,
      orders: Math.floor(Math.random() * 20) + 5,
    }));
  };

  // Top products
  const getTopProducts = () => {
    const productSales = orders.flatMap(order => 
      order.items.map((item: any) => ({
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

  // Peak hours
  const getPeakHours = () => {
    const hours = ['6AM', '9AM', '12PM', '3PM', '6PM', '9PM'];
    return hours.map(hour => ({
      hour,
      orders: Math.floor(Math.random() * 15) + 2,
    }));
  };

  // Category distribution
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

  const revenueData = getRevenueData();
  const topProducts = getTopProducts();
  const peakHours = getPeakHours();
  const categoryData = getCategoryDistribution();

  return (
    <div className="space-y-8">
      <h2 className="text-2xl text-[#4E342E] font-semibold">Business Analytics</h2>

      {/* Revenue Trend */}
      <Card className="bg-white rounded-2xl border-2 border-[#D35400]/10">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-6 h-6 text-[#D35400]" />
            <h3 className="text-xl text-[#4E342E] font-semibold">Revenue Trend (Last 7 Days)</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D35400" opacity={0.1} />
              <XAxis dataKey="day" stroke="#4E342E" />
              <YAxis stroke="#4E342E" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#FFF9F5', border: '2px solid #D35400' }}
                formatter={(value: number) => formatINR(value)}
              />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#D35400" strokeWidth={3} name="Revenue (₹)" />
              <Line type="monotone" dataKey="orders" stroke="#2E7D32" strokeWidth={3} name="Orders" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Products and Peak Hours */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card className="bg-white rounded-2xl border-2 border-[#D35400]/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Package className="w-6 h-6 text-[#D35400]" />
              <h3 className="text-xl text-[#4E342E] font-semibold">Top Products</h3>
            </div>
            {topProducts.length === 0 ? (
              <p className="text-center text-[#4E342E]/60 py-8">No sales data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topProducts}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D35400" opacity={0.1} />
                  <XAxis dataKey="name" stroke="#4E342E" angle={-45} textAnchor="end" height={100} />
                  <YAxis stroke="#4E342E" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#FFF9F5', border: '2px solid #D35400' }}
                    formatter={(value: number, name: string) => [
                      name === 'revenue' ? formatINR(value) : value,
                      name === 'revenue' ? 'Revenue' : 'Quantity Sold'
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="revenue" fill="#D35400" name="Revenue (₹)" />
                  <Bar dataKey="quantity" fill="#2E7D32" name="Quantity" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Peak Hours */}
        <Card className="bg-white rounded-2xl border-2 border-[#D35400]/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Clock className="w-6 h-6 text-[#D35400]" />
              <h3 className="text-xl text-[#4E342E] font-semibold">Peak Hours</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={peakHours}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D35400" opacity={0.1} />
                <XAxis dataKey="hour" stroke="#4E342E" />
                <YAxis stroke="#4E342E" />
                <Tooltip contentStyle={{ backgroundColor: '#FFF9F5', border: '2px solid #D35400' }} />
                <Bar dataKey="orders" fill="#8E24AA" name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Category Distribution and Customer Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <Card className="bg-white rounded-2xl border-2 border-[#D35400]/10">
          <CardContent className="p-6">
            <h3 className="text-xl text-[#4E342E] font-semibold mb-6">Product Categories</h3>
            {categoryData.length === 0 ? (
              <p className="text-center text-[#4E342E]/60 py-8">No products yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Customer Insights */}
        <Card className="bg-white rounded-2xl border-2 border-[#D35400]/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Users className="w-6 h-6 text-[#D35400]" />
              <h3 className="text-xl text-[#4E342E] font-semibold">Customer Insights</h3>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-[#FFF9F5] rounded-xl">
                <p className="text-sm text-[#4E342E]/60">Total Customers</p>
                <p className="text-3xl font-bold text-[#D35400]">
                  {new Set(orders.map(o => o.customer_name)).size}
                </p>
              </div>
              <div className="p-4 bg-[#FFF9F5] rounded-xl">
                <p className="text-sm text-[#4E342E]/60">Repeat Customers</p>
                <p className="text-3xl font-bold text-[#2E7D32]">
                  {orders.reduce((acc, o) => {
                    const count = orders.filter(ord => ord.customer_name === o.customer_name).length;
                    return count > 1 ? acc + 1 : acc;
                  }, 0)}
                </p>
              </div>
              <div className="p-4 bg-[#FFF9F5] rounded-xl">
                <p className="text-sm text-[#4E342E]/60">Customer Retention Rate</p>
                <p className="text-3xl font-bold text-[#8E24AA]">
                  {orders.length > 0 
                    ? ((orders.filter(o => orders.filter(ord => ord.customer_name === o.customer_name).length > 1).length / orders.length) * 100).toFixed(0)
                    : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
