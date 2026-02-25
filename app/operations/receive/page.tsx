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
import { Package, Upload, X, CheckCircle, Loader2 } from 'lucide-react';

interface Material {
  id: string;
  name: string;
  category: string;
  unit: string;
}

export default function ReceivePage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [formData, setFormData] = useState({
    materialId: '',
    quantity: '',
    vendor: '',
    poNumber: '',
    invoiceNumber: '',
    notes: ''
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const userRole = (session?.user as any)?.role;

  // Get selected material's unit
  const selectedMaterial = materials.find(m => m.id === formData.materialId);
  const selectedUnit = selectedMaterial?.unit || 'units';

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles([...selectedFiles, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const uploadFiles = async (): Promise<Array<{ cloud_storage_path: string; isPublic: boolean }>> => {
    const uploadedPhotos: Array<{ cloud_storage_path: string; isPublic: boolean }> = [];

    for (const file of selectedFiles) {
      try {
        // Get presigned URL
        const presignedResponse = await fetch('/api/upload/presigned', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            contentType: file.type,
            isPublic: false
          })
        });

        if (!presignedResponse.ok) {
          throw new Error('Failed to get upload URL');
        }

        const { uploadUrl, cloud_storage_path } = await presignedResponse.json();

        // Check if Content-Disposition is in signed headers
        const url = new URL(uploadUrl);
        const signedHeaders = url.searchParams.get('X-Amz-SignedHeaders');
        const needsContentDisposition = signedHeaders?.includes('content-disposition');

        // Upload file to S3
        const uploadHeaders: HeadersInit = {
          'Content-Type': file.type
        };

        if (needsContentDisposition) {
          uploadHeaders['Content-Disposition'] = 'attachment';
        }

        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          headers: uploadHeaders,
          body: file
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload file');
        }

        uploadedPhotos.push({ cloud_storage_path, isPublic: false });
      } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
      }
    }

    return uploadedPhotos;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccess(false);

    try {
      // Upload files first
      let invoicePhotos: Array<{ cloud_storage_path: string; isPublic: boolean }> = [];
      if (selectedFiles.length > 0) {
        setUploadingFiles(true);
        invoicePhotos = await uploadFiles();
        setUploadingFiles(false);
      }

      // Submit transaction
      const response = await fetch('/api/transactions/receive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialId: formData.materialId,
          quantity: parseInt(formData.quantity),
          vendor: formData.vendor || undefined,
          poNumber: formData.poNumber || undefined,
          invoiceNumber: formData.invoiceNumber || undefined,
          notes: formData.notes || undefined,
          invoicePhotos
        })
      });

      if (response.ok) {
        setSuccess(true);
        setFormData({
          materialId: '',
          quantity: '',
          vendor: '',
          poNumber: '',
          invoiceNumber: '',
          notes: ''
        });
        setSelectedFiles([]);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        alert('Failed to receive material');
      }
    } catch (error) {
      console.error('Error receiving material:', error);
      alert('An error occurred');
    } finally {
      setSubmitting(false);
      setUploadingFiles(false);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Header />
      
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2">
              <Package className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Receive Materials</h1>
              <p className="mt-1 text-gray-600">Add materials to SHOP inventory from vendors</p>
            </div>
          </div>
        </div>

        {success && (
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-green-50 p-4 text-green-800">
            <CheckCircle className="h-5 w-5" />
            <span>Material received successfully!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="rounded-xl bg-white p-6 shadow-md sm:p-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="material">Material *</Label>
              <Select value={formData.materialId} onValueChange={(value) => setFormData({ ...formData, materialId: value })} required>
                <SelectTrigger id="material">
                  <SelectValue placeholder="Select material" />
                </SelectTrigger>
                <SelectContent>
                  {materials.map(material => (
                    <SelectItem key={material.id} value={material.id}>
                      {material.name} ({material.category.replace(/([A-Z])/g, ' $1').trim()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity ({selectedUnit}) *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  required
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vendor">Vendor</Label>
                <Input
                  id="vendor"
                  value={formData.vendor}
                  onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                  placeholder="Vendor name"
                />
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="poNumber">PO Number</Label>
                <Input
                  id="poNumber"
                  value={formData.poNumber}
                  onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })}
                  placeholder="PO-12345"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoiceNumber">Invoice Number</Label>
                <Input
                  id="invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                  placeholder="INV-12345"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes or comments"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Invoice Photos</Label>
              <div className="rounded-lg border-2 border-dashed border-gray-300 p-4">
                <input
                  type="file"
                  id="file-upload"
                  accept="image/*,.pdf"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label
                  htmlFor="file-upload"
                  className="flex cursor-pointer flex-col items-center gap-2 text-gray-600 hover:text-gray-900"
                >
                  <Upload className="h-8 w-8" />
                  <span className="text-sm font-medium">Click to upload invoice photos</span>
                  <span className="text-xs text-gray-500">PDF, PNG, JPG up to 10MB</span>
                </label>
              </div>

              {selectedFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                      <span className="text-sm text-gray-700">{file.name}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={submitting || uploadingFiles}>
                {uploadingFiles ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Receiving...
                  </>
                ) : (
                  <>
                    <Package className="mr-2 h-4 w-4" />
                    Receive Material
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
