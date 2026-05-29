'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { IssueStatusBadge, SelisihDisplay } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/ToastProvider';
import { Issue } from '@/types';
import { formatDate } from '@/lib/utils';
import { ArrowLeft, Edit2, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

interface MergeHistoryEntry {
  timestamp: string;
  action: string;
  selisih_added: number;
  remaining: number;
  by: string;
  keterangan?: string;
}
import Link from 'next/link';

export default function AdminIssueDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const toast = useToast();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [showSolve, setShowSolve] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [storageTujuan, setStorageTujuan] = useState('');
  const [catatan, setCatatan] = useState('');
  const [alasan, setAlasan] = useState('');
  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [solving, setSolving] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    const fetchIssue = async () => {
      const res = await fetch(`/api/issues/${params.id}`);
      const data = await res.json();
      if (data.success) setIssue(data.data);
      else toast.error('Issue tidak ditemukan');
      setLoading(false);
    };
    fetchIssue();
  }, [params.id]);

  const remaining = issue?.remaining_selisih_pcs !== undefined && issue?.remaining_selisih_pcs !== null ? Number(issue.remaining_selisih_pcs) : (issue?.selisih_pcs ?? 0);
  const photosList = issue?.photo_url ? issue.photo_url.split(',').filter(Boolean) : [];
  const hasPhotos = photosList.length > 0;

  // Parse merge history
  const mergeHistory: MergeHistoryEntry[] = (() => {
    try { return JSON.parse(issue?.merge_history ?? '[]') as MergeHistoryEntry[]; }
    catch { return []; }
  })();

  const handleApprove = async () => {
    setApproving(true);
    const res = await fetch(`/api/issues/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', storage_tujuan: storageTujuan }),
    });
    const data = await res.json();
    setApproving(false);
    setShowApprove(false);
    if (data.success) { toast.success('Issue berhasil di-approve dan SOLVED!'); setIssue(data.data as Issue); }
    else toast.error(data.error?.message ?? 'Gagal approve');
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { toast.error('Alasan penolakan wajib diisi'); return; }
    setRejecting(true);
    const res = await fetch(`/api/issues/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', reject_reason: rejectReason }),
    });
    const data = await res.json();
    setRejecting(false);
    setShowReject(false);
    setRejectReason('');
    if (data.success) { toast.success('Request ditolak, issue kembali OPEN'); setIssue(data.data as Issue); }
    else toast.error(data.error?.message ?? 'Gagal menolak request');
  };

  const handleSolve = async () => {
    setSolving(true);
    const res = await fetch(`/api/issues/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'solve', storage_tujuan: storageTujuan, catatan }),
    });
    const data = await res.json();
    setSolving(false);
    setShowSolve(false);
    if (data.success) {
      toast.success('Issue berhasil diselesaikan!');
      setIssue(data.data);
    } else toast.error(data.error?.message ?? 'Gagal menyelesaikan');
  };

  const handleCancel = async () => {
    setCancelling(true);
    const res = await fetch(`/api/issues/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel', alasan }),
    });
    const data = await res.json();
    setCancelling(false);
    setShowCancel(false);
    if (data.success) {
      toast.success('Issue dibatalkan');
      setIssue(data.data);
    } else toast.error(data.error?.message ?? 'Gagal membatalkan');
  };

  if (loading) {
    return (
      <AdminLayout>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 800 }}>
          {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 80 }} />)}
        </div>
      </AdminLayout>
    );
  }

  if (!issue) return (
    <AdminLayout>
      <div className="empty-state">
        <p>Issue tidak ditemukan</p>
        <Link href="/admin/issues" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>Kembali</Link>
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <Link href="/admin/issues" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: 14 }}>
          <ArrowLeft size={16} />
          Issues
        </Link>
        <span style={{ color: 'var(--color-text-muted)' }}>/</span>
        <span style={{ fontSize: 14, fontFamily: 'monospace', color: 'var(--color-text)' }}>{issue.issue_id}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, alignItems: 'start' }}>
        {/* Main panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Header */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <span className="issue-id" style={{ fontSize: 14, marginBottom: 8, display: 'block' }}>{issue.issue_id}</span>
                <h1 style={{ fontSize: 22, fontWeight: 800 }}>{issue.nama_barang}</h1>
                <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{issue.sku}</span>
                  {issue.batch && <> · Batch: <strong>{issue.batch}</strong></>}
                </div>
              </div>
              <IssueStatusBadge status={issue.status} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
              {[
                { label: 'HU', value: issue.hu || '—' },
                { label: 'DO', value: issue.do_number || '—' },
                { label: 'Kategori', value: issue.kategori_issue },
                { label: 'Storage', value: issue.storage_tujuan || '—' },
              ].map(({ label, value }) => (
                <div key={label} className="info-item">
                  <span className="info-label">{label}</span>
                  <span className="info-value">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Qty display */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--color-text-muted)' }}>QUANTITY</h3>
            <div style={{ display: 'flex', gap: 16 }}>
              {[
                { label: 'Qty System', value: issue.qty_system_pcs, color: 'var(--color-text)' },
                { label: 'Qty Fisik', value: issue.qty_fisik_pcs, color: 'var(--color-text)' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{
                  flex: 1, textAlign: 'center', padding: '16px',
                  background: '#F9FAFB', borderRadius: 12, border: '1px solid var(--color-border)',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                  <div style={{ fontSize: 36, fontWeight: 800, color, marginTop: 4 }}>{value}</div>
                </div>
              ))}
              <div style={{
                flex: 1, textAlign: 'center', padding: '16px',
                background: remaining < 0 ? 'var(--color-cancelled-bg)' : remaining > 0 ? 'var(--color-solved-bg)' : '#F9FAFB',
                borderRadius: 12,
                border: `1px solid ${remaining < 0 ? '#FCA5A5' : remaining > 0 ? '#6EE7B7' : 'var(--color-border)'}`,
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Selisih</div>
                <div style={{ fontSize: 36, fontWeight: 800, marginTop: 4 }}>
                  <SelisihDisplay value={remaining} />
                </div>
              </div>
            </div>
          </div>

          {/* Keterangan */}
          {issue.keterangan && (
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: 'var(--color-text-muted)' }}>KETERANGAN</h3>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--color-text)' }}>
                &ldquo;{issue.keterangan}&rdquo;
              </p>
            </div>
          )}
        </div>

        {/* Side panel: Metadata + Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* WAITING_APPROVAL actions — approve/reject */}
          {issue.status === 'WAITING_APPROVAL' && (
            <div className="card" style={{ padding: 20, border: '1.5px solid #93C5FD', background: '#EFF6FF' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6, color: '#1D4ED8', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={16} /> REQUEST SOLVED
              </h3>
              {issue.req_solved_by && (
                <div style={{ fontSize: 13, color: '#2563EB', marginBottom: 12 }}>
                  <div>Oleh: <strong>{issue.req_solved_by}</strong></div>
                  {issue.req_solved_at && <div style={{ color: '#60A5FA', fontSize: 12 }}>{formatDate(issue.req_solved_at)}</div>}
                  {issue.req_solved_reason && <div style={{ marginTop: 4, fontStyle: 'italic' }}>&ldquo;{issue.req_solved_reason}&rdquo;</div>}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button className="btn btn-primary" onClick={() => setShowApprove(true)} style={{ background: '#16A34A', borderColor: '#16A34A' }}>
                  <CheckCircle size={16} /> Approve Solved
                </button>
                <button className="btn btn-danger" onClick={() => setShowReject(true)}>
                  <XCircle size={16} /> Tolak Request
                </button>
              </div>
            </div>
          )}

          {/* Regular OPEN actions */}
          {issue.status === 'OPEN' && (
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: 'var(--color-text-muted)' }}>AKSI</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Link href={`/admin/issues/${issue.issue_id}/edit`} className="btn btn-ghost" style={{ textDecoration: 'none' }}>
                  <Edit2 size={16} />
                  Edit Issue
                </Link>
                <button className="btn btn-primary" onClick={() => setShowSolve(true)}>
                  <CheckCircle size={16} />
                  Selesaikan Issue
                </button>
                <button className="btn btn-danger" onClick={() => setShowCancel(true)}>
                  <XCircle size={16} />
                  Batalkan Issue
                </button>
              </div>
            </div>
          )}

          {/* Foto Bukti */}
          {hasPhotos && (
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: 'var(--color-text-muted)' }}>FOTO BUKTI</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: 10 }}>
                {photosList.map((url, idx) => (
                  <div
                    key={url}
                    style={{
                      aspectRatio: '1', borderRadius: 8, overflow: 'hidden',
                      border: '1px solid var(--color-border)', cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                    }}
                    onClick={() => setSelectedPhoto(url)}
                  >
                    <img
                      src={url}
                      alt={`Bukti ${idx + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.15s ease' }}
                      className="photo-thumb"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: 'var(--color-text-muted)' }}>INFORMASI</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
              <InfoRow label="Dibuat oleh" value={issue.created_by_name ?? issue.created_by} />
              <InfoRow label="Dibuat pada" value={formatDate(issue.created_at)} />
              {issue.updated_at && issue.updated_at !== issue.created_at && (
                <InfoRow label="Terakhir diperbarui" value={formatDate(issue.updated_at)} color="var(--color-primary)" />
              )}
              {issue.solved_by && <InfoRow label="Diselesaikan oleh" value={issue.solved_by_name ?? issue.solved_by} color="var(--color-solved)" />}
              {issue.solved_at && <InfoRow label="Tanggal selesai" value={formatDate(issue.solved_at)} />}
              {issue.cancelled_by && <InfoRow label="Dibatalkan oleh" value={issue.cancelled_by_name ?? issue.cancelled_by} color="var(--color-cancelled)" />}
              {issue.cancelled_at && <InfoRow label="Tanggal batal" value={formatDate(issue.cancelled_at)} />}
              <InfoRow label="Sumber input" value={issue.input_source} />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Merge History (admin view) ───────────────────────────────── */}
      {mergeHistory.length > 0 && (
        <div className="card" style={{ padding: 24, marginTop: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: 'var(--color-text-muted)' }}>RIWAYAT MERGE</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {mergeHistory.map((entry, idx) => (
              <div key={idx} style={{
                padding: '10px 14px',
                borderRadius: 8, background: '#F9FAFB',
                borderLeft: `3px solid ${entry.remaining === 0 ? '#16A34A' : entry.selisih_added > 0 ? '#2563EB' : '#DC2626'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span style={{ fontWeight: 600 }}>{entry.action === 'initial' ? '📥 Initial' : '🔀 Merge'} · {entry.by}</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>{formatDate(entry.timestamp)}</span>
                </div>
                <div style={{ fontSize: 13, display: 'flex', gap: 8 }}>
                  <span style={{ fontWeight: 700, color: entry.selisih_added > 0 ? 'var(--color-plus)' : 'var(--color-minus)' }}>
                    {entry.selisih_added > 0 ? '+' : ''}{entry.selisih_added} PCS
                  </span>
                  <span style={{ color: 'var(--color-text-muted)' }}>→</span>
                  <span style={{ fontWeight: 700, color: entry.remaining === 0 ? '#16A34A' : 'var(--color-text)' }}>
                    Remaining: {entry.remaining} PCS{entry.remaining === 0 ? ' ✅' : ''}
                  </span>
                </div>
                {entry.keterangan && <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 3, fontStyle: 'italic' }}>&ldquo;{entry.keterangan}&rdquo;</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Solve Dialog */}
      <Modal isOpen={showSolve} onClose={() => setShowSolve(false)} title="Selesaikan Issue?">
        <div style={{ marginBottom: 16 }}>
          <span className="issue-id">{issue.issue_id}</span>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>{issue.nama_barang}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          <div>
            <label className="label">Storage Tujuan</label>
            <input className="input-field" type="text" placeholder="Contoh: RACK-A12"
              value={storageTujuan} onChange={(e) => setStorageTujuan(e.target.value)} />
          </div>
          <div>
            <label className="label">Catatan (opsional)</label>
            <textarea className="textarea-field" style={{ minHeight: 72 }}
              value={catatan} onChange={(e) => setCatatan(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowSolve(false)}>Batal</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSolve} disabled={solving}>
            {solving ? <><span className="spinner" />Memproses...</> : <><CheckCircle size={16} />Selesaikan</>}
          </button>
        </div>
      </Modal>

      {/* Cancel Dialog */}
      <Modal isOpen={showCancel} onClose={() => setShowCancel(false)} title="Batalkan Issue?">
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
            Issue <strong>{issue.issue_id}</strong> akan dibatalkan.
          </p>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label className="label">Alasan (opsional)</label>
          <textarea className="textarea-field" style={{ minHeight: 72 }}
            value={alasan} onChange={(e) => setAlasan(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowCancel(false)}>Batal</button>
          <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleCancel} disabled={cancelling}>
            {cancelling ? <><span className="spinner" />Memproses...</> : <><XCircle size={16} />Batalkan</>}
          </button>
        </div>
      </Modal>
      {/* ─── Approve Dialog ────────────────────────────────────────────── */}
      <Modal isOpen={showApprove} onClose={() => setShowApprove(false)} title="Approve Solved?">
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
            Issue <strong>{issue.issue_id}</strong> akan ditandai <strong>SOLVED</strong>.
          </p>
          {issue.req_solved_reason && (
            <div style={{ marginTop: 10, background: '#F9FAFB', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Alasan user: </span>
              &ldquo;{issue.req_solved_reason}&rdquo;
            </div>
          )}
        </div>
        <div style={{ marginBottom: 16 }}>
          <label className="label">Storage Tujuan (opsional)</label>
          <input className="input-field" type="text" placeholder="Contoh: RACK-A12"
            value={storageTujuan} onChange={(e) => setStorageTujuan(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowApprove(false)}>Batal</button>
          <button className="btn btn-primary" style={{ flex: 1, background: '#16A34A' }} onClick={handleApprove} disabled={approving}>
            {approving ? <><span className="spinner" />Memproses...</> : <><CheckCircle size={16} />Ya, Approve</>}
          </button>
        </div>
      </Modal>

      {/* ─── Reject Dialog ─────────────────────────────────────────────── */}
      <Modal isOpen={showReject} onClose={() => setShowReject(false)} title="Tolak Request Solved?">
        <div style={{ marginBottom: 16 }}>
          <label className="label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            Alasan Penolakan <span style={{ color: 'var(--color-danger)' }}>*</span>
          </label>
          <textarea className="textarea-field" style={{ minHeight: 88 }}
            placeholder="Jelaskan alasan penolakan..."
            value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowReject(false)}>Batal</button>
          <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleReject} disabled={rejecting || !rejectReason.trim()}>
            {rejecting ? <><span className="spinner" />Memproses...</> : <><XCircle size={16} />Tolak Request</>}
          </button>
        </div>
      </Modal>
      {/* Lightbox Modal */}
      {selectedPhoto && (
        <Modal
          isOpen={!!selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
          title="Foto Bukti (Evidence)"
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: '100%', maxHeight: '70vh', borderRadius: 12, overflow: 'hidden',
              background: '#F3F4F6', border: '1px solid var(--color-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <img
                src={selectedPhoto}
                alt="Foto Bukti Detail"
                style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, width: '100%' }}>
              <a
                href={selectedPhoto}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost"
                style={{ flex: 1, textDecoration: 'none', textAlign: 'center', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              >
                🔗 Buka Tab Baru
              </a>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={() => setSelectedPhoto(null)}
              >
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}

function InfoRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
      <span style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: 600, color: color ?? 'var(--color-text)', textAlign: 'right' }}>{value}</span>
    </div>
  );
}
