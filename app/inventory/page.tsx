'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/components/header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Package } from 'lucide-react';
import { motion } from 'framer-motion';

interface InventoryItem {
  id: string;
  materialName: string;
  category: string;
  locationName: string;
  locationType: string;
  quantity: number;
  minStockLevel: number;
  isLowStock: boolean;
}

export default function InventoryPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const searchParams = useSearchParams();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const lowStock = searchParams?.get('filter') === 'lowStock';
        const url = lowStock ? '/api/inventory?lowStock=true' : '/api/inventory';
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setInventory(data.inventory ?? []);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    if (status === 'authenticated') fetchInventory();
  }, [status, searchParams]);

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!session) return null;

  const filteredInventory = inventory
    .filter(item => filterLocation === 'all' || item.locationName === filterLocation)
    .filter(item => filterCategory === 'all' || item.category === filterCategory);

  const locations = Array.from(new Set(inventory.map(item => item.locationName)));
  const categories = Array.from(new Set(inventory.map(item => item.category)));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
          <p className="mt-2 text-gray-600">View current stock levels across all locations</p>
        </div>
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Filter by Location</Label>
            <Select value={filterLocation} onValueChange={setFilterLocation}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Filter by Category</Label>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => <SelectItem key={cat} value={cat}>{cat.replace(/([A-Z])/g, ' $1').trim()}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredInventory.map((item, idx) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: idx * 0.02 }} className={`rounded-xl bg-white p-6 shadow-md ${item.isLowStock ? 'border-2 border-orange-300' : ''}`}>
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${item.isLowStock ? 'bg-orange-100' : 'bg-blue-100'}`}>
                    <Package className={`h-5 w-5 ${item.isLowStock ? 'text-orange-600' : 'text-blue-600'}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{item.materialName}</h3>
                    <p className="text-sm text-gray-500">{item.category.replace(/([A-Z])/g, ' $1').trim()}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Location:</span>
                  <span className="font-medium text-gray-900">{item.locationName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Quantity:</span>
                  <span className={`font-bold ${item.isLowStock ? 'text-orange-600' : 'text-gray-900'}`}>{item.quantity}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Min Stock:</span>
                  <span className="text-gray-500">{item.minStockLevel}</span>
                </div>
                {item.isLowStock && (
                  <div className="mt-2 rounded-md bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700">Low Stock</div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
        {filteredInventory.length === 0 && (
          <div className="rounded-xl bg-white p-12 text-center shadow-md">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">No inventory found</h3>
            <p className="mt-2 text-gray-600">Try adjusting your filters</p>
          </div>
        )}
      </main>
    </div>
  );
}
