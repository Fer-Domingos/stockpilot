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
import { ArrowDownCircle, CheckCircle, Loader2 } from 'lucide-react';

interface Material { id: string; name: string; category: string; unit: string; }
interface Location { id: string; name: string; type: string; }

export default function IssuePage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({ materialId: '', quantity: '', fromLocationId: '', notes: '' });

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
        const [matsRes, locsRes] = await Promise.all([
          fetch('/api/materials'),
          fetch('/api/locations?type=JOB&active=true')
        ]);
        if (matsRes.ok) setMaterials((await matsRes.json()).materials ?? []);
        if (locsRes.ok) setLocations((await locsRes.json()).locations ?? []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    if (status === 'authenticated') fetchData();
  }, [status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccess(false);
    try {
      const response = await fetch('/api/transactions/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialId: formData.materialId,
          quantity: parseInt(formData.quantity),
          fromLocationId: formData.fromLocationId,
          notes: formData.notes || undefined
        })
      });
      if (response.ok) {
        setSuccess(true);
        setFormData({ materialId: '', quantity: '', fromLocationId: '', notes: '' });
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const data = await response.json();
        alert(data?.error ?? 'Failed to issue material');
      }
    } catch (error) {
      console.error('Error issuering material:', error);
      alert('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-orange-50">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg bg-orange-100 p-2">
              <ArrowDownCircle className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Issue Materials</h1>
              <p className="mt-1 text-gray-600">Issue materials from SHOP to JOB locations</p>
            </div>
          </div>
        </div>
        {success && (
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-green-50 p-4 text-green-800">
            <CheckCircle className="h-5 w-5" />
            <span>Material issuered successfully!</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="rounded-xl bg-white p-6 shadow-md sm:p-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="material">Material *</Label>
              <Select value={formData.materialId} onValueChange={(value) => setFormData({ ...formData, materialId: value })} required>
                <SelectTrigger id="material"><SelectValue placeholder="Select material" /></SelectTrigger>
                <SelectContent>
                  {materials.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name} ({m.category.replace(/([A-Z])/g, ' $1').trim()})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity ({selectedUnit}) *</Label>
                <Input id="quantity" type="number" min="1" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} required placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">From JOB Location *</Label>
                <Select value={formData.fromLocationId} onValueChange={(value) => setFormData({ ...formData, fromLocationId: value })} required>
                  <SelectTrigger id="location"><SelectValue placeholder="Select job" /></SelectTrigger>
                  <SelectContent>
                    {locations.map(loc => <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Additional notes" rows={3} />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" className="bg-orange-600 hover:bg-orange-700" disabled={submitting}>
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Issuering...</> : <><ArrowDownCircle className="mr-2 h-4 w-4" />Issue Material</>}
              </Button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
