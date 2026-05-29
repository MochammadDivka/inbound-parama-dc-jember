'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertTriangle, ExternalLink } from 'lucide-react';
import { UserLayout } from '@/components/layout/UserLayout';
import { useToast } from '@/components/ui/ToastProvider';
import { CZRecord } from '@/types';
import Link from 'next/link';

export default function EditCZPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkingDup, setCheckingDup] = useState(false);
  const [duplicate, setDuplicate] = useState<{ existing_id: string; sku: string; batch: string } | null>(null);
  const [form, setForm] = useState({
    sku: '',
    nama_barang: '',
    batch: '',
    hu: '',
    do_number: '',
    qty_pcs: '',
    keterangan: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const checkDuplicate = async (skuVal: string) => {
    const s = skuVal.trim();
    if (!s) {
      setDuplicate(null);
      return;
    }
    setCheckingDup(true);
    try {
      const res = await fetch(`/api/cz/check-duplicate?sku=${encodeURIComponent(s)}&exclude_id=${encodeURIComponent(params.id)}`);
      const data = await res.json();
      if (data.success && data.data.isDuplicate) {
        setDuplicate({
          existing_id: data.data.existing_id,
          sku: s,
          batch: ''
        });
        toast.warning('CZ duplikat terdeteksi! SKU ini sudah ada di record OPEN lainnya.');
      } else {
        setDuplicate(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingDup(false);
    }
  };

  useEffect(() => {
    const fetchCZ = async () => {
      try {
        const res = await fetch(`/api/cz/${params.id}`);
        const data = await res.json();
        if (data.success && data.data) {
          const c = data.data as CZRecord;
          setForm({
            sku: c.sku !== undefined && c.sku !== null ? String(c.sku) : '',
            nama_barang: c.nama_barang ? String(c.nama_barang) : '',
            batch: c.batch !== undefined && c.batch !== null ? String(c.batch) : '',
            hu: c.hu !== undefined && c.hu !== null ? String(c.hu) : '',
            do_number: c.do_number !== undefined && c.do_number !== null ? String(c.do_number) : '',
            qty_pcs: String(c.qty_pcs ?? ''),
            keterangan: c.keterangan ? String(c.keterangan) : '',
          });
        } else {
          toast.error('CZ record tidak ditemukan');
          router.back();
        }
      } catch (err) {
        toast.error('Gagal mengambil data CZ');
        router.back();
      } finally {
        setLoading(false);
      }
    };
    
    fetchCZ();
  }, [params.id]);

  const handleChange = (field: string, value: string) => {
    const finalValue = field === 'batch' ? value.toUpperCase() : value;
    setForm((f) => ({ ...f, [field]: finalValue }));
    if (errors[field]) setErrors((e) => { const n = { ...e }; delete n[field]; return n; });
    if (field === 'sku') {
      setDuplicate(null);
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.sku.trim()) errs.sku = 'SKU wajib diisi';
    if (!form.nama_barang.trim()) errs.nama_barang = 'Nama barang wajib diisi';
    if (!form.batch.trim()) errs.batch = 'Batch wajib diisi';
    if (!form.qty_pcs) errs.qty_pcs = 'Qty wajib diisi';
    if (parseFloat(form.qty_pcs) < 0) errs.qty_pcs = 'Qty tidak boleh negatif';

    if (duplicate && duplicate.sku.trim().toLowerCase() === form.sku.trim().toLowerCase()) {
      errs.sku = 'CZ record dengan SKU ini sudah ada dan aktif (OPEN).';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/cz/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          batch: form.batch.trim().toUpperCase(),
          qty_pcs: parseFloat(form.qty_pcs),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('CZ record berhasil diperbarui!');
        router.push('/cz');
      } else if (data.error?.code === 'DUPLICATE_CZ') {
        setDuplicate({
          existing_id: data.error.details?.existing_id ?? '',
          sku: form.sku,
          batch: ''
        });
        toast.warning('CZ duplikat terdeteksi!');
      } else {
        toast.error(data.error?.message ?? 'Gagal memperbarui CZ record');
      }
    } catch {
      toast.error('Periksa koneksi internet Anda');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <UserLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 60 }} />)}
      </div>
    </UserLayout>
  );

  return (
    <UserLayout>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => router.back()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, marginLeft: -8, display: 'flex', color: 'var(--color-text)' }}>
          <ArrowLeft size={22} />
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Edit CZ Record</h1>
        <span className="issue-id" style={{ marginLeft: 'auto', fontSize: 12 }}>{params.id}</span>
      </div>

      {duplicate && (
        <div className="duplicate-warning" style={{ marginBottom: 16 }}>
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <strong>⚠️ CZ Duplikat</strong>
            <p style={{ marginTop: 4 }}>SKU <strong>{duplicate.sku}</strong> sudah ada dengan status OPEN.</p>
            <Link href={`/cz/${duplicate.existing_id}/edit`} style={{ color: 'var(--color-primary)', fontSize: 13, fontWeight: 600, marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <ExternalLink size={13} />
              Lihat {duplicate.existing_id}
            </Link>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label className="label label-required">SKU</label>
          <div style={{ position: 'relative' }}>
            <input className={`input-field ${errors.sku ? 'input-error' : ''}`} type="text"
              placeholder="Kode SKU" value={form.sku} 
              onChange={(e) => handleChange('sku', e.target.value)}
              onBlur={() => checkDuplicate(form.sku)} />
            {checkingDup && (
              <span className="spinner" style={{ position: 'absolute', right: 12, top: 12, width: 16, height: 16 }} />
            )}
          </div>
          {errors.sku && <p className="error-text">{errors.sku}</p>}
        </div>
        
        <div>
          <label className="label label-required">Nama Barang</label>
          <input className={`input-field ${errors.nama_barang ? 'input-error' : ''}`} type="text"
            placeholder="Nama produk" value={form.nama_barang} onChange={(e) => handleChange('nama_barang', e.target.value)} />
          {errors.nama_barang && <p className="error-text">{errors.nama_barang}</p>}
        </div>
        
        <div>
          <label className="label label-required">Batch / Lot</label>
          <input className={`input-field ${errors.batch ? 'input-error' : ''}`} type="text"
            placeholder="Nomor batch" value={form.batch} 
            onChange={(e) => handleChange('batch', e.target.value)} />
          {errors.batch && <p className="error-text">{errors.batch}</p>}
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="label">HU</label>
            <input className="input-field" type="text" placeholder="HU"
              value={form.hu} onChange={(e) => handleChange('hu', e.target.value)} />
          </div>
          <div>
            <label className="label">DO</label>
            <input className="input-field" type="text" placeholder="DO"
              value={form.do_number} onChange={(e) => handleChange('do_number', e.target.value)} />
          </div>
        </div>
        
        <div>
          <label className="label label-required">Qty (PCS)</label>
          <input className={`input-field ${errors.qty_pcs ? 'input-error' : ''}`}
            type="number" inputMode="numeric" min="0" placeholder="Jumlah PCS"
            value={form.qty_pcs} onChange={(e) => handleChange('qty_pcs', e.target.value)} />
          {errors.qty_pcs && <p className="error-text">{errors.qty_pcs}</p>}
        </div>
        
        <div>
          <label className="label">Keterangan</label>
          <textarea className="textarea-field" placeholder="Keterangan tambahan (opsional)"
            value={form.keterangan} onChange={(e) => handleChange('keterangan', e.target.value)} />
        </div>
        
        <div style={{ height: 80 }} />
      </form>

      <div className="sticky-bottom" style={{ margin: '0 -16px' }}>
        <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={saving}>
          {saving ? <><span className="spinner" />Menyimpan...</> : '💾 SIMPAN PERUBAHAN'}
        </button>
      </div>
    </UserLayout>
  );
}
