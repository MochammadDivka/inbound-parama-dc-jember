'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, ChevronRight, Edit2, Trash2, CheckCircle, HelpCircle, X } from 'lucide-react';
import { UserLayout } from '@/components/layout/UserLayout';
import { CZStatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/ToastProvider';
import { CZRecord } from '@/types';
import { formatRelativeTime } from '@/lib/utils';

export default function UserCZPage() {
  const { data: session } = useSession();
  const toast = useToast();
  
  const [records, setRecords] = useState<CZRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'SOLVED'>('ALL');
  const [search, setSearch] = useState('');
  const [showMineOnly, setShowMineOnly] = useState(false);
  const [summary, setSummary] = useState({ open: 0, solved: 0 });
  
  const [selectedCZ, setSelectedCZ] = useState<CZRecord | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchCZ = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (showMineOnly) params.set('mine', 'true');
      if (filter !== 'ALL') params.set('status', filter);
      if (search) params.set('search', search);
      
      const res = await fetch(`/api/cz?${params}`);
      const data = await res.json();
      if (data.success) {
        setRecords(data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengambil data CZ');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const params = new URLSearchParams();
      if (showMineOnly) params.set('mine', 'true');
      const res = await fetch(`/api/cz?${params}`);
      const data = await res.json();
      if (data.success) {
        const all: CZRecord[] = data.data;
        setSummary({
          open: all.filter((r) => r.status === 'OPEN').length,
          solved: all.filter((r) => r.status === 'SOLVED').length,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [showMineOnly]);

  useEffect(() => {
    fetchCZ();
  }, [filter, search, showMineOnly]);

  const handleDelete = async () => {
    if (!selectedCZ) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/cz/${selectedCZ.cz_id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`CZ record ${selectedCZ.cz_id} berhasil dihapus!`);
        setSelectedCZ(null);
        setShowDeleteConfirm(false);
        fetchCZ();
        fetchSummary();
      } else {
        toast.error(data.error?.message ?? 'Gagal menghapus CZ record');
      }
    } catch {
      toast.error('Periksa koneksi internet Anda');
    } finally {
      setDeleting(false);
    }
  };

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
            CZ Open
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
            CZ Selesai
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-solved)', marginTop: 2 }}>
            {summary.solved}
          </div>
        </div>
      </div>

      {/* Primary Action Button */}
      <div style={{ marginBottom: 20 }}>
        <Link href="/cz/new" className="btn btn-secondary btn-lg" style={{ textDecoration: 'none', display: 'flex', justifyContent: 'center' }}>
          <Plus size={20} />
          BUAT CZ BARU
        </Link>
      </div>

      {/* List Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>
              {showMineOnly ? 'CZ Record Saya' : 'Semua CZ Record'}
            </h2>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{records.length} CZ ditemukan</span>
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
            placeholder="Cari CZ ID, SKU, nama barang, HU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 42 }}
          />
        </div>

        {/* Filters tab pills */}
        <div className="tab-pills" style={{ marginBottom: 16 }}>
          {[
            { label: 'Semua', value: 'ALL' },
            { label: 'Open', value: 'OPEN' },
            { label: 'Selesai', value: 'SOLVED' }
          ].map((tab) => (
            <button
              key={tab.value}
              className={`tab-pill ${filter === tab.value ? 'active' : ''}`}
              onClick={() => setFilter(tab.value as any)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* List Grid */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: 110 }} />
            ))}
          </div>
        ) : records.length === 0 ? (
          <div className="empty-state">
            <HelpCircle size={48} color="var(--color-text-muted)" />
            <p style={{ color: 'var(--color-text-muted)', fontSize: 15 }}>
              {search ? 'Tidak ada CZ record yang cocok' : 'Belum ada CZ record'}
            </p>
            <Link href="/cz/new" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none', marginTop: 4 }}>
              <Plus size={15} />
              Buat CZ
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {records.map((record) => {
              const isOwner = record.created_by === session?.user.name;
              const isOpen = record.status === 'OPEN';
              
              return (
                <div key={record.cz_id} className="issue-card" style={{ cursor: 'pointer' }} onClick={() => setSelectedCZ(record)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span className="issue-id">{record.cz_id}</span>
                    <CZStatusBadge status={record.status} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text)', marginBottom: 2 }}>
                      {record.nama_barang}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                      <span>{record.sku} · Batch: {record.batch}</span>
                      <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 500 }}>
                        👤 {record.created_by_name ?? record.created_by}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: 10, marginTop: 4 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)', background: '#EFF6FF', padding: '3px 8px', borderRadius: 6 }}>
                        {record.qty_pcs} PCS
                      </span>
                      {record.storage_tujuan && (
                        <span style={{ fontSize: 12, color: 'var(--color-solved)', fontWeight: 600 }}>
                          📍 {record.storage_tujuan}
                        </span>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} onClick={(e) => e.stopPropagation()}>
                      {isOwner && isOpen && (
                        <>
                          <Link href={`/cz/${record.cz_id}/edit`} className="btn btn-ghost btn-sm" style={{ padding: 6, minWidth: 0 }}>
                            <Edit2 size={14} color="var(--color-primary)" />
                          </Link>
                          <button onClick={() => { setSelectedCZ(record); setShowDeleteConfirm(true); }} className="btn btn-ghost btn-sm" style={{ padding: 6, minWidth: 0 }}>
                            <Trash2 size={14} color="var(--color-danger)" />
                          </button>
                        </>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 2, color: 'var(--color-text-muted)', fontSize: 11 }}>
                        <span>{formatRelativeTime(record.created_at)}</span>
                        <ChevronRight size={14} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CZ Detail Modal */}
      <Modal isOpen={!!selectedCZ && !showDeleteConfirm} onClose={() => setSelectedCZ(null)} title="Detail CZ Record">
        {selectedCZ && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="issue-id" style={{ fontSize: 14 }}>{selectedCZ.cz_id}</span>
              <CZStatusBadge status={selectedCZ.status} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, background: '#F9FAFB', padding: 16, borderRadius: 12, border: '1px solid var(--color-border)' }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Nama Barang</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{selectedCZ.nama_barang}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>SKU</div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{selectedCZ.sku}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Batch</div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{selectedCZ.batch}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Qty</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-primary)', marginTop: 2 }}>{selectedCZ.qty_pcs} PCS</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>HU / DO</div>
                  <div style={{ fontSize: 13, marginTop: 2 }}>
                    {selectedCZ.hu || '-'}{selectedCZ.do_number ? ` / ${selectedCZ.do_number}` : ''}
                  </div>
                </div>
              </div>
            </div>

            {selectedCZ.keterangan && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Keterangan</div>
                <p style={{ fontSize: 13, background: '#FFFDF5', border: '1px solid #FEF3C7', padding: 12, borderRadius: 8, color: '#92400E' }}>
                  {selectedCZ.keterangan}
                </p>
              </div>
            )}

            {selectedCZ.status === 'SOLVED' && (
              <div style={{ borderLeft: '4px solid var(--color-solved)', padding: '10px 14px', background: '#F0FDF4', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--color-solved)', fontWeight: 700, textTransform: 'uppercase' }}>📍 Status Penyelesaian</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>
                  Diselesaikan di: <strong>{selectedCZ.storage_tujuan}</strong>
                </div>
                {selectedCZ.catatan_penyelesaian && (
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4, fontStyle: 'italic' }}>
                    &ldquo;{selectedCZ.catatan_penyelesaian}&rdquo;
                  </div>
                )}
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 6 }}>
                  Oleh: {selectedCZ.solved_by_name ?? selectedCZ.solved_by} ({formatRelativeTime(selectedCZ.solved_at ?? '')})
                </div>
              </div>
            )}

            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)', paddingTop: 10 }}>
              Dibuat oleh: {selectedCZ.created_by_name ?? selectedCZ.created_by} · {formatRelativeTime(selectedCZ.created_at)}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              {selectedCZ.created_by === session?.user.name && selectedCZ.status === 'OPEN' && (
                <>
                  <button onClick={() => { setShowDeleteConfirm(true); }} className="btn btn-danger" style={{ flex: 1 }}>
                    <Trash2 size={16} /> Hapus
                  </button>
                  <Link href={`/cz/${selectedCZ.cz_id}/edit`} className="btn btn-secondary" style={{ flex: 1, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Edit2 size={16} /> Edit
                  </Link>
                </>
              )}
              <button className="btn btn-ghost" style={{ flex: 1.5 }} onClick={() => setSelectedCZ(null)}>Tutup</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Hapus CZ Record?">
        {selectedCZ && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: 14, fontSize: 13, color: '#B91C1C', display: 'flex', gap: 10 }}>
              <Trash2 size={24} style={{ flexShrink: 0 }} />
              <div>
                <strong>Tindakan ini tidak bisa dibatalkan!</strong>
                <p style={{ marginTop: 4 }}>Record <strong>{selectedCZ.cz_id}</strong> ({selectedCZ.nama_barang}) akan dihapus secara permanen dari database spreadsheet.</p>
              </div>
            </div>

            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Apakah Anda yakin?</p>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowDeleteConfirm(false)}>Batal</button>
              <button className="btn btn-danger" style={{ flex: 2 }} onClick={handleDelete} disabled={deleting}>
                {deleting ? <><span className="spinner" /> Menghapus...</> : <><Trash2 size={16} /> Ya, Hapus Record</>}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </UserLayout>
  );
}
