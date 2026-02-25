'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, MinusCircle, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';

interface Material { id: string; name: string; category: string; unit: string; }
interface Location { id: string; name: string; type: string; }
interface Transaction { 
  id: string; 
  type: string; 
  materialName: string; 
  quantity: number;
  unit: string;
  date: string;
  fromLocationName?: string;
  toLocationName?: string;
}

export default function AdjustmentPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [currentStock, setCurrentStock] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    materialId: '',
    locationId: '',
    quantityDelta: '',
    adjustmentType: 'add', // 'add' or 'subtract'
    reason: '',
    originalTransactionId: ''
  });

  const userRole = (session?.user as any)?.role;

  // Get selected material's unit
  const selectedMaterial = materials.find(m => m.id === formData.materialId);
  const selectedUnit = selectedMaterial?.unit || 'units';

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    else if (status === 'authenticated' && userRole === 'Viewer') router.push('/dashboard');
  }, [status, userRole, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [matsRes, locsRes, histRes] = await Promise.all([
          fetch('/api/materials'),
          fetch('/api/locations?active=true'),
          fetch('/api/transactions/history?limit=20')
        ]);
        if (matsRes.ok) setMaterials((await matsRes.json()).materials ?? []);
        if (locsRes.ok) setLocations((await locsRes.json()).locations ?? []);
        if (histRes.ok) setRecentTransactions((await histRes.json()).transactions ?? []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    if (status === 'authenticated') fetchData();
  }, [status]);

  // Fetch current stock when material and location change
  useEffect(() => {
    const fetchCurrentStock = async () => {
      if (!formData.materialId || !formData.locationId) {
        setCurrentStock(null);
        return;
      }
      try {
        const res = await fetch(`/api/inventory?materialId=${formData.materialId}&locationId=${formData.locationId}`);
        if (res.ok) {
          const data = await res.json();
          setCurrentStock(data.inventory?.[0]?.quantity ?? 0);
        } else {
          setCurrentStock(0);
        }
      } catch {
        setCurrentStock(0);
      }
    };
    fetchCurrentStock();
  }, [formData.materialId, formData.locationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccess(false);

    const absQuantity = Math.abs(parseInt(formData.quantityDelta) || 0);
    const quantityDelta = formData.adjustmentType === 'subtract' ? -absQuantity : absQuantity;

    try {
      const response = await fetch('/api/transactions/adjustment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialId: formData.materialId,
          locationId: formData.locationId,
          quantityDelta,
          reason: formData.reason,
          originalTransactionId: formData.originalTransactionId || undefined
        })
      });

      if (response.ok) {
        setSuccess(true);
        setFormData({
          materialId: '',
          locationId: '',
          quantityDelta: '',
          adjustmentType: 'add',
          reason: '',
          originalTransactionId: ''
        });
        setCurrentStock(null);
        // Refresh transactions
        const histRes = await fetch('/api/transactions/history?limit=20');
        if (histRes.ok) setRecentTransactions((await histRes.json()).transactions ?? []);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const data = await response.json();
        alert(data?.error ?? 'Failed to create adjustment');
      }
    } catch (error) {
      console.error('Error creating adjustment:', error);
      alert('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-2">
              <AlertTriangle className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Inventory Adjustment</h1>
              <p className="mt-1 text-gray-600">Adjust stock levels with audit trail</p>
            </div>
          </div>
        </div>

        {success && (
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-green-50 p-4 text-green-800">
            <CheckCircle className="h-5 w-5" />
            <span>Adjustment recorded successfully!</span>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <form onSubmit={handleSubmit} className="rounded-xl bg-white p-6 shadow-md sm:p-8 lg:col-span-2">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="material">Material *</Label>
                <Select value={formData.materialId || undefined} onValueChange={(value) => setFormData({ ...formData, materialId: value })} required>
                  <SelectTrigger id="material"><SelectValue placeholder="Select material" /></SelectTrigger>
                  <SelectContent>
                    {materials.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name} ({m.category.replace(/([A-Z])/g, ' $1').trim()})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Select value={formData.locationId || undefined} onValueChange={(value) => setFormData({ ...formData, locationId: value })} required>
                  <SelectTrigger id="location"><SelectValue placeholder="Select location" /></SelectTrigger>
                  <SelectContent>
                    {locations.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name} ({loc.type})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {currentStock !== null && (
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-sm text-gray-600">Current Stock at this location:</p>
                  <p className="text-xl font-semibold text-gray-900">{currentStock} {selectedUnit}</p>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Adjustment Type *</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={formData.adjustmentType === 'add' ? 'default' : 'outline'}
                      className={formData.adjustmentType === 'add' ? 'bg-green-600 hover:bg-green-700' : ''}
                      onClick={() => setFormData({ ...formData, adjustmentType: 'add' })}
                    >
                      <PlusCircle className="mr-1 h-4 w-4" /> Add
                    </Button>
                    <Button
                      type="button"
                      variant={formData.adjustmentType === 'subtract' ? 'default' : 'outline'}
                      className={formData.adjustmentType === 'subtract' ? 'bg-red-600 hover:bg-red-700' : ''}
                      onClick={() => setFormData({ ...formData, adjustmentType: 'subtract' })}
                    >
                      <MinusCircle className="mr-1 h-4 w-4" /> Subtract
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity ({selectedUnit}) *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={formData.quantityDelta}
                    onChange={(e) => setFormData({ ...formData, quantityDelta: e.target.value })}
                    required
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Adjustment *</Label>
                <Textarea
                  id="reason"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  required
                  placeholder="e.g., Physical count correction, damaged goods, data entry error..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="originalTransaction">Reference Transaction (Optional)</Label>
                <Select value={formData.originalTransactionId || undefined} onValueChange={(value) => setFormData({ ...formData, originalTransactionId: value === '__none__' ? '' : value })}>
                  <SelectTrigger id="originalTransaction"><SelectValue placeholder="Select if adjusting a specific transaction" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {recentTransactions.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.type} - {t.materialName} ({t.quantity > 0 ? '+' : ''}{t.quantity} {t.unit}) - {new Date(t.date).toLocaleDateString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">Link this adjustment to a previous transaction for audit purposes</p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700" disabled={submitting}>
                  {submitting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
                  ) : (
                    <><AlertTriangle className="mr-2 h-4 w-4" />Record Adjustment</>
                  )}
                </Button>
              </div>
            </div>
          </form>

          {/* Preview panel */}
          <div className="rounded-xl bg-white p-6 shadow-md">
            <h3 className="mb-4 font-semibold text-gray-900">Adjustment Preview</h3>
            {formData.materialId && formData.locationId && formData.quantityDelta ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                  <p className="text-sm text-gray-600">New stock level will be:</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {currentStock !== null ? (
                      formData.adjustmentType === 'add'
                        ? currentStock + Math.abs(parseInt(formData.quantityDelta) || 0)
                        : currentStock - Math.abs(parseInt(formData.quantityDelta) || 0)
                    ) : '...'} {selectedUnit}
                  </p>
                  <p className="mt-2 text-sm text-gray-500">
                    {formData.adjustmentType === 'add' ? (
                      <span className="text-green-600">+{Math.abs(parseInt(formData.quantityDelta) || 0)}</span>
                    ) : (
                      <span className="text-red-600">-{Math.abs(parseInt(formData.quantityDelta) || 0)}</span>
                    )} from current {currentStock ?? 0}
                  </p>
                </div>
                {formData.adjustmentType === 'subtract' && currentStock !== null && (currentStock - Math.abs(parseInt(formData.quantityDelta) || 0)) < 0 && (
                  <div className="rounded-lg bg-red-50 p-3 text-red-700 text-sm">
                    ⚠️ Warning: This will result in negative inventory!
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Select material, location, and enter quantity to see preview</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
