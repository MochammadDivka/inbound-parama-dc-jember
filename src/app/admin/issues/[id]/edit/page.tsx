'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useToast } from '@/components/ui/ToastProvider';
import { ISSUE_CATEGORIES, OPTIONAL_SKU_BATCH_CATEGORIES, REQUIRED_BATCH_CATEGORIES } from '@/lib/constants';
import { Issue, IssueCategory } from '@/types';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AdminEditIssuePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchIssue = async () => {
      const res = await fetch(`/api/issues/${params.id}`);
      const data = await res.json();
      if (data.success) {
        const i = data.data as Issue;
        setForm({
          sku: i.sku !== undefined && i.sku !== null ? String(i.sku) : '',
          nama_barang: i.nama_barang ? String(i.nama_barang) : '',
          batch: i.batch !== undefined && i.batch !== null ? String(i.batch) : '',
          hu: i.hu !== undefined && i.hu !== null ? String(i.hu) : '',
          do_number: i.do_number !== undefined && i.do_number !== null ? String(i.do_number) : '',
          qty_system_pcs: String(i.qty_system_pcs ?? ''),
          qty_fisik_pcs: String(i.qty_fisik_pcs ?? ''),
          kategori_issue: i.kategori_issue ? String(i.kategori_issue) : '',
          keterangan: i.keterangan ? String(i.keterangan) : '',
          storage_tujuan: i.storage_tujuan ? String(i.storage_tujuan) : '',
        });
      } else {
        toast.error('Issue tidak ditemukan');
        router.back();
      }
      setLoading(false);
    };
    fetchIssue();
  }, [params.id]);

  const isHURusak = form.kategori_issue === 'HU Rusak';
  const isSKUOptional = isHURusak || OPTIONAL_SKU_BATCH_CATEGORIES.includes(form.kategori_issue as IssueCategory);
  const isBatchRequired = !isHURusak && REQUIRED_BATCH_CATEGORIES.includes(form.kategori_issue as IssueCategory);

  const selisih = (() => {
    const sys = parseFloat(form.qty_system_pcs);
    const fis = parseFloat(form.qty_fisik_pcs);
    if (isNaN(sys) || isNaN(fis)) return null;
    return fis - sys;
  })();

  const handleChange = (field: string, value: string) => {
    setForm((f) => {
      const updatedForm = { ...f, [field]: value };
      
      // Auto-select category if qty_system_pcs or qty_fisik_pcs changes
      if (field === 'qty_system_pcs' || field === 'qty_fisik_pcs') {
        const sys = parseFloat(updatedForm.qty_system_pcs);
        const fis = parseFloat(updatedForm.qty_fisik_pcs);
        if (!isNaN(sys) && !isNaN(fis)) {
          const diff = fis - sys;
          if (diff < 0) {
            updatedForm.kategori_issue = 'Selisih Qty (Kurang)';
          } else if (diff > 0) {
            updatedForm.kategori_issue = 'Selisih Qty (Lebih)';
          }
        }
      }
      
      return updatedForm;
    });

    if (errors[field]) setErrors((e) => { const n = { ...e }; delete n[field]; return n; });
    // Reset kategori-dependent validations
    if (field === 'kategori_issue') {
      setErrors((e) => { const n = { ...e }; delete n.sku; delete n.batch; return n; });
    }
    // Also reset sku/batch error if category changes automatically
    if (field === 'qty_system_pcs' || field === 'qty_fisik_pcs') {
      setErrors((e) => { const n = { ...e }; delete n.sku; delete n.batch; return n; });
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!isSKUOptional && !form.sku?.trim()) errs.sku = 'SKU wajib diisi';
    if (!form.nama_barang?.trim()) errs.nama_barang = 'Nama barang wajib diisi';
    if (!form.qty_system_pcs) errs.qty_system_pcs = 'Qty System wajib diisi';
    if (!form.qty_fisik_pcs) errs.qty_fisik_pcs = 'Qty Fisik wajib diisi';
    if (!form.kategori_issue) errs.kategori_issue = 'Kategori wajib dipilih';
    if (parseFloat(form.qty_system_pcs) < 0) errs.qty_system_pcs = 'Qty tidak boleh negatif';
    if (parseFloat(form.qty_fisik_pcs) < 0) errs.qty_fisik_pcs = 'Qty tidak boleh negatif';
    if (isBatchRequired && !form.batch?.trim()) errs.batch = 'Batch wajib diisi untuk kategori ini';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/issues/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          batch: form.batch?.toUpperCase() ?? '',
          qty_system_pcs: parseFloat(form.qty_system_pcs),
          qty_fisik_pcs: parseFloat(form.qty_fisik_pcs),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Issue berhasil diperbarui!');
        router.push(`/admin/issues/${params.id}`);
      } else {
        toast.error(data.error?.message ?? 'Gagal memperbarui issue');
      }
    } catch {
      toast.error('Periksa koneksi internet Anda');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <AdminLayout>
      <div style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton" style={{ height: 56 }} />)}
      </div>
    </AdminLayout>
  );

  const selisihColor = selisih === null ? 'var(--color-text-muted)'
    : selisih < 0 ? 'var(--color-minus)'
    : selisih > 0 ? 'var(--color-plus)'
    : 'var(--color-zero)';

  return (
    <AdminLayout>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <Link href={`/admin/issues/${params.id}`} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: 14 }}>
          <ArrowLeft size={16} />
          Detail Issue
        </Link>
        <span style={{ color: 'var(--color-text-muted)' }}>/</span>
        <span style={{ fontSize: 14, color: 'var(--color-text)' }}>Edit</span>
      </div>

      <div style={{ maxWidth: 640 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Edit Issue</h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 24 }}>{params.id}</p>

        <div className="card" style={{ padding: 24 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  SKU
                  {!isSKUOptional && <span style={{ color: 'var(--color-danger)' }}>*</span>}
                  {isSKUOptional && <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 400 }}>(opsional)</span>}
                </label>
                <input className={`input-field ${errors.sku ? 'input-error' : ''}`} type="text"
                  placeholder={isSKUOptional ? 'Isi jika diketahui' : 'Kode SKU'}
                  value={form.sku} onChange={(e) => handleChange('sku', e.target.value)} />
                {errors.sku && <p className="error-text">{errors.sku}</p>}
              </div>
              <div>
                <label className="label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  Batch / Lot
                  {isBatchRequired && <span style={{ color: 'var(--color-danger)' }}>*</span>}
                  {!isBatchRequired && <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 400 }}>(opsional)</span>}
                </label>
                <input className={`input-field ${errors.batch ? 'input-error' : ''}`} type="text"
                  placeholder={isBatchRequired ? 'BM13B' : 'Isi jika diketahui'}
                  value={form.batch} onChange={(e) => handleChange('batch', e.target.value)} />
                {errors.batch && <p className="error-text">{errors.batch}</p>}
              </div>
            </div>
            <div>
              <label className="label label-required">Nama Barang</label>
              <input className={`input-field ${errors.nama_barang ? 'input-error' : ''}`} type="text"
                value={form.nama_barang} onChange={(e) => handleChange('nama_barang', e.target.value)} />
              {errors.nama_barang && <p className="error-text">{errors.nama_barang}</p>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="label">HU</label>
                <input className="input-field" type="text" value={form.hu}
                  onChange={(e) => handleChange('hu', e.target.value)} />
              </div>
              <div>
                <label className="label">DO</label>
                <input className="input-field" type="text" value={form.do_number}
                  onChange={(e) => handleChange('do_number', e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="label label-required">Qty System (PCS)</label>
                <input className={`input-field ${errors.qty_system_pcs ? 'input-error' : ''}`}
                  type="number" inputMode="numeric" min="0"
                  value={form.qty_system_pcs} onChange={(e) => handleChange('qty_system_pcs', e.target.value)} />
                {errors.qty_system_pcs && <p className="error-text">{errors.qty_system_pcs}</p>}
              </div>
              <div>
                <label className="label label-required">Qty Fisik (PCS)</label>
                <input className={`input-field ${errors.qty_fisik_pcs ? 'input-error' : ''}`}
                  type="number" inputMode="numeric" min="0"
                  value={form.qty_fisik_pcs} onChange={(e) => handleChange('qty_fisik_pcs', e.target.value)} />
                {errors.qty_fisik_pcs && <p className="error-text">{errors.qty_fisik_pcs}</p>}
              </div>
            </div>
            {selisih !== null && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px',
                background: selisih < 0 ? '#FEF2F2' : selisih > 0 ? '#ECFDF5' : '#F9FAFB',
                borderRadius: 10,
                border: `1px solid ${selisih < 0 ? '#FCA5A5' : selisih > 0 ? '#6EE7B7' : 'var(--color-border)'}`,
              }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Selisih:</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: selisihColor }}>
                  {selisih > 0 ? '+' : ''}{selisih} PCS
                </span>
              </div>
            )}
            <div>
              <label className="label label-required">Kategori Issue</label>
              <select className={`select-field ${errors.kategori_issue ? 'input-error' : ''}`}
                value={form.kategori_issue} onChange={(e) => handleChange('kategori_issue', e.target.value)}>
                {ISSUE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.kategori_issue && <p className="error-text">{errors.kategori_issue}</p>}
            </div>
            <div>
              <label className="label">Keterangan</label>
              <textarea className="textarea-field" value={form.keterangan}
                onChange={(e) => handleChange('keterangan', e.target.value)} />
            </div>
            <div>
              <label className="label">Storage Tujuan</label>
              <input className="input-field" type="text" value={form.storage_tujuan}
                onChange={(e) => handleChange('storage_tujuan', e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <Link href={`/admin/issues/${params.id}`} className="btn btn-ghost" style={{ flex: 1, textDecoration: 'none' }}>
                Batal
              </Link>
              <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={saving}>
                {saving ? <><span className="spinner" />Menyimpan...</> : '💾 Simpan Perubahan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}
