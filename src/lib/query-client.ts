import { QueryClient } from '@tanstack/react-query';

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 30, // 30 detik stale time default
        refetchOnWindowFocus: false, // menghindari refetch berlebihan saat ganti tab
        retry: 1, // retry sekali saja jika gagal
      },
    },
  });
}
