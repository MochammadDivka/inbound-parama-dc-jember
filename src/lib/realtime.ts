import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabaseBrowser } from './supabase-browser';

/**
 * Hook untuk melakukan subscribe ke realtime updates dari Supabase dan
 * meng-invalidate cache TanStack Query yang relevan.
 * 
 * @param table Nama tabel Supabase yang di-subscribe
 * @param queryKeysToInvalidate List query keys TanStack Query yang harus di-refetch ketika ada perubahan
 */
export function useSupabaseRealtime(
  table: 'issues' | 'cz_records' | 'activity_logs',
  queryKeysToInvalidate: Array<any[]>
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!supabaseBrowser) return;

    // Buat channel subscription
    const channel = supabaseBrowser
      .channel(`public-${table}-changes`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: table,
        },
        (payload) => {
          console.log(`[Supabase Realtime] Perubahan terdeteksi pada ${table}:`, payload);
          // Invalidate semua query keys yang didaftarkan
          for (const key of queryKeysToInvalidate) {
            queryClient.invalidateQueries({ queryKey: key });
          }
        }
      )
      .subscribe((status) => {
        console.log(`[Supabase Realtime] Status subscription ${table}:`, status);
      });

    // Cleanup subscription
    return () => {
      if (supabaseBrowser) {
        supabaseBrowser.removeChannel(channel);
      }
    };
  }, [table, queryKeysToInvalidate, queryClient]);
}
