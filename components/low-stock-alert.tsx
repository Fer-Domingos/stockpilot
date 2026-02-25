'use client';

import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import Link from 'next/link';

interface LowStockAlertProps {
  count: number;
}

export function LowStockAlert({ count }: LowStockAlertProps) {
  if (count === 0) return null;

  return (
    <Alert variant="destructive" className="bg-orange-50 border-orange-200">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertTitle className="text-orange-900">Low Stock Alert</AlertTitle>
      <AlertDescription className="text-orange-800">
        You have <strong>{count}</strong> item{count !== 1 ? 's' : ''} running low on stock.{' '}
        <Link href="/inventory?filter=lowStock" className="font-medium underline">
          View items
        </Link>
      </AlertDescription>
    </Alert>
  );
}
