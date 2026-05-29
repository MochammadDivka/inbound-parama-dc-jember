'use client';

import { Suspense } from 'react';
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { IssueStatusBadge, SelisihDisplay } from '@/components/ui/Badge';
import { Issue } from '@/types';
import { formatRelativeTime, formatDate } from '@/lib/utils';
import { ISSUE_CATEGORIES } from '@/lib/constants';
import { Search, Filter, ChevronDown, ChevronUp, X, Eye } from 'lucide-react';
import Link from 'next/link';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Semua Status' },
  { value: 'OPEN', label: 'Open' },
  { value: 'WAITING_APPROVAL', label: '🔵 Waiting Approval' },
  { value: 'SOLVED', label: 'Selesai' },
  { value: 'CANCELLED', label: 'Dibatalkan' },
];

function AdminIssuesContent() {
  const searchParams = useSearchParams();

  const [issues, setIssues] = useState<Issue[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showFilter, setShowFilter] = useState(false);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>(searchParams.get('status') ?? 'ALL');
  const [kategori, setKategori] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const LIMIT = 20;
  const totalPages = Math.ceil(total / LIMIT);

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status !== 'ALL') params.set('status', status);
    if (kategori !== 'ALL') params.set('kategori', kategori);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    if (sortField) params.set('sort', sortField);
    if (sortOrder) params.set('order', sortOrder);
    params.set('page', String(page));
    params.set('limit', String(LIMIT));

    const res = await fetch(`/api/issues?${params}`);
    const data = await res.json();
    if (data.success) {
      setIssues(data.data);
      setTotal(data.total);
    }
    setLoading(false);
  }, [search, status, kategori, dateFrom, dateTo, page, sortField, sortOrder]);

  useEffect(() => { fetchIssues(); }, [fetchIssues]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder((o) => o === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ChevronDown size={14} style={{ opacity: 0.3 }} />;
    return sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  const resetFilter = () => {
    setSearch('');
    setStatus('ALL');
    setKategori('ALL');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const hasFilter = search || status !== 'ALL' || kategori !== 'ALL' || dateFrom || dateTo;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Issues</h1>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginTop: 2 }}>
            {total} issue ditemukan
          </p>
        </div>
      </div>

      {/* Search + Filter Bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
          <Search size={17} className="search-icon" />
          <input
            className="input-field"
            type="search"
            placeholder="Cari SKU, nama barang, atau HU..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ paddingLeft: 42 }}
          />
        </div>

        <select className="select-field" style={{ width: 160 }}
          value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        <button
          className={`btn ${showFilter ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setShowFilter((v) => !v)}
        >
          <Filter size={16} />
          Filter
          {hasFilter && (
            <span style={{
              background: 'white', color: 'var(--color-primary)',
              borderRadius: '50%', width: 18, height: 18,
              fontSize: 11, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>!</span>
          )}
        </button>

        {hasFilter && (
          <button className="btn btn-ghost btn-sm" onClick={resetFilter}>
            <X size={15} />
            Reset
          </button>
        )}
      </div>

      {/* Expanded Filter */}
      {showFilter && (
        <div className="filter-panel" style={{ marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            <div>
              <label className="label">Kategori</label>
              <select className="select-field" value={kategori} onChange={(e) => setKategori(e.target.value)}>
                <option value="ALL">Semua Kategori</option>
                {ISSUE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Tanggal Dari</label>
              <input className="input-field" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="label">Tanggal Sampai</label>
              <input className="input-field" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="table-wrapper" style={{ marginBottom: 16 }}>
        <table>
          <thead>
            <tr>
              <th>
                <button onClick={() => handleSort('hu')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 'inherit', color: 'inherit', fontSize: 'inherit' }}>
                  HU <SortIcon field="hu" />
                </button>
              </th>
              <th>SKU / Nama Barang</th>
              <th>Kategori</th>
              <th>
                <button onClick={() => handleSort('selisih_pcs')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 'inherit', color: 'inherit', fontSize: 'inherit' }}>
                  Selisih <SortIcon field="selisih_pcs" />
                </button>
              </th>
              <th>Status</th>
              <th>
                <button onClick={() => handleSort('created_at')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 'inherit', color: 'inherit', fontSize: 'inherit' }}>
                  Tanggal <SortIcon field="created_at" />
                </button>
              </th>
              <th>Dibuat</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(8).fill(null).map((_, i) => (
                <tr key={i}>
                  {Array(8).fill(null).map((_, j) => (
                    <td key={j}><div className="skeleton" style={{ height: 16, width: j === 1 ? 140 : 80 }} /></td>
                  ))}
                </tr>
              ))
            ) : issues.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-muted)' }}>
                  Tidak ada issue yang ditemukan
                </td>
              </tr>
            ) : issues.map((issue) => (
              <tr key={issue.issue_id}>
                <td>
                  <Link href={`/admin/issues/${issue.issue_id}`} style={{ textDecoration: 'none', color: 'var(--color-primary)', fontFamily: 'monospace', fontSize: 13, fontWeight: 600 }}>
                    {issue.hu || '—'}
                  </Link>
                </td>
                <td>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{issue.nama_barang}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    {issue.sku}{issue.batch ? ` · ${issue.batch}` : ''}
                  </div>
                </td>
                <td style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{issue.kategori_issue}</td>
                <td><SelisihDisplay value={issue.remaining_selisih_pcs !== undefined && issue.remaining_selisih_pcs !== null ? issue.remaining_selisih_pcs : issue.selisih_pcs} /></td>
                <td><IssueStatusBadge status={issue.status} /></td>
                <td style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{formatDate(issue.updated_at || issue.created_at)}</td>
                <td style={{ fontSize: 13 }}>{issue.created_by_name || issue.created_by}</td>
                <td>
                  <Link href={`/admin/issues/${issue.issue_id}`} className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>
                    <Eye size={14} />
                    Detail
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button className="page-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>‹</button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            const p = i + 1;
            return (
              <button key={p} className={`page-btn ${page === p ? 'active' : ''}`} onClick={() => setPage(p)}>
                {p}
              </button>
            );
          })}
          <button className="page-btn" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>›</button>
          <span style={{ fontSize: 13, color: 'var(--color-text-muted)', marginLeft: 8 }}>
            Halaman {page} dari {totalPages}
          </span>
        </div>
      )}
    </>
  );
}

export default function AdminIssuesPage() {
  return (
    <AdminLayout>
      <Suspense fallback={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 60 }} />)}
        </div>
      }>
        <AdminIssuesContent />
      </Suspense>
    </AdminLayout>
  );
}
