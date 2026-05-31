'use client';

import { useEffect, useState, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { CZStatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/ToastProvider';
import { CZRecord } from '@/types';
import { formatRelativeTime } from '@/lib/utils';
import { CheckCircle, Search, Filter, X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSupabaseRealtime } from '@/lib/realtime';

export default function AdminCZPage() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  
  const [selectedCZ, setSelectedCZ] = useState<CZRecord | null>(null);
  const [showSolve, setShowSolve] = useState(false);
  const [storageTujuan, setStorageTujuan] = useState('');
  const [catatan, setCatatan] = useState('');
  const [solving, setSolving] = useState(false);

  // Debounced search logic (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Query: CZ Records List
  const { data: recordsData, isLoading, isFetching } = useQuery({
    queryKey: ['cz-records', { status, search: debouncedSearch, dateFrom, dateTo }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status !== 'ALL') params.set('status', status);
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      
      const res = await fetch(`/api/cz?${params}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || 'Gagal');
      return data.data as CZRecord[];
    },
    staleTime: 1000 * 30, // 30 detik
  });

  // Connect to Supabase Realtime
  const realtimeKeys = useMemo(() => [
    ['cz-records']
  ], []);
  useSupabaseRealtime('cz_records', realtimeKeys);

  const records = recordsData || [];

  const resetFilter = () => {
    setSearch('');
    setStatus('ALL');
    setDateFrom('');
    setDateTo('');
  };

  const hasFilter = search || status !== 'ALL' || dateFrom || dateTo;

  const openSolveModal = (record: CZRecord) => {
    setSelectedCZ(record);
    setStorageTujuan('');
    setCatatan('');
    setShowSolve(true);
  };

  const handleSolve = async () => {
    if (!selectedCZ) return;
    if (!storageTujuan.trim()) {
      toast.error('Storage tujuan wajib diisi');
      return;
    }
    setSolving(true);
    try {
      const res = await fetch(`/api/cz/${selectedCZ.cz_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storage_tujuan: storageTujuan, catatan_penyelesaian: catatan }),
      });
      const data = await res.json();
      setSolving(false);
      setShowSolve(false);
      if (data.success) {
        toast.success('CZ record berhasil diselesaikan!');
        // Invalidate cz-records query
        queryClient.invalidateQueries({ queryKey: ['cz-records'] });
      } else {
        toast.error(data.error?.message ?? 'Gagal menyelesaikan CZ');
      }
    } catch {
      toast.error('Gagal terhubung ke server');
      setSolving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Clarification Zone (CZ)</h1>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginTop: 2 }}>
            Item yang diminta SAP ke area CZ {isFetching && <span style={{ fontSize: 12, color: 'var(--color-primary)', marginLeft: 8 }}>• Memuat data...</span>}
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
            placeholder="Cari SKU, nama barang, atau CZ ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 42 }}
          />
        </div>

        <select className="select-field" style={{ width: 160 }}
          value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="ALL">Semua Status</option>
          <option value="OPEN">Open</option>
          <option value="SOLVED">Selesai</option>
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

      {/* Expanded Filter Panel */}
      {showFilter && (
        <div className="filter-panel" style={{ marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
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

      {/* CZ Table */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>CZ ID</th>
              <th>SKU / Nama Barang</th>
              <th>Batch</th>
              <th>Qty (PCS)</th>
              <th>Status</th>
              <th>Dibuat</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && records.length === 0 ? (
              Array(5).fill(null).map((_, i) => (
                <tr key={i}>
                  {Array(7).fill(null).map((_, j) => (
                    <td key={j}><div className="skeleton" style={{ height: 16 }} /></td>
                  ))}
                </tr>
              ))
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-muted)' }}>
                  Tidak ada CZ record
                </td>
              </tr>
            ) : records.map((record) => (
              <tr key={record.cz_id}>
                <td>
                  <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: 'var(--color-primary)' }}>
                    {record.cz_id}
                  </span>
                </td>
                <td>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{record.nama_barang}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{record.sku}</div>
                </td>
                <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{record.batch}</td>
                <td style={{ fontWeight: 700 }}>{record.qty_pcs}</td>
                <td><CZStatusBadge status={record.status} /></td>
                <td>
                  <div style={{ fontSize: 13 }}>{record.created_by_name ?? record.created_by}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{formatRelativeTime(record.created_at)}</div>
                </td>
                <td>
                  {record.status === 'OPEN' && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => openSolveModal(record)}
                    >
                      <CheckCircle size={14} />
                      Selesaikan
                    </button>
                  )}
                  {record.status === 'SOLVED' && (
                    <span style={{ fontSize: 12, color: 'var(--color-solved)', fontWeight: 600 }}>
                      📍 {record.storage_tujuan}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Solve Modal */}
      <Modal isOpen={showSolve} onClose={() => setShowSolve(false)} title="Selesaikan CZ Record?">
        {selectedCZ && (
          <>
            <div style={{ marginBottom: 16, padding: '12px 14px', background: '#F9FAFB', borderRadius: 10 }}>
              <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: 'var(--color-primary)' }}>{selectedCZ.cz_id}</span>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{selectedCZ.nama_barang}</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{selectedCZ.sku} · Batch: {selectedCZ.batch}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              <div>
                <label className="label label-required">Storage Tujuan</label>
                <input className="input-field" type="text" placeholder="Contoh: RACK-A12"
                  value={storageTujuan} onChange={(e) => setStorageTujuan(e.target.value)} />
              </div>
              <div>
                <label className="label">Catatan Penyelesaian (opsional)</label>
                <textarea className="textarea-field" style={{ minHeight: 72 }}
                  value={catatan} onChange={(e) => setCatatan(e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowSolve(false)}>Batal</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSolve} disabled={solving || !storageTujuan.trim()}>
                {solving ? <><span className="spinner" />Memproses...</> : <><CheckCircle size={16} />Ya, Selesaikan</>}
              </button>
            </div>
          </>
        )}
      </Modal>
    </AdminLayout>
  );
}
