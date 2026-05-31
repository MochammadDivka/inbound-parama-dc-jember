'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Camera, X, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { UserLayout } from '@/components/layout/UserLayout';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/ToastProvider';
import { ISSUE_CATEGORIES, OPTIONAL_SKU_BATCH_CATEGORIES, REQUIRED_BATCH_CATEGORIES } from '@/lib/constants';
import { IssueCategory } from '@/types';
import Link from 'next/link';
import NextImage from 'next/image';

interface MergeInfo {
  existing_id: string;
  existing_selisih: number;
  existing_remaining: number;
  sku: string;
  batch: string;
}

interface UploadedPhoto {
  file: File;
  previewUrl: string;
  uploadedUrl?: string;
  uploading?: boolean;
  error?: string;
}

const getLocalDatetimeString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const compressImage = (file: File, maxSizeMB = 1): Promise<File> => {
  return new Promise((resolve) => {
    if (file.size <= maxSizeMB * 1024 * 1024) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        const MAX_WIDTH = 1920;
        const MAX_HEIGHT = 1080;
        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          if (width > height) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          } else {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.8;
        const checkAndResolve = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(file);
                return;
              }
              if (blob.size > maxSizeMB * 1024 * 1024 && quality > 0.1) {
                quality -= 0.1;
                checkAndResolve();
              } else {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              }
            },
            'image/jpeg',
            quality
          );
        };
        checkAndResolve();
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

export default function NewIssuePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [mergeInfo, setMergeInfo] = useState<MergeInfo | null>(null);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [checkingDup, setCheckingDup] = useState(false);

  const [form, setForm] = useState({
    sku: '', nama_barang: '', batch: '',
    hu: '', do_number: '',
    qty_system_pcs: '', qty_fisik_pcs: '',
    kategori_issue: '' as IssueCategory | '',
    keterangan: '', storage_tujuan: '',
    created_at: getLocalDatetimeString(),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derived state berdasarkan kategori
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

  // ─── Duplicate / Merge Check ───────────────────────────────────────
  const checkDuplicate = useCallback(async (): Promise<boolean> => {
    if (!form.sku || !form.batch) return false;
    setCheckingDup(true);
    setMergeInfo(null);
    try {
      const res = await fetch(`/api/issues/check-duplicate?sku=${encodeURIComponent(form.sku)}&batch=${encodeURIComponent(form.batch)}`);
      const data = await res.json();
      if (data.success && data.data?.isDuplicate && data.data?.existing_issue) {
        const found = data.data.existing_issue;
        setMergeInfo({
          existing_id: found.issue_id,
          existing_selisih: found.selisih_pcs,
          existing_remaining: found.remaining_selisih_pcs !== undefined && found.remaining_selisih_pcs !== null ? Number(found.remaining_selisih_pcs) : found.selisih_pcs,
          sku: form.sku,
          batch: form.batch.toUpperCase(),
        });
        setShowMergeDialog(true);
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    } finally {
      setCheckingDup(false);
    }
  }, [form.sku, form.batch]);

  // ─── Validate ─────────────────────────────────────────────────────
  const validate = () => {
    const errs: Record<string, string> = {};
    if (!isSKUOptional && !form.sku.trim()) errs.sku = 'SKU wajib diisi';
    if (!form.nama_barang.trim()) errs.nama_barang = 'Nama barang wajib diisi';
    if (!form.qty_system_pcs) errs.qty_system_pcs = 'Qty System wajib diisi';
    if (!form.qty_fisik_pcs) errs.qty_fisik_pcs = 'Qty Fisik wajib diisi';
    if (!form.kategori_issue) errs.kategori_issue = 'Kategori wajib dipilih';
    if (parseFloat(form.qty_system_pcs) < 0) errs.qty_system_pcs = 'Qty tidak boleh negatif';
    if (parseFloat(form.qty_fisik_pcs) < 0) errs.qty_fisik_pcs = 'Qty tidak boleh negatif';
    if (isBatchRequired && !form.batch.trim()) errs.batch = 'Batch wajib diisi untuk kategori ini';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ─── Submit ────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // Tangkal klik ganda instan
    if (!validate()) return;

    setLoading(true); // Kunci loading di awal!

    // Cek duplikat terlebih dahulu jika SKU dan batch ada
    if (form.sku && form.batch && !mergeInfo) {
      const hasDuplicate = await checkDuplicate();
      if (hasDuplicate) {
        setLoading(false); // Reset loading jika duplikat terdeteksi
        return; // merge dialog akan muncul jika duplikat
      }
    }

    // Menggunakan FormData untuk satu request atomic (Temuan 4)
    const fd = new FormData();
    fd.append('sku', form.sku);
    fd.append('nama_barang', form.nama_barang);
    fd.append('batch', form.batch.toUpperCase());
    fd.append('hu', form.hu);
    fd.append('do_number', form.do_number);
    fd.append('qty_system_pcs', form.qty_system_pcs);
    fd.append('qty_fisik_pcs', form.qty_fisik_pcs);
    fd.append('kategori_issue', form.kategori_issue);
    fd.append('keterangan', form.keterangan);
    fd.append('storage_tujuan', form.storage_tujuan);
    if (form.created_at) {
      fd.append('created_at', new Date(form.created_at).toISOString());
    }

    // Append foto jika ada
    photos.forEach((p) => {
      fd.append('photos', p.file);
    });

    try {
      const res = await fetch('/api/issues', {
        method: 'POST',
        body: fd, // Browser otomatis set content-type multipart/form-data + boundary
      });
      const data = await res.json();

      if (data.success) {
        const issueId = data.data.issue_id as string;
        toast.success('Issue berhasil dibuat!');
        router.push(`/issues/${issueId}`);
      } else if (data.error?.code === 'DUPLICATE_ISSUE') {
        // Backend duplicate check — tampilkan merge info
        const dupRes = await fetch(`/api/issues/${data.error.details.existing_id}`);
        const dupData = await dupRes.json();
        if (dupData.success) {
          setMergeInfo({
            existing_id: data.error.details.existing_id as string,
            existing_selisih: dupData.data.selisih_pcs as number,
            existing_remaining: dupData.data.remaining_selisih_pcs !== undefined && dupData.data.remaining_selisih_pcs !== null ? Number(dupData.data.remaining_selisih_pcs) : (dupData.data.selisih_pcs as number),
            sku: form.sku,
            batch: form.batch.toUpperCase(),
          });
          setShowMergeDialog(true);
        }
      } else {
        toast.error(data.error?.message ?? 'Gagal membuat issue');
      }
    } catch {
      toast.error('Periksa koneksi internet Anda');
    } finally {
      setLoading(false);
    }
  };

  // ─── Force Merge ──────────────────────────────────────────────────
  const handleMerge = async () => {
    if (!mergeInfo || !validate()) return;
    setShowMergeDialog(false);
    setLoading(true);

    const newSelisih = parseFloat(form.qty_fisik_pcs) - parseFloat(form.qty_system_pcs);

    try {
      const res = await fetch(`/api/issues/${mergeInfo.existing_id}/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_qty_system: parseFloat(form.qty_system_pcs),
          new_qty_fisik: parseFloat(form.qty_fisik_pcs),
          new_selisih: newSelisih,
          keterangan: form.keterangan,
        }),
      });
      const data = await res.json();

      if (data.success) {
        if (data.data?.balanced) {
          toast.success(`✅ Merge berhasil! Issue ${mergeInfo.existing_id} sekarang balance (0 PCS).`);
          router.push(`/issues/${mergeInfo.existing_id}?requestSolved=true`);
        } else {
          toast.success(`Merge berhasil! Sisa selisih: ${data.data?.remaining_selisih_pcs} PCS`);
          router.push(`/issues/${mergeInfo.existing_id}`);
        }
      } else {
        toast.error(data.error?.message ?? 'Merge gagal');
      }
    } catch {
      toast.error('Periksa koneksi internet Anda');
    } finally {
      setLoading(false);
    }
  };

  // ─── Photo handlers ────────────────────────────────────────────────
  const handlePhotoAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const newPhotos: UploadedPhoto[] = [];
    for (const f of files) {
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`"${f.name}" melebihi batas 5MB`);
        continue;
      }
      let fileToUpload = f;
      if (f.size > 1 * 1024 * 1024) {
        toast.info(`Mengompresi "${f.name}" ke < 1MB...`);
        try {
          fileToUpload = await compressImage(f, 0.9);
          toast.success(`"${f.name}" berhasil dikompresi (${(fileToUpload.size / 1024 / 1024).toFixed(2)} MB)`);
        } catch (err) {
          console.error('Gagal mengompresi gambar:', err);
        }
      }
      newPhotos.push({ file: fileToUpload, previewUrl: URL.createObjectURL(fileToUpload) });
    }
    setPhotos((prev) => [...prev, ...newPhotos].slice(0, 3));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePhoto = (idx: number) => {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[idx].previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const selisihColor = selisih === null ? 'var(--color-text-muted)'
    : selisih < 0 ? 'var(--color-minus)'
    : selisih > 0 ? 'var(--color-plus)'
    : 'var(--color-zero)';

  // Prediksi selisih setelah merge
  const mergeRemaining = mergeInfo && selisih !== null
    ? mergeInfo.existing_remaining + selisih
    : null;

  return (
    <UserLayout>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, marginLeft: -8, color: 'var(--color-text)', display: 'flex' }}
        >
          <ArrowLeft size={22} />
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Buat Issue Baru</h1>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 100 }}>

        {/* Kategori — pertama agar label dinamis */}
        <div>
          <label className="label label-required" htmlFor="kategori">Kategori Issue</label>
          <select id="kategori" className={`select-field ${errors.kategori_issue ? 'input-error' : ''}`}
            value={form.kategori_issue}
            onChange={(e) => handleChange('kategori_issue', e.target.value)}>
            <option value="">Pilih kategori issue...</option>
            {ISSUE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {errors.kategori_issue && <p className="error-text">{errors.kategori_issue}</p>}
        </div>

        {/* Banner info HU Rusak */}
        {isHURusak && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            background: '#EFF6FF', border: '1px solid #BFDBFE',
            borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#1D4ED8',
          }}>
            <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>Untuk kategori <strong>HU Rusak</strong>, SKU dan Batch bersifat opsional karena detail barang mungkin belum dapat dibaca.</span>
          </div>
        )}

        {/* SKU */}
        <div>
          <label className="label" htmlFor="sku" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            SKU
            {!isSKUOptional && <span style={{ color: 'var(--color-danger)' }}>*</span>}
            {isSKUOptional && <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 400 }}>(opsional)</span>}
          </label>
          <input id="sku" className={`input-field ${errors.sku ? 'input-error' : ''}`}
            type="text"
            placeholder={isSKUOptional ? 'Isi jika diketahui' : 'Kode SKU produk'}
            value={form.sku}
            onChange={(e) => handleChange('sku', e.target.value)} />
          {errors.sku && <p className="error-text">{errors.sku}</p>}
        </div>

        {/* Nama Barang */}
        <div>
          <label className="label label-required" htmlFor="nama_barang">Nama Barang</label>
          <input id="nama_barang" className={`input-field ${errors.nama_barang ? 'input-error' : ''}`}
            type="text" placeholder="Nama produk"
            value={form.nama_barang}
            onChange={(e) => handleChange('nama_barang', e.target.value)} />
          {errors.nama_barang && <p className="error-text">{errors.nama_barang}</p>}
        </div>

        {/* Batch */}
        <div>
          <label className="label" htmlFor="batch" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            Batch / Lot
            {isBatchRequired && <span style={{ color: 'var(--color-danger)' }}>*</span>}
            {!isBatchRequired && !isHURusak && <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 400 }}>(opsional)</span>}
            {isHURusak && <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 400 }}>(opsional)</span>}
          </label>
          <input id="batch" className={`input-field ${errors.batch ? 'input-error' : ''}`}
            type="text"
            placeholder={isHURusak ? 'Isi jika diketahui' : 'Contoh: BM13B'}
            value={form.batch}
            onChange={(e) => handleChange('batch', e.target.value.toUpperCase())}
            onPaste={(e) => {
              e.preventDefault();
              const pasted = e.clipboardData.getData('text').toUpperCase();
              handleChange('batch', pasted);
            }}
            onBlur={checkDuplicate} />
          {checkingDup && <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>⏳ Memeriksa duplikat...</p>}
          {errors.batch && <p className="error-text">{errors.batch}</p>}
        </div>

        {/* HU + DO */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="label" htmlFor="hu">HU</label>
            <input id="hu" className="input-field" type="text" placeholder="Handling Unit"
              value={form.hu} onChange={(e) => handleChange('hu', e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="do_number">DO</label>
            <input id="do_number" className="input-field" type="text" placeholder="Delivery Order"
              value={form.do_number} onChange={(e) => handleChange('do_number', e.target.value)} />
          </div>
        </div>

        {/* Qty System & Fisik */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="label label-required" htmlFor="qty_system">Qty System (PCS)</label>
            <input id="qty_system" className={`input-field ${errors.qty_system_pcs ? 'input-error' : ''}`}
              type="number" inputMode="numeric" placeholder="Qty sistem" min="0"
              value={form.qty_system_pcs}
              onChange={(e) => handleChange('qty_system_pcs', e.target.value)} />
            {errors.qty_system_pcs && <p className="error-text">{errors.qty_system_pcs}</p>}
          </div>
          <div>
            <label className="label label-required" htmlFor="qty_fisik">Qty Fisik (PCS)</label>
            <input id="qty_fisik" className={`input-field ${errors.qty_fisik_pcs ? 'input-error' : ''}`}
              type="number" inputMode="numeric" placeholder="Qty aktual" min="0"
              value={form.qty_fisik_pcs}
              onChange={(e) => handleChange('qty_fisik_pcs', e.target.value)} />
            {errors.qty_fisik_pcs && <p className="error-text">{errors.qty_fisik_pcs}</p>}
          </div>
        </div>

        {/* Selisih auto-calc */}
        {selisih !== null && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 16px',
            background: selisih < 0 ? '#FEF2F2' : selisih > 0 ? '#ECFDF5' : '#F0FDF4',
            borderRadius: 10,
            border: `1px solid ${selisih < 0 ? '#FCA5A5' : selisih > 0 ? '#6EE7B7' : '#86EFAC'}`,
          }}>
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Selisih:</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: selisihColor }}>
              {selisih > 0 ? '+' : ''}{selisih} PCS
            </span>
            {selisih === 0 && <CheckCircle size={18} color="#16A34A" />}
          </div>
        )}

        {/* Keterangan */}
        <div>
          <label className="label" htmlFor="keterangan">Keterangan</label>
          <textarea id="keterangan" className="textarea-field"
            placeholder="Deskripsi tambahan (opsional)"
            value={form.keterangan}
            onChange={(e) => handleChange('keterangan', e.target.value)} />
        </div>

        {/* Storage Tujuan */}
        <div>
          <label className="label" htmlFor="storage">Storage Tujuan</label>
          <input id="storage" className="input-field" type="text" placeholder="Lokasi tujuan (opsional)"
            value={form.storage_tujuan}
            onChange={(e) => handleChange('storage_tujuan', e.target.value)} />
        </div>

        {/* Tanggal Pembuatan (Kustom) */}
        <div>
          <label className="label" htmlFor="created_at">Tanggal & Waktu Pembuatan (Kustom)</label>
          <input id="created_at" className="input-field" type="datetime-local"
            value={form.created_at}
            onChange={(e) => handleChange('created_at', e.target.value)} />
        </div>

        {/* Photo Upload */}
        <div>
          <label className="label">Foto Bukti (opsional, maks 3)</label>
          <div className="photo-grid">
            {photos.map((photo, idx) => (
              <div key={idx} style={{ position: 'relative' }}>
                <NextImage
                  src={photo.previewUrl}
                  alt={`Foto ${idx + 1}`}
                  width={80}
                  height={80}
                  unoptimized
                  className="photo-thumb"
                  style={{ opacity: photo.uploading ? 0.5 : 1, width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {photo.uploading && (
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.3)', borderRadius: 6,
                  }}>
                    <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                  </div>
                )}
                {photo.error && (
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', background: 'rgba(220,38,38,0.15)', borderRadius: 6,
                  }}>
                    <AlertTriangle size={18} color="#DC2626" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removePhoto(idx)}
                  style={{
                    position: 'absolute', top: -8, right: -8,
                    width: 22, height: 22, borderRadius: '50%',
                    background: 'var(--color-danger)', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {photos.length < 3 && (
              <label className="photo-add-btn" htmlFor="photo-input">
                <Camera size={24} />
                <span>Foto</span>
                <input
                  ref={fileInputRef}
                  id="photo-input"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  hidden
                  onChange={handlePhotoAdd}
                />
              </label>
            )}
          </div>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 6 }}>
            Max 3 foto · Max 5MB per foto · JPG, PNG, WEBP
          </p>
        </div>
      </form>

      {/* Sticky submit */}
      <div className="sticky-bottom" style={{ margin: '0 -16px' }}>
        <button
          className="btn btn-primary btn-lg"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? <><span className="spinner" /> Menyimpan...</> : '💾 SIMPAN ISSUE'}
        </button>
      </div>

      {/* ─── Merge Dialog ─────────────────────────────────────────────── */}
      <Modal
        isOpen={showMergeDialog}
        onClose={() => { setShowMergeDialog(false); setMergeInfo(null); }}
        title="⚠️ Issue Sudah Ada — Merge?"
      >
        {mergeInfo && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 8, padding: 14, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Issue</span>
                <Link href={`/issues/${mergeInfo.existing_id}`} style={{ color: 'var(--color-primary)', fontWeight: 700, fontFamily: 'monospace' }}>
                  {mergeInfo.existing_id}
                </Link>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: 'var(--color-text-muted)' }}>SKU · Batch</span>
                <span style={{ fontWeight: 600 }}>{mergeInfo.sku} · {mergeInfo.batch}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Selisih saat ini</span>
                <span style={{ fontWeight: 700, color: mergeInfo.existing_remaining < 0 ? 'var(--color-minus)' : 'var(--color-plus)' }}>
                  {mergeInfo.existing_remaining > 0 ? '+' : ''}{mergeInfo.existing_remaining} PCS
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Input baru</span>
                <span style={{ fontWeight: 700, color: (selisih ?? 0) < 0 ? 'var(--color-minus)' : 'var(--color-plus)' }}>
                  {selisih !== null ? ((selisih > 0 ? '+' : '') + selisih + ' PCS') : '-'}
                </span>
              </div>
              <div style={{ borderTop: '1px solid #FCD34D', paddingTop: 8, marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700 }}>Hasil setelah merge</span>
                <span style={{
                  fontWeight: 800, fontSize: 16,
                  color: mergeRemaining === 0 ? '#16A34A' : (mergeRemaining ?? 0) < 0 ? 'var(--color-minus)' : 'var(--color-plus)',
                }}>
                  {mergeRemaining !== null ? ((mergeRemaining > 0 ? '+' : '') + mergeRemaining + ' PCS') : '-'}
                  {mergeRemaining === 0 && ' ✅'}
                </span>
              </div>
            </div>

            {mergeRemaining === 0 && (
              <div style={{
                display: 'flex', gap: 8, alignItems: 'center',
                background: '#F0FDF4', border: '1px solid #86EFAC',
                borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#16A34A',
              }}>
                <CheckCircle size={16} />
                <span>Setelah merge, issue akan balance! Kamu bisa request solved setelahnya.</span>
              </div>
            )}

            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
              Data baru akan digabungkan ke issue yang sudah ada. Riwayat merge tercatat otomatis.
            </p>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn btn-ghost"
                style={{ flex: 1 }}
                onClick={() => { setShowMergeDialog(false); setMergeInfo(null); }}
              >
                Batal
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 2 }}
                onClick={handleMerge}
                disabled={loading}
              >
                {loading ? <><span className="spinner" />Memproses...</> : <><CheckCircle size={16} />Merge ke Issue Ini</>}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </UserLayout>
  );
}
