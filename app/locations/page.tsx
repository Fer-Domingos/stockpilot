'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, MapPin, Briefcase, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface Location {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
}

export default function LocationsPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', type: 'JOB' });

  const userRole = (session?.user as any)?.role;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && userRole !== 'Admin') {
      router.push('/dashboard');
    }
  }, [status, userRole, router]);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await fetch('/api/locations');
        if (response.ok) {
          const data = await response.json();
          setLocations(data.locations ?? []);
        }
      } catch (error) {
        console.error('Error fetching locations:', error);
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchLocations();
    }
  }, [status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        setLocations([...locations, data.location]);
        setDialogOpen(false);
        setFormData({ name: '', type: 'JOB' });
      }
    } catch (error) {
      console.error('Error creating location:', error);
    }
  };

  const toggleLocationStatus = async (location: Location) => {
    try {
      const response = await fetch(`/api/locations/${location.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !location.isActive })
      });

      if (response.ok) {
        const data = await response.json();
        setLocations(locations.map(l => l.id === location.id ? data.location : l));
      }
    } catch (error) {
      console.error('Error updating location:', error);
    }
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

  const shopLocations = locations.filter(l => l.type === 'SHOP');
  const jobLocations = locations.filter(l => l.type === 'JOB');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Header />
      
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Locations</h1>
            <p className="mt-2 text-gray-600">Manage SHOP and JOB locations for your inventory</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" />
            Add Location
          </Button>
        </div>

        {/* SHOP Locations */}
        <div className="mb-8">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-gray-900">
            <MapPin className="h-5 w-5 text-blue-600" />
            SHOP Location
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shopLocations.map((location, index) => (
              <motion.div
                key={location.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="rounded-xl bg-white p-6 shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-blue-100 p-2">
                      <MapPin className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{location.name}</h3>
                      <p className="text-sm text-gray-500">SHOP</p>
                    </div>
                  </div>
                  <div className={`rounded-full px-3 py-1 text-xs font-medium ${
                    location.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {location.isActive ? 'Active' : 'Inactive'}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* JOB Locations */}
        <div>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-gray-900">
            <Briefcase className="h-5 w-5 text-orange-600" />
            JOB Locations
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {jobLocations.map((location, index) => (
              <motion.div
                key={location.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="group rounded-xl bg-white p-6 shadow-md transition-all hover:shadow-lg"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-orange-100 p-2">
                      <Briefcase className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{location.name}</h3>
                      <p className="text-sm text-gray-500">JOB</p>
                    </div>
                  </div>
                  <div className={`rounded-full px-3 py-1 text-xs font-medium ${
                    location.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {location.isActive ? 'Active' : 'Closed'}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={location.isActive ? 'outline' : 'default'}
                  className="w-full"
                  onClick={() => toggleLocationStatus(location)}
                >
                  {location.isActive ? (
                    <>
                      <XCircle className="mr-2 h-4 w-4" />
                      Close Job
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Reopen Job
                    </>
                  )}
                </Button>
              </motion.div>
            ))}
          </div>
          {jobLocations.length === 0 && (
            <div className="rounded-xl bg-white p-12 text-center shadow-md">
              <Briefcase className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">No job locations</h3>
              <p className="mt-2 text-gray-600">Create a new job location to get started</p>
            </div>
          )}
        </div>

        {/* Add Location Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Location</DialogTitle>
              <DialogDescription>
                Create a new location for your inventory management
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Location Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., 6-2523, SHOP"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Location Type *</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SHOP">SHOP</SelectItem>
                    <SelectItem value="JOB">JOB</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  Create Location
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
