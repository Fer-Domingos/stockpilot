'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { DashboardCard } from '@/components/dashboard-card';
import { LowStockAlert } from '@/components/low-stock-alert';
import { Package, AlertTriangle, Briefcase, MapPin, TrendingUp, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

const COLORS = ['#60B5FF', '#FF9149', '#FF9898', '#FF90BB', '#80D8C3'];

interface DashboardData {
  stats: {
    totalMaterials: number;
    lowStockItems: number;
    activeJobs: number;
    totalLocations: number;
  };
  inventoryByCategory: Record<string, number>;
  inventoryByLocation: Array<{ name: string; type: string; totalItems: number }>;
  recentTransactions: Array<any>;
}

export default function DashboardPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartsRef, chartsInView] = useInView({ triggerOnce: true, threshold: 0.1 });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/dashboard/stats');
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchData();
    }
  }, [status]);

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const categoryData = data?.inventoryByCategory
    ? Object.entries(data.inventoryByCategory).map(([name, value]) => ({
        name: name.replace(/([A-Z])/g, ' $1').trim(),
        value
      }))
    : [];

  const locationData = data?.inventoryByLocation ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Header />
      
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {(session?.user as any)?.name ?? session?.user?.email}</h1>
          <p className="mt-2 text-gray-600">Manage your cabinet shop inventory efficiently</p>
        </div>

        {/* Low Stock Alert */}
        {data?.stats?.lowStockItems ? (
          <div className="mb-6">
            <LowStockAlert count={data.stats.lowStockItems} />
          </div>
        ) : null}

        {/* Stats Cards */}
        <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardCard
            title="Total Materials"
            value={data?.stats?.totalMaterials ?? 0}
            icon={Package}
            color="text-blue-600"
            index={0}
          />
          <DashboardCard
            title="Low Stock Items"
            value={data?.stats?.lowStockItems ?? 0}
            icon={AlertTriangle}
            color="text-orange-600"
            index={1}
          />
          <DashboardCard
            title="Active Jobs"
            value={data?.stats?.activeJobs ?? 0}
            icon={Briefcase}
            color="text-green-600"
            index={2}
          />
          <DashboardCard
            title="Total Locations"
            value={data?.stats?.totalLocations ?? 0}
            icon={MapPin}
            color="text-purple-600"
            index={3}
          />
        </div>

        {/* Charts Section */}
        <div ref={chartsRef} className="mb-8 grid gap-6 lg:grid-cols-2">
          {/* Inventory by Category */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={chartsInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="rounded-xl bg-white p-6 shadow-md"
          >
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Inventory by Category</h2>
            </div>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-gray-500">
                No inventory data available
              </div>
            )}
          </motion.div>

          {/* Inventory by Location */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={chartsInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="rounded-xl bg-white p-6 shadow-md"
          >
            <div className="mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Inventory by Location</h2>
            </div>
            {locationData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={locationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    label={{ value: 'Location', position: 'insideBottom', offset: -15, style: { textAnchor: 'middle', fontSize: 11 } }}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    label={{ value: 'Total Items', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 11 } }}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 11 }}
                    cursor={{ fill: 'rgba(96, 181, 255, 0.1)' }}
                  />
                  <Bar dataKey="totalItems" fill="#60B5FF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-gray-500">
                No location data available
              </div>
            )}
          </motion.div>
        </div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="rounded-xl bg-white p-6 shadow-md"
        >
          <div className="mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          </div>
          {data?.recentTransactions && data.recentTransactions.length > 0 ? (
            <div className="space-y-3">
              {data.recentTransactions.map((transaction, index) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 p-4 transition-colors hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`rounded-full p-2 ${
                      transaction.type === 'RECEIVE' ? 'bg-green-100' :
                      transaction.type === 'TRANSFER' ? 'bg-blue-100' : 'bg-orange-100'
                    }`}>
                      <Package className={`h-4 w-4 ${
                        transaction.type === 'RECEIVE' ? 'text-green-600' :
                        transaction.type === 'TRANSFER' ? 'text-blue-600' : 'text-orange-600'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {transaction.type} - {transaction.materialName}
                      </p>
                      <p className="text-sm text-gray-500">
                        {transaction.quantity} units • {transaction.userName}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {transaction.toLocationName ?? transaction.fromLocationName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(transaction.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-gray-500">
              No recent activity
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
