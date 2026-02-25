'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { Package, ArrowRightLeft, ArrowDownCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function OperationsPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();

  const userRole = (session?.user as any)?.role;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && userRole === 'Viewer') {
      router.push('/dashboard');
    }
  }, [status, userRole, router]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const operations = [
    {
      name: 'Receive Materials',
      description: 'Add materials to SHOP location from vendors',
      icon: Package,
      color: 'from-green-500 to-emerald-600',
      href: '/operations/receive'
    },
    {
      name: 'Transfer Materials',
      description: 'Transfer materials from SHOP to JOB locations',
      icon: ArrowRightLeft,
      color: 'from-blue-500 to-cyan-600',
      href: '/operations/transfer'
    },
    {
      name: 'Issue Materials',
      description: 'Issue/consume materials from JOB locations',
      icon: ArrowDownCircle,
      color: 'from-orange-500 to-red-600',
      href: '/operations/issue'
    },
    {
      name: 'Inventory Adjustment',
      description: 'Adjust stock levels with audit trail',
      icon: AlertTriangle,
      color: 'from-purple-500 to-violet-600',
      href: '/operations/adjustment'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Header />
      
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Material Operations</h1>
          <p className="mt-2 text-gray-600">Select an operation to manage your inventory</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {operations.map((operation, index) => {
            const Icon = operation.icon;
            return (
              <Link key={operation.name} href={operation.href}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="group relative h-64 overflow-hidden rounded-2xl bg-white p-8 shadow-lg transition-all hover:shadow-2xl"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${operation.color} opacity-0 transition-opacity group-hover:opacity-10`} />
                  <div className="relative flex h-full flex-col items-center justify-center text-center">
                    <div className={`mb-6 rounded-2xl bg-gradient-to-br ${operation.color} p-4 shadow-lg`}>
                      <Icon className="h-12 w-12 text-white" />
                    </div>
                    <h2 className="mb-2 text-2xl font-bold text-gray-900">{operation.name}</h2>
                    <p className="text-gray-600">{operation.description}</p>
                  </div>
                  <div className="absolute bottom-4 right-4 text-gray-400 transition-transform group-hover:translate-x-1">
                    →
                  </div>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
