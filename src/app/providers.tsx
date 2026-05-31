'use client';

import { useState, useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { makeQueryClient } from '@/lib/query-client';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => makeQueryClient());
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <ToastProvider>
          {!isOnline && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              background: '#EA580C', // Oranye menyala/kontras tinggi
              color: '#FFFFFF',
              textAlign: 'center',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 700,
              zIndex: 9999,
              boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.3s ease-out'
            }}>
              <span>⚠️ Sambungan internet terputus. Mode offline operasional gudang aktif.</span>
            </div>
          )}
          {children}
        </ToastProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
