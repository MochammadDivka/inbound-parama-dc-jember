'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Edit2, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { UserLayout } from '@/components/layout/UserLayout';
import { IssueStatusBadge, SelisihDisplay } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/ToastProvider';
import { Issue } from '@/types';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

interface MergeHistoryEntry {
  timestamp: string;
  action: string;
  selisih_added: number;
  remaining: number;
  by: string;
  keterangan?: string;
}

export default function IssueDetailPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession();
  const router = useRouter();
  const toast = useToast();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [showSolve, setShowSolve] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showRequestSolved, setShowRequestSolved] = useState(false);
  const [storageTujuan, setStorageTujuan] = useState('');
  const [catatan, setCatatan] = useState('');
  const [alasan, setAlasan] = useState('');
  const [reqReason, setReqReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const cleanString = (str: any) => String(str ?? '').trim().toLowerCase();
  const canEdit = issue && issue.status === 'OPEN' && (
    isAdmin || 
    cleanString(issue.created_by) === cleanString(session?.user.name) ||
    cleanString(issue.created_by) === cleanString(session?.user.username) ||
    cleanString(issue.created_by) === cleanString(session?.user.id) ||
    cleanString(issue.created_by_name) === cleanString(session?.user.name)
  );
  const remaining = issue?.remaining_selisih_pcs ?? issue?.selisih_pcs ?? 0;
  const isBalanced = remaining === 0;
  const canRequestSolved = issue?.status === 'OPEN'; // Siapapun USER bisa request

  // Parse merge history
  const mergeHistory: MergeHistoryEntry[] = (() => {
    try { return JSON.parse(issue?.merge_history ?? '[]') as MergeHistoryEntry[]; }
    catch { return []; }
  })();

  const hasMergeHistory = mergeHistory.length > 0;

  useEffect(() => {
    const fetchIssue = async () => {
      const res = await fetch(`/api/issues/${params.id}`);
      const data = await res.json();
      if (data.success) {
        setIssue(data.data as Issue);
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          if (urlParams.get('requestSolved') === 'true' && data.data.status === 'OPEN') {
            setShowRequestSolved(true);
          }
        }
      } else {
        toast.error('Issue tidak ditemukan');
      }
      setLoading(false);
    };
    fetchIssue();
  }, [params.id]);

  // ─── Actions ──────────────────────────────────────────────────────
  const handleSolve = async () => {
    setSubmitting(true);
    const res = await fetch(`/api/issues/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'solve', storage_tujuan: storageTujuan, catatan }),
    });
    const data = await res.json();
    setSubmitting(false);
    setShowSolve(false);
    if (data.success) { toast.success('Issue berhasil diselesaikan!'); setIssue(data.data as Issue); }
    else toast.error(data.error?.message ?? 'Gagal menyelesaikan issue');
  };

  const handleCancel = async () => {
    setSubmitting(true);
    const res = await fetch(`/api/issues/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel', alasan }),
    });
    const data = await res.json();
    setSubmitting(false);
    setShowCancel(false);
    if (data.success) { toast.success('Issue dibatalkan'); setIssue(data.data as Issue); }
    else toast.error(data.error?.message ?? 'Gagal membatalkan issue');
  };

  const handleRequestSolved = async () => {
    if (!isBalanced && !reqReason.trim()) {
      toast.error('Alasan wajib diisi karena selisih masih ada');
      return;
    }
    setSubmitting(true);
    const res = await fetch(`/api/issues/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'request-solved', req_solved_reason: reqReason }),
    });
    const data = await res.json();
    setSubmitting(false);
    setShowRequestSolved(false);
    if (data.success) {
      toast.success('Request solved berhasil dikirim!');
      setIssue(data.data as Issue);
    } else {
      toast.error(data.error?.message ?? 'Gagal mengirim request');
    }
  };

  if (loading) {
    return (
      <UserLayout>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 80 }} />)}
        </div>
      </UserLayout>
    );
  }

  if (!issue) {
    return (
      <UserLayout>
        <div className="empty-state">
          <p>Issue tidak ditemukan</p>
          <button className="btn btn-primary btn-sm" onClick={() => router.back()}>Kembali</button>
        </div>
      </UserLayout>
    );
  }

  const selisihColor = remaining < 0 ? 'var(--color-minus)' : remaining > 0 ? 'var(--color-plus)' : 'var(--color-zero)';
  const photosList = issue?.photo_url ? issue.photo_url.split(',').filter(Boolean) : [];
  const hasPhotos = photosList.length > 0;

  return (
    <UserLayout>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, marginLeft: -8, display: 'flex', color: 'var(--color-text)' }}
        >
          <ArrowLeft size={22} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className="issue-id" style={{ fontSize: 13 }}>{issue.issue_id}</span>
            <IssueStatusBadge status={issue.status} />
          </div>
        </div>
        {canEdit && (
          <Link
            href={`/issues/${issue.issue_id}/edit`}
            style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-primary)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
          >
            <Edit2 size={15} /> Edit
          </Link>
        )}
      </div>

      {/* Reject reason banner (jika pernah ditolak) */}
      {issue.reject_reason && issue.status === 'OPEN' && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          background: '#FEF2F2', border: '1px solid #FCA5A5',
          borderRadius: 8, padding: '10px 14px', marginBottom: 12,
          fontSize: 13, color: '#991B1B',
        }}>
          <XCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>Request Solved Ditolak</strong>
            <p style={{ marginTop: 2 }}>{issue.reject_reason}</p>
          </div>
        </div>
      )}

      {/* WAITING_APPROVAL banner (untuk USER) */}
      {issue.status === 'WAITING_APPROVAL' && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          background: '#EFF6FF', border: '1px solid #93C5FD',
          borderRadius: 8, padding: '12px 14px', marginBottom: 12,
          fontSize: 13, color: '#1D4ED8',
        }}>
          <Clock size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>Menunggu Persetujuan Admin</strong>
            {issue.req_solved_by && (
              <p style={{ marginTop: 2 }}>
                Diajukan oleh <strong>{issue.req_solved_by}</strong>
                {issue.req_solved_at && ` · ${formatDate(issue.req_solved_at)}`}
              </p>
            )}
            {issue.req_solved_reason && (
              <p style={{ marginTop: 2, fontStyle: 'italic' }}>&ldquo;{issue.req_solved_reason}&rdquo;</p>
            )}
          </div>
        </div>
      )}

      {/* Main info */}
      <div className="card" style={{ padding: '16px', marginBottom: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{issue.nama_barang}</h2>
        <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
          {issue.sku && <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{issue.sku}</span>}
          {issue.batch && <> · Batch: <strong>{issue.batch}</strong></>}
        </div>

        <div className="info-grid">
          {issue.hu && (
            <div className="info-item">
              <span className="info-label">HU</span>
              <span className="info-value">{issue.hu}</span>
            </div>
          )}
          {issue.do_number && (
            <div className="info-item">
              <span className="info-label">DO</span>
              <span className="info-value">{issue.do_number}</span>
            </div>
          )}
          <div className="info-item">
            <span className="info-label">Kategori</span>
            <span className="info-value">{issue.kategori_issue}</span>
          </div>
          {issue.storage_tujuan && (
            <div className="info-item">
              <span className="info-label">Storage</span>
              <span className="info-value">{issue.storage_tujuan}</span>
            </div>
          )}
        </div>
      </div>

      {/* Qty display */}
      <div className="qty-display" style={{ marginBottom: 12 }}>
        <div className="qty-block" style={{ flex: 1 }}>
          <div className="qty-label">Qty System</div>
          <div className="qty-value">{issue.qty_system_pcs}</div>
        </div>
        <span className="qty-divider">→</span>
        <div className="qty-block" style={{ flex: 1 }}>
          <div className="qty-label">Qty Fisik</div>
          <div className="qty-value">{issue.qty_fisik_pcs}</div>
        </div>
        <span className="qty-divider">|</span>
        <div className="qty-block" style={{ flex: 1 }}>
          <div className="qty-label">
            Remaining
            {(issue.merge_count ?? 0) > 0 && <span style={{ marginLeft: 4, fontSize: 10, background: '#EFF6FF', color: '#2563EB', padding: '1px 5px', borderRadius: 4 }}>×{issue.merge_count}</span>}
          </div>
          <div className="qty-value">
            <SelisihDisplay value={remaining} />
          </div>
        </div>
      </div>

      {/* Balance matched banner */}
      {isBalanced && issue.status === 'OPEN' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#F0FDF4', border: '1px solid #86EFAC',
          borderRadius: 8, padding: '12px 14px', marginBottom: 12,
          fontSize: 13, color: '#16A34A',
        }}>
          <CheckCircle size={16} />
          <span><strong>Issue sudah balance!</strong> Kamu bisa request solved ke Admin.</span>
        </div>
      )}

      {/* Merge History */}
      {hasMergeHistory && (
        <div className="card" style={{ padding: 16, marginBottom: 12 }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--color-text)' }}>
            Riwayat Selisih
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {mergeHistory.map((entry, idx) => (
              <div key={idx} style={{
                padding: '10px 12px',
                background: idx === mergeHistory.length - 1 ? '#F9FAFB' : 'transparent',
                borderRadius: 6,
                borderLeft: `3px solid ${entry.remaining === 0 ? '#16A34A' : entry.selisih_added > 0 ? '#2563EB' : '#DC2626'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                    {entry.action === 'initial' ? '📥 Initial' : '🔀 Merge'} · {entry.by}
                  </span>
                  <span style={{ color: 'var(--color-text-muted)' }}>{formatDate(entry.timestamp)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <span style={{ color: entry.selisih_added > 0 ? 'var(--color-plus)' : 'var(--color-minus)', fontWeight: 700 }}>
                    {entry.selisih_added > 0 ? '+' : ''}{entry.selisih_added} PCS
                  </span>
                  <span style={{ color: 'var(--color-text-muted)' }}>→</span>
                  <span style={{ fontWeight: 700, color: entry.remaining === 0 ? '#16A34A' : selisihColor }}>
                    Remaining: {entry.remaining > 0 ? '+' : ''}{entry.remaining} PCS{entry.remaining === 0 ? ' ✅' : ''}
                  </span>
                </div>
                {entry.keterangan && (
                  <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 3, fontStyle: 'italic' }}>
                    &ldquo;{entry.keterangan}&rdquo;
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Keterangan */}
      {issue.keterangan && (
        <div className="card" style={{ padding: 16, marginBottom: 12 }}>
          <div className="info-label" style={{ marginBottom: 6 }}>Keterangan</div>
          <p style={{ fontSize: 14, color: 'var(--color-text)', lineHeight: 1.6 }}>
            &ldquo;{issue.keterangan}&rdquo;
          </p>
        </div>
      )}

      {/* Foto Bukti */}
      {hasPhotos && (
        <div className="card" style={{ padding: 16, marginBottom: 12 }}>
          <div className="info-label" style={{ marginBottom: 10 }}>Foto Bukti (Evidence)</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 10 }}>
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
      <div className="card" style={{ padding: 16, marginBottom: 80 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Dibuat oleh</span>
            <strong>{issue.created_by_name ?? issue.created_by}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Tanggal</span>
            <span>{formatDate(issue.created_at)}</span>
          </div>
          {issue.solved_by && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Diselesaikan oleh</span>
              <strong style={{ color: 'var(--color-solved)' }}>{issue.solved_by_name ?? issue.solved_by}</strong>
            </div>
          )}
          {issue.cancelled_by && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Dibatalkan oleh</span>
              <strong style={{ color: 'var(--color-cancelled)' }}>{issue.cancelled_by_name ?? issue.cancelled_by}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons sticky — USER: Request Solved / ADMIN: Solve, Cancel */}
      {issue.status === 'OPEN' && (
        <div className="sticky-bottom" style={{ margin: '0 -16px' }}>
          <div style={{ display: 'flex', gap: 10 }}>
            {isAdmin ? (
              <>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setShowSolve(true)}>
                  <CheckCircle size={17} /> Selesaikan
                </button>
                <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => setShowCancel(true)}>
                  <XCircle size={17} /> Batalkan
                </button>
              </>
            ) : (
              canRequestSolved && (
                <button
                  className="btn btn-primary btn-lg"
                  style={{ flex: 1 }}
                  onClick={() => setShowRequestSolved(true)}
                >
                  <CheckCircle size={17} />
                  {isBalanced ? 'Request Solved ✅' : 'Request Solved'}
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* ─── Request Solved Dialog ───────────────────────────────────── */}
      <Modal isOpen={showRequestSolved} onClose={() => setShowRequestSolved(false)} title="Request Solved">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: isBalanced ? '#F0FDF4' : '#FFFBEB',
            border: `1px solid ${isBalanced ? '#86EFAC' : '#FCD34D'}`,
            borderRadius: 8, padding: '10px 14px', fontSize: 13,
            color: isBalanced ? '#16A34A' : '#92400E',
          }}>
            {isBalanced ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span>
              Remaining Selisih: <strong>{remaining > 0 ? '+' : ''}{remaining} PCS</strong>
              {isBalanced ? ' ✅ Balance!' : ' ⚠️'}
            </span>
          </div>

          <div>
            <label className="label" htmlFor="req_reason" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              Alasan
              {!isBalanced && <span style={{ color: 'var(--color-danger)' }}>*</span>}
              {isBalanced && <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 400 }}>(opsional)</span>}
            </label>
            <textarea
              id="req_reason"
              className="textarea-field"
              style={{ minHeight: 80 }}
              placeholder={isBalanced ? 'Opsional: tambahkan keterangan...' : 'Wajib: jelaskan mengapa selisih belum balance...'}
              value={reqReason}
              onChange={(e) => setReqReason(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowRequestSolved(false)}>
              Batal
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 2 }}
              onClick={handleRequestSolved}
              disabled={submitting || (!isBalanced && !reqReason.trim())}
            >
              {submitting ? <><span className="spinner" />Mengirim...</> : <><CheckCircle size={16} />Kirim Request</>}
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── Admin: Solve Dialog ──────────────────────────────────────── */}
      <Modal isOpen={showSolve} onClose={() => setShowSolve(false)} title="Selesaikan Issue?">
        <div style={{ marginBottom: 16 }}>
          <span className="issue-id">{issue.issue_id}</span>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>
            {issue.sku}{issue.batch && ` · ${issue.batch}`}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          <div>
            <label className="label" htmlFor="storage_tujuan">Storage Tujuan</label>
            <input id="storage_tujuan" className="input-field" type="text" placeholder="Contoh: RACK-A12"
              value={storageTujuan} onChange={(e) => setStorageTujuan(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="catatan">Catatan (opsional)</label>
            <textarea id="catatan" className="textarea-field" style={{ minHeight: 72 }}
              placeholder="Catatan penyelesaian..."
              value={catatan} onChange={(e) => setCatatan(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowSolve(false)}>Batal</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSolve} disabled={submitting}>
            {submitting ? <><span className="spinner" />Memproses...</> : <><CheckCircle size={16} />Ya, Selesaikan</>}
          </button>
        </div>
      </Modal>

      {/* ─── Admin: Cancel Dialog ─────────────────────────────────────── */}
      <Modal isOpen={showCancel} onClose={() => setShowCancel(false)} title="Batalkan Issue?">
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
            Issue <strong>{issue.issue_id}</strong> akan dibatalkan dan tidak dapat dikembalikan ke OPEN.
          </p>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label className="label" htmlFor="alasan">Alasan (opsional)</label>
          <textarea id="alasan" className="textarea-field" style={{ minHeight: 72 }}
            placeholder="Alasan pembatalan..."
            value={alasan} onChange={(e) => setAlasan(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowCancel(false)}>Batal</button>
          <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleCancel} disabled={submitting}>
            {submitting ? <><span className="spinner" />Memproses...</> : <><XCircle size={16} />Ya, Batalkan</>}
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
    </UserLayout>
  );
}
