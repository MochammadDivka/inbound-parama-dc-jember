'use client';

import { useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { IssueStatusBadge, SelisihDisplay } from '@/components/ui/Badge';
import { DashboardSummary, Issue, ActivityLog } from '@/types';
import { formatRelativeTime, formatDateShort } from '@/lib/utils';
import Link from 'next/link';
import { FileText, ExternalLink, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useSupabaseRealtime } from '@/lib/realtime';

export default function AdminDashboardPage() {
  // Query 1: Admin Dashboard Summary and Recent Activities
  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard');
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || 'Gagal mengambil data dashboard');
      return data.data as { summary: DashboardSummary; recent_activity: ActivityLog[] };
    },
    staleTime: 1000 * 30, // 30 detik
  });

  // Query 2: Recent 5 Issues
  const { data: recentIssuesData, isLoading: isIssuesLoading } = useQuery({
    queryKey: ['issues', { limit: 5 }],
    queryFn: async () => {
      const res = await fetch('/api/issues?limit=5');
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || 'Gagal mengambil data issue terbaru');
      return data.data as Issue[];
    },
    staleTime: 1000 * 30, // 30 detik
  });

  // Hubungkan ke Supabase Realtime untuk automatic refetching saat ada log aktivitas atau issue baru
  const realtimeKeys = useMemo(() => [
    ['admin-dashboard'],
    ['issues', { limit: 5 }]
  ], []);

  useSupabaseRealtime('activity_logs', realtimeKeys);
  useSupabaseRealtime('issues', realtimeKeys);

  const loading = isDashboardLoading || isIssuesLoading;
  const summary = dashboardData?.summary || null;
  const recentActivity = dashboardData?.recent_activity || [];
  const recentIssues = recentIssuesData || [];

  const actionIcons: Record<string, string> = {
    issue_created: '🆕',
    issue_edited: '✏️',
    issue_solved: '✅',
    issue_cancelled: '❌',
    cz_created: '📋',
    cz_solved: '✅',
    user_created: '👤',
    pin_reset: '🔑',
    login_success: '🟢',
    login_failed: '🔴',
  };

  const actionLabels: Record<string, string> = {
    issue_created: 'membuat',
    issue_edited: 'mengedit',
    issue_solved: 'menyelesaikan',
    issue_cancelled: 'membatalkan',
    cz_created: 'membuat CZ',
    cz_solved: 'menyelesaikan CZ',
    user_created: 'menambah user',
    pin_reset: 'mereset PIN',
  };

  return (
    <AdminLayout>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--color-text)' }}>Dashboard</h1>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginTop: 2 }}>
            Ringkasan aktivitas inbound hari ini
          </p>
        </div>
        <Link href="/admin/issues" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
          <FileText size={15} />
          Lihat Semua Issue
        </Link>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        {loading && !summary ? (
          [1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton" style={{ height: 100 }} />
          ))
        ) : (
          <>
            <SummaryCard
              label="OPEN"
              value={summary?.open ?? 0}
              color="var(--color-open)"
              bg="var(--color-open-bg)"
              icon="🟡"
              href="/admin/issues?status=OPEN"
            />
            <SummaryCard
              label="WAITING"
              value={summary?.waiting_approval ?? 0}
              color="#1D4ED8"
              bg="#EFF6FF"
              icon="🔵"
              href="/admin/issues?status=WAITING_APPROVAL"
            />
            <SummaryCard
              label="SOLVED"
              value={summary?.solved ?? 0}
              color="var(--color-solved)"
              bg="var(--color-solved-bg)"
              icon="🟢"
              href="/admin/issues?status=SOLVED"
            />
            <SummaryCard
              label="CANCELLED"
              value={summary?.cancelled ?? 0}
              color="var(--color-cancelled)"
              bg="var(--color-cancelled-bg)"
              icon="🔴"
              href="/admin/issues?status=CANCELLED"
            />
            <SummaryCard
              label="HARI INI"
              value={summary?.today ?? 0}
              color="var(--color-primary)"
              bg="var(--color-primary-light)"
              icon="📅"
              href="/admin/issues"
            />
          </>
        )}
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>
        {/* Left: Recent Issues Table */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700 }}>Issue Terbaru</h2>
            <Link href="/admin/issues" style={{ fontSize: 13, color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              Lihat semua <ExternalLink size={13} />
            </Link>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>HU</th>
                  <th>Nama Barang</th>
                  <th>Selisih</th>
                  <th>Status</th>
                  <th>Tanggal</th>
                  <th>Dibuat</th>
                </tr>
              </thead>
              <tbody>
                {loading && recentIssues.length === 0 ? (
                  Array(5).fill(null).map((_, i) => (
                    <tr key={i}>
                      {Array(6).fill(null).map((_, j) => (
                        <td key={j}><div className="skeleton" style={{ height: 16 }} /></td>
                      ))}
                    </tr>
                  ))
                ) : recentIssues.map((issue) => (
                  <tr key={issue.issue_id} style={{ cursor: 'pointer' }}>
                    <td>
                      <Link href={`/admin/issues/${issue.issue_id}`} style={{ textDecoration: 'none', color: 'var(--color-primary)', fontFamily: 'monospace', fontSize: 13, fontWeight: 600 }}>
                        {issue.hu || '—'}
                      </Link>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{issue.nama_barang}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{issue.sku}</div>
                    </td>
                    <td>
                      <SelisihDisplay value={Number(issue.remaining_selisih_pcs ?? issue.selisih_pcs)} />
                      {(issue.merge_count ?? 0) > 0 && (
                        <span style={{ fontSize: 10, background: '#EFF6FF', color: '#2563EB', padding: '1px 4px', borderRadius: 4, marginLeft: 4, fontWeight: 600 }}>×{issue.merge_count}</span>
                      )}
                    </td>
                    <td><IssueStatusBadge status={issue.status} /></td>
                    <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      <div>{formatDateShort(issue.created_at)}</div>
                      {issue.updated_at && issue.updated_at !== issue.created_at && (
                        <div style={{ fontSize: 10, color: 'var(--color-primary)', marginTop: 2, fontWeight: 500 }}>
                          (merge/update {formatDateShort(issue.updated_at)})
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      <div>{issue.created_by_name || issue.created_by}</div>
                      {issue.updated_by && issue.updated_by !== issue.created_by && (
                        <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>
                          (update/merge by {issue.updated_by_name || issue.updated_by})
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Activity + CZ Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* CZ Summary */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>CZ Summary</h3>
              <Link href="/admin/cz" style={{ fontSize: 13, color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
                Lihat Semua
              </Link>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1, textAlign: 'center', padding: '12px', background: 'var(--color-open-bg)', borderRadius: 10, border: '1px solid #FCD34D' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-open)' }}>{summary?.cz_open ?? 0}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginTop: 2 }}>OPEN</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center', padding: '12px', background: 'var(--color-solved-bg)', borderRadius: 10, border: '1px solid #6EE7B7' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-solved)' }}>{summary?.cz_solved ?? 0}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginTop: 2 }}>SOLVED</div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card" style={{ padding: 20, flex: 1 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Aktivitas Terbaru</h3>
            {loading && recentActivity.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton" style={{ height: 44 }} />)}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {recentActivity.slice(0, 8).map((log) => (
                  <div key={log.log_id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '10px', background: '#F9FAFB', borderRadius: 8,
                  }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{actionIcons[log.action] ?? '📌'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>
                        <strong>{log.performed_by}</strong>{' '}
                        <span style={{ color: 'var(--color-text-secondary)' }}>
                          {actionLabels[log.action] ?? log.action}
                        </span>{' '}
                        <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-primary)' }}>
                          {log.reference_id}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                        {formatRelativeTime(log.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function SummaryCard({ label, value, color, bg, icon, href }: {
  label: string; value: number; color: string; bg: string; icon: string; href: string;
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div className="summary-card" style={{ borderTop: `3px solid ${color}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {label}
            </div>
            <div style={{ fontSize: 36, fontWeight: 800, color, marginTop: 4, lineHeight: 1 }}>
              {value}
            </div>
          </div>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22,
          }}>
            {icon}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--color-text-muted)' }}>
          <span>Lihat detail</span>
          <ChevronRight size={12} />
        </div>
      </div>
    </Link>
  );
}
