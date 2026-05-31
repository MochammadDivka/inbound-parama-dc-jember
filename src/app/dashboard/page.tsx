'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, FileText, AlertCircle, Search, ChevronRight } from 'lucide-react';
import { UserLayout } from '@/components/layout/UserLayout';
import { IssueStatusBadge, SelisihDisplay } from '@/components/ui/Badge';
import { Issue, IssueStatus } from '@/types';
import { formatRelativeTime } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { useSupabaseRealtime } from '@/lib/realtime';

const FILTER_TABS: { label: string; value: IssueStatus | 'ALL' }[] = [
  { label: 'Semua', value: 'ALL' },
  { label: 'Open', value: 'OPEN' },
  { label: 'Selesai', value: 'SOLVED' },
  { label: 'Batal', value: 'CANCELLED' },
];

export default function UserDashboardPage() {
  const { data: session } = useSession();
  const [filter, setFilter] = useState<IssueStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showMineOnly, setShowMineOnly] = useState(false);

  // Debounced search logic (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Query 1: Dashboard Summary (Counts)
  const { data: summaryData } = useQuery({
    queryKey: ['issues-summary', { mine: showMineOnly }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (showMineOnly) params.set('mine', 'true');
      const res = await fetch(`/api/issues/summary?${params}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || 'Gagal mengambil ringkasan');
      return data.data as { open: number; solved: number };
    },
    staleTime: 1000 * 30, // 30 detik
  });

  // Query 2: Issues List
  const { data: issuesData, isLoading } = useQuery({
    queryKey: ['issues', { mine: showMineOnly, filter, search: debouncedSearch }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (showMineOnly) params.set('mine', 'true');
      if (filter !== 'ALL') params.set('status', filter);
      if (debouncedSearch) params.set('search', debouncedSearch);
      
      const res = await fetch(`/api/issues?${params}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || 'Gagal mengambil data issue');
      return data.data as Issue[];
    },
    staleTime: 1000 * 30, // 30 detik
  });

  // Hubungkan ke Supabase Realtime untuk sinkronisasi otomatis
  // Daftarkan key query yang harus di-invalidate saat ada perubahan database
  const realtimeKeys = useMemo(() => [
    ['issues'],
    ['issues-summary']
  ], []);
  useSupabaseRealtime('issues', realtimeKeys);

  const summary = summaryData || { open: 0, solved: 0 };
  const issues = issuesData || [];

  return (
    <UserLayout>
      {/* Summary mini */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div style={{
          background: 'white', border: '1px solid var(--color-border)',
          borderRadius: 12, padding: '14px 16px',
          borderLeft: '3px solid var(--color-open)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Open
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-open)', marginTop: 2 }}>
            {summary.open}
          </div>
        </div>
        <div style={{
          background: 'white', border: '1px solid var(--color-border)',
          borderRadius: 12, padding: '14px 16px',
          borderLeft: '3px solid var(--color-solved)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Selesai
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-solved)', marginTop: 2 }}>
            {summary.solved}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        <Link href="/issues/new" className="btn btn-primary btn-lg" style={{ textDecoration: 'none' }}>
          <Plus size={20} />
          BUAT ISSUE BARU
        </Link>
        <Link href="/cz/new" className="btn btn-secondary btn-lg" style={{ textDecoration: 'none' }}>
          <AlertCircle size={20} />
          BUAT CZ BARU
        </Link>
      </div>

      {/* Issue List Section */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>
              {showMineOnly ? 'Issue Saya' : 'Semua Issue'}
            </h2>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{issues.length} item ditemukan</span>
          </div>
          <div style={{
            display: 'flex', background: '#F3F4F6', padding: 2, borderRadius: 8, border: '1px solid var(--color-border)'
          }}>
            <button
              type="button"
              style={{
                border: 'none', background: !showMineOnly ? 'white' : 'transparent',
                fontSize: 12, fontWeight: !showMineOnly ? 700 : 500,
                color: !showMineOnly ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                boxShadow: !showMineOnly ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.15s ease',
              }}
              onClick={() => setShowMineOnly(false)}
            >
              Semua
            </button>
            <button
              type="button"
              style={{
                border: 'none', background: showMineOnly ? 'white' : 'transparent',
                fontSize: 12, fontWeight: showMineOnly ? 700 : 500,
                color: showMineOnly ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                boxShadow: showMineOnly ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.15s ease',
              }}
              onClick={() => setShowMineOnly(true)}
            >
              Saya
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="search-bar" style={{ marginBottom: 12 }}>
          <Search size={17} className="search-icon" />
          <input
            className="input-field"
            type="search"
            placeholder="Cari SKU atau nama barang..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 42 }}
          />
        </div>

        {/* Filter tabs */}
        <div className="tab-pills" style={{ marginBottom: 16, overflowX: 'auto' }}>
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              className={`tab-pill ${filter === tab.value ? 'active' : ''}`}
              onClick={() => setFilter(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Issue Cards */}
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: 110 }} />
            ))}
          </div>
        ) : issues.length === 0 ? (
          <div className="empty-state">
            <FileText size={48} color="var(--color-text-muted)" />
            <p style={{ color: 'var(--color-text-muted)', fontSize: 15 }}>
              {search ? 'Tidak ada issue yang cocok' : 'Belum ada issue'}
            </p>
            <Link href="/issues/new" className="btn btn-primary btn-sm" style={{ textDecoration: 'none', marginTop: 4 }}>
              <Plus size={15} />
              Buat Issue
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {issues.map((issue) => (
              <IssueCard key={issue.issue_id} issue={issue} />
            ))}
          </div>
        )}
      </div>
    </UserLayout>
  );
}

function IssueCard({ issue }: { issue: Issue }) {
  return (
    <Link href={`/issues/${issue.issue_id}`} className="issue-card" style={{ textDecoration: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span className="issue-id">{issue.issue_id}</span>
        <IssueStatusBadge status={issue.status} />
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text)', marginBottom: 2 }}>
          {issue.nama_barang}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: 13, color: 'var(--color-text-secondary)' }}>
          <span>{issue.sku}{issue.batch ? ` · ${issue.batch}` : ''}</span>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: 11, color: 'var(--color-text-muted)', marginTop: -2 }}>
            <span style={{ fontWeight: 500 }}>👤 {issue.created_by_name ?? issue.created_by}</span>
            {issue.updated_by && issue.updated_by !== issue.created_by && (
              <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginTop: 1 }}>
                (by {issue.updated_by_name || issue.updated_by})
              </span>
            )}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <SelisihDisplay value={Number(issue.remaining_selisih_pcs ?? issue.selisih_pcs)} />
          {(issue.merge_count ?? 0) > 0 && (
            <span style={{ fontSize: 10, background: '#EFF6FF', color: '#2563EB', padding: '1px 5px', borderRadius: 4, fontWeight: 600 }}>×{issue.merge_count}</span>
          )}
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{issue.kategori_issue}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-text-muted)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: 11 }}>
            <span>{formatRelativeTime(issue.created_at)}</span>
            {issue.updated_at && issue.updated_at !== issue.created_at && (
              <span style={{ fontSize: 10, color: 'var(--color-primary)', fontWeight: 500, marginTop: 1 }}>
                (merge/update {formatRelativeTime(issue.updated_at)})
              </span>
            )}
          </div>
          <ChevronRight size={14} />
        </div>
      </div>
    </Link>
  );
}
