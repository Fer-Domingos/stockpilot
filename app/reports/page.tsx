'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { FileText, Download } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ReportsPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  const downloadReport = async (endpoint: string, filename: string) => {
    setLoading(true);
    try {
      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data.report, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading report:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!session) return null;

  const reports = [
    { name: 'Inventory Balance', description: 'Current stock levels by location', endpoint: '/api/reports/inventory', filename: 'inventory-balance.json', color: 'from-blue-500 to-cyan-600' },
    { name: 'Material Usage by Job', description: 'Materials consumed per job', endpoint: '/api/reports/usage-by-job', filename: 'usage-by-job.json', color: 'from-green-500 to-emerald-600' },
    { name: 'Purchase History', description: 'Purchases grouped by vendor', endpoint: '/api/reports/purchase-history', filename: 'purchase-history.json', color: 'from-orange-500 to-red-600' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="mt-2 text-gray-600">Generate and export inventory reports</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {reports.map((report, idx) => (
            <motion.div key={report.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: idx * 0.1 }} className="rounded-2xl bg-white p-6 shadow-md">
              <div className={`mb-4 inline-flex rounded-xl bg-gradient-to-br ${report.color} p-3`}>
                <FileText className="h-8 w-8 text-white" />
              </div>
              <h2 className="mb-2 text-xl font-bold text-gray-900">{report.name}</h2>
              <p className="mb-4 text-gray-600">{report.description}</p>
              <Button onClick={() => downloadReport(report.endpoint, report.filename)} disabled={loading} className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Download Report
              </Button>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
