'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Package, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Transaction {
  id: string;
  type: string;
  materialName: string;
  category: string;
  quantity: number;
  unit: string;
  fromLocationName?: string;
  toLocationName?: string;
  userName: string;
  date: string;
  vendor?: string;
  adjustmentReason?: string;
  originalTransactionId?: string;
  originalTransaction?: {
    id: string;
    type: string;
    quantity: number;
    date: string;
  };
  invoicePhotos: any[];
}

export default function HistoryPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch('/api/transactions/history');
        if (response.ok) {
          const data = await response.json();
          setTransactions(data.transactions ?? []);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    if (status === 'authenticated') fetchHistory();
  }, [status]);

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!session) return null;

  const filteredTransactions = filterType === 'all' ? transactions : transactions.filter(t => t.type === filterType);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Transaction History</h1>
          <p className="mt-2 text-gray-600">View all material movements and operations</p>
        </div>
        <div className="mb-6">
          <Label>Filter by Type</Label>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="RECEIVE">Receive</SelectItem>
              <SelectItem value="TRANSFER">Transfer</SelectItem>
              <SelectItem value="ISSUE">Issue</SelectItem>
              <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-4">
          {filteredTransactions.map((t) => {
            const getTypeStyles = () => {
              switch (t.type) {
                case 'RECEIVE': return { bg: 'bg-green-100', text: 'text-green-600', badge: 'bg-green-100 text-green-700' };
                case 'TRANSFER': return { bg: 'bg-blue-100', text: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' };
                case 'ISSUE': return { bg: 'bg-orange-100', text: 'text-orange-600', badge: 'bg-orange-100 text-orange-700' };
                case 'ADJUSTMENT': return { bg: 'bg-purple-100', text: 'text-purple-600', badge: 'bg-purple-100 text-purple-700' };
                default: return { bg: 'bg-gray-100', text: 'text-gray-600', badge: 'bg-gray-100 text-gray-700' };
              }
            };
            const styles = getTypeStyles();
            const displayQuantity = t.type === 'ADJUSTMENT' ? (t.quantity > 0 ? `+${t.quantity}` : `${t.quantity}`) : t.quantity;

            return (
              <div key={t.id} className="rounded-xl bg-white p-6 shadow-md">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-full p-2 ${styles.bg}`}>
                      <Package className={`h-5 w-5 ${styles.text}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${styles.badge}`}>{t.type}</span>
                        <h3 className="font-semibold text-gray-900">{t.materialName}</h3>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        <span className={t.type === 'ADJUSTMENT' ? (t.quantity > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium') : ''}>
                          {displayQuantity} {t.unit || 'units'}
                        </span>
                        {' • '}{t.category.replace(/([A-Z])/g, ' $1').trim()}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        {t.type === 'RECEIVE' && `To ${t.toLocationName}`}
                        {t.type === 'TRANSFER' && `${t.fromLocationName} → ${t.toLocationName}`}
                        {t.type === 'ISSUE' && `From ${t.fromLocationName}`}
                        {t.type === 'ADJUSTMENT' && (t.quantity > 0 ? `Added to ${t.toLocationName}` : `Removed from ${t.fromLocationName}`)}
                      </p>
                      {t.type === 'ADJUSTMENT' && t.adjustmentReason && (
                        <p className="mt-2 text-sm text-purple-700 bg-purple-50 rounded px-2 py-1 inline-block">
                          Reason: {t.adjustmentReason}
                        </p>
                      )}
                      {t.type === 'ADJUSTMENT' && t.originalTransaction && (
                        <p className="mt-1 text-xs text-gray-500">
                          Ref: {t.originalTransaction.type} of {t.originalTransaction.quantity} on {new Date(t.originalTransaction.date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">{t.userName}</p>
                    <p className="text-sm text-gray-500">{new Date(t.date).toLocaleString()}</p>
                    {t.vendor && <p className="mt-1 text-sm text-gray-600">Vendor: {t.vendor}</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {filteredTransactions.length === 0 && (
          <div className="rounded-xl bg-white p-12 text-center shadow-md">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">No transactions found</h3>
            <p className="mt-2 text-gray-600">Start managing your inventory to see transaction history</p>
          </div>
        )}
      </main>
    </div>
  );
}
