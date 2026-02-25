'use client';

import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { useEffect, useState } from 'react';

interface DashboardCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  color: string;
  index: number;
}

export function DashboardCard({ title, value, icon: Icon, color, index }: DashboardCardProps) {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (inView) {
      let start = 0;
      const end = value ?? 0;
      const duration = 1000;
      const increment = end / (duration / 16);

      const timer = setInterval(() => {
        start += increment;
        if (start >= end) {
          setCount(end);
          clearInterval(timer);
        } else {
          setCount(Math.floor(start));
        }
      }, 16);

      return () => clearInterval(timer);
    }
  }, [inView, value]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group relative overflow-hidden rounded-xl bg-white p-6 shadow-md transition-all hover:shadow-xl"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`mt-2 text-3xl font-bold ${color}`}>{count}</p>
        </div>
        <div className={`rounded-full bg-gradient-to-br ${color.replace('text-', 'from-').replace('-600', '-100')} to-transparent p-3`}>
          <Icon className={`h-8 w-8 ${color}`} />
        </div>
      </div>
      <div className={`absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r ${color.replace('text-', 'from-')} to-transparent opacity-50`} />
    </motion.div>
  );
}
