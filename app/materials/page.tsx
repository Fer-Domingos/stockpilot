'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Package, RefreshCw, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const CATEGORIES = ['WoodSheets', 'Hardware', 'Hinges', 'Slides', 'Other'];
const UNITS = [
  { value: 'sheets', label: 'Sheets' },
  { value: 'pcs', label: 'Pieces (pcs)' },
  { value: 'unit', label: 'Unit' },
  { value: 'tube', label: 'Tube' },
  { value: 'box', label: 'Box' }
];

interface Material {
  id: string;
  name: string;
  category: string;
  unit: string;
  minStockLevel: number;
  totalStock: number; // From MaterialTotal (single source of truth)
  inventory?: Array<{
    id: string;
    quantity: number;
    location: {
      id: string;
      name: string;
    };
  }>;
}

export default function MaterialsPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [formData, setFormData] = useState({ name: '', category: 'WoodSheets', unit: 'sheets', minStockLevel: 0 });
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [rebuildingTotals, setRebuildingTotals] = useState(false);

  const userRole = (session?.user as any)?.role;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && userRole === 'Viewer') {
      router.push('/dashboard');
    }
  }, [status, userRole, router]);

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const response = await fetch('/api/materials');
        if (response.ok) {
          const data = await response.json();
          setMaterials(data.materials ?? []);
        }
      } catch (error) {
        console.error('Error fetching materials:', error);
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchMaterials();
    }
  }, [status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingMaterial ? `/api/materials/${editingMaterial.id}` : '/api/materials';
      const method = editingMaterial ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        if (editingMaterial) {
          setMaterials(materials.map(m => m.id === editingMaterial.id ? data.material : m));
        } else {
          setMaterials([...materials, data.material]);
        }
        setDialogOpen(false);
        setEditingMaterial(null);
        setFormData({ name: '', category: 'WoodSheets', unit: 'sheets', minStockLevel: 0 });
      }
    } catch (error) {
      console.error('Error saving material:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this material?')) return;

    try {
      const response = await fetch(`/api/materials/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setMaterials(materials.filter(m => m.id !== id));
      }
    } catch (error) {
      console.error('Error deleting material:', error);
    }
  };

  const openEditDialog = (material: Material) => {
    setEditingMaterial(material);
    setFormData({
      name: material.name,
      category: material.category,
      unit: material.unit || 'sheets',
      minStockLevel: material.minStockLevel
    });
    setDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingMaterial(null);
    setFormData({ name: '', category: 'WoodSheets', unit: 'sheets', minStockLevel: 0 });
    setDialogOpen(true);
  };

  const handleRebuildTotals = async () => {
    if (!confirm('This will recalculate all material totals from inventory balances. Continue?')) return;
    
    setRebuildingTotals(true);
    try {
      const response = await fetch('/api/admin/rebuild-totals', { method: 'POST' });
      const data = await response.json();
      
      if (response.ok) {
        alert(`${data.message}`);
        // Refresh materials list
        const refreshResponse = await fetch('/api/materials');
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          setMaterials(refreshData.materials ?? []);
        }
      } else {
        alert(data.error || 'Failed to rebuild totals');
      }
    } catch (error) {
      console.error('Error rebuilding totals:', error);
      alert('An error occurred');
    } finally {
      setRebuildingTotals(false);
    }
  };

  const filteredMaterials = filterCategory === 'all'
    ? materials
    : materials.filter(m => m.category === filterCategory);

  // Get current stock from MaterialTotal (single source of truth)
  const getCurrentStock = (material: Material): number => {
    return material.totalStock ?? 0;
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Header />
      
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Materials</h1>
            <p className="mt-2 text-gray-600">Manage your inventory materials and categories</p>
          </div>
          <div className="flex gap-2">
            {userRole === 'Admin' && (
              <Button 
                onClick={handleRebuildTotals} 
                variant="outline" 
                disabled={rebuildingTotals}
                title="Recalculate totals from inventory balances"
              >
                {rebuildingTotals ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Rebuild Totals
              </Button>
            )}
            <Button onClick={openNewDialog} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Add Material
            </Button>
          </div>
        </div>

        {/* Filter */}
        <div className="mb-6">
          <Label htmlFor="filter">Filter by Category</Label>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map(cat => (
                <SelectItem key={cat} value={cat}>{cat.replace(/([A-Z])/g, ' $1').trim()}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Materials Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMaterials.map((material, index) => (
            <motion.div
              key={material.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="group rounded-xl bg-white p-6 shadow-md transition-all hover:shadow-lg"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-100 p-2">
                    <Package className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{material.name}</h3>
                    <p className="text-sm text-gray-500">{material.category.replace(/([A-Z])/g, ' $1').trim()}</p>
                  </div>
                </div>
              </div>
              <div className="mb-4 space-y-3">
                <div className="rounded-lg bg-blue-50 p-3">
                  <p className="text-sm text-gray-600">Current Stock</p>
                  <p className="text-lg font-semibold text-blue-900">{getCurrentStock(material)} {material.unit || 'sheets'}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-sm text-gray-600">Min Stock Level</p>
                  <p className="text-lg font-semibold text-gray-900">{material.minStockLevel} {material.unit || 'sheets'}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => openEditDialog(material)}
                >
                  <Edit className="mr-1 h-3 w-3" />
                  Edit
                </Button>
                {userRole === 'Admin' && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(material.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {filteredMaterials.length === 0 && (
          <div className="rounded-xl bg-white p-12 text-center shadow-md">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">No materials found</h3>
            <p className="mt-2 text-gray-600">Get started by adding your first material</p>
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingMaterial ? 'Edit Material' : 'Add New Material'}</DialogTitle>
              <DialogDescription>
                {editingMaterial ? 'Update material details' : 'Create a new material for your inventory'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Material Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., Oak Plywood 3/4 inch"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat.replace(/([A-Z])/g, ' $1').trim()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit *</Label>
                <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map(u => (
                      <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="minStock">Minimum Stock Level *</Label>
                <Input
                  id="minStock"
                  type="number"
                  min="0"
                  value={formData.minStockLevel}
                  onChange={(e) => setFormData({ ...formData, minStockLevel: parseInt(e.target.value) || 0 })}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  {editingMaterial ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
