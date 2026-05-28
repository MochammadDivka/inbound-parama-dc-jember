'use client';

import { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useToast } from '@/components/ui/ToastProvider';
import { FileSpreadsheet, FileText, Download, Filter } from 'lucide-react';

export default function AdminReportsPage() {
  const toast = useToast();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExportExcel = async () => {
    setExporting('excel');
    toast.info('Mempersiapkan export Excel...');
    
    // Build query params matching current filters
    const params = new URLSearchParams();
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    params.set('limit', '1000');
    
    const res = await fetch(`/api/issues?${params}`);
    const data = await res.json();
    
    if (!data.success) {
      toast.error('Gagal mengambil data');
      setExporting(null);
      return;
    }
    
    // Dynamic import xlsx
    try {
      const XLSX = await import('xlsx');
      const issues = data.data;
      
      const rows = issues.map((i: any) => ({
        'Issue ID': i.issue_id,
        'HU': i.hu ?? '',
        'DO': i.do_number ?? '',
        'SKU': i.sku,
        'Nama Barang': i.nama_barang,
        'Batch': i.batch ?? '',
        'Qty System (PCS)': i.qty_system_pcs,
        'Qty Fisik (PCS)': i.qty_fisik_pcs,
        'Selisih (PCS)': i.selisih_pcs,
        'Kategori': i.kategori_issue,
        'Keterangan': i.keterangan ?? '',
        'Status': i.status,
        'Storage Tujuan': i.storage_tujuan ?? '',
        'Dibuat Oleh': i.created_by_name ?? i.created_by,
        'Dibuat Pada': i.created_at ? new Date(i.created_at).toLocaleString('id-ID') : '',
        'Diselesaikan Oleh': i.solved_by_name ?? i.solved_by ?? '',
        'Diselesaikan Pada': i.solved_at ? new Date(i.solved_at).toLocaleString('id-ID') : '',
      }));
      
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Issues');
      
      const today = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `Parama_DC_Jember_Issues_${today}.xlsx`);
      toast.success('Export Excel berhasil!');
    } catch (err) {
      toast.error('Gagal membuat file Excel');
    } finally {
      setExporting(null);
    }
  };

  const handleExportPDF = async () => {
    setExporting('pdf');
    toast.info('Mempersiapkan export PDF...');
    
    const params = new URLSearchParams();
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    params.set('limit', '1000');
    
    const res = await fetch(`/api/issues?${params}`);
    const data = await res.json();
    
    if (!data.success) {
      toast.error('Gagal mengambil data');
      setExporting(null);
      return;
    }
    
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      
      // Header
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Parama DC Jember — Inbound Issue Tracking System', 14, 18);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Laporan Issues | Dicetak: ${today}`, 14, 26);
      if (statusFilter !== 'ALL') doc.text(`Filter Status: ${statusFilter}`, 14, 32);
      
      const rows = data.data.map((i: any) => [
        i.issue_id,
        i.sku,
        i.nama_barang,
        i.batch ?? '',
        i.hu ?? '',
        i.do_number ?? '',
        String(i.qty_system_pcs),
        String(i.qty_fisik_pcs),
        (i.selisih_pcs > 0 ? '+' : '') + i.selisih_pcs,
        i.kategori_issue,
        i.status,
        i.created_by_name ?? i.created_by,
        i.created_at ? new Date(i.created_at).toLocaleDateString('id-ID') : '',
      ]);
      
      autoTable(doc, {
        startY: 38,
        head: [['Issue ID', 'SKU', 'Nama Barang', 'Batch', 'HU', 'DO', 'Sys', 'Fisik', 'Selisih', 'Kategori', 'Status', 'Dibuat', 'Tanggal']],
        body: rows,
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [26, 86, 219], textColor: 255, fontStyle: 'bold', fontSize: 7 },
        alternateRowStyles: { fillColor: [249, 250, 251] },
      });
      
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Halaman ${i} dari ${pageCount}`, doc.internal.pageSize.width - 40, doc.internal.pageSize.height - 10);
      }
      
      const today2 = new Date().toISOString().split('T')[0];
      doc.save(`Parama_DC_Jember_Issues_${today2}.pdf`);
      toast.success('Export PDF berhasil!');
    } catch (err) {
      toast.error('Gagal membuat file PDF');
      console.error(err);
    } finally {
      setExporting(null);
    }
  };



  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports & Export</h1>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginTop: 2 }}>
            Export dan cetak laporan issue
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24, alignItems: 'start' }}>
        {/* Filter Panel */}
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={18} />
            Filter Data
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="label">Status</label>
              <select className="select-field" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="ALL">Semua Status</option>
                <option value="OPEN">Open</option>
                <option value="SOLVED">Selesai</option>
                <option value="CANCELLED">Dibatalkan</option>
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
            <button className="btn btn-ghost btn-sm" onClick={() => { setStatusFilter('ALL'); setDateFrom(''); setDateTo(''); }}>
              Reset Filter
            </button>
          </div>
        </div>

        {/* Export Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Export Data</h2>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>
              Data yang diexport mengikuti filter yang dipilih di panel kiri.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {/* Excel */}
              <button
                className="btn btn-ghost"
                style={{ flexDirection: 'column', height: 'auto', padding: '20px 16px', gap: 10, border: '2px solid #D1FAE5', background: '#F0FDF4' }}
                onClick={handleExportExcel}
                disabled={exporting === 'excel'}
              >
                {exporting === 'excel' ? (
                  <span className="spinner spinner-dark" style={{ width: 28, height: 28 }} />
                ) : (
                  <FileSpreadsheet size={28} color="#059669" />
                )}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#065F46' }}>Export Excel</div>
                  <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>.xlsx format</div>
                </div>
              </button>

              {/* PDF */}
              <button
                className="btn btn-ghost"
                style={{ flexDirection: 'column', height: 'auto', padding: '20px 16px', gap: 10, border: '2px solid #FECACA', background: '#FFF5F5' }}
                onClick={handleExportPDF}
                disabled={exporting === 'pdf'}
              >
                {exporting === 'pdf' ? (
                  <span className="spinner spinner-dark" style={{ width: 28, height: 28 }} />
                ) : (
                  <FileText size={28} color="#DC2626" />
                )}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#991B1B' }}>Export PDF</div>
                  <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>.pdf format</div>
                </div>
              </button>
            </div>
          </div>

          {/* Info */}
          <div style={{
            background: '#EFF6FF', border: '1px solid #BFDBFE',
            borderRadius: 12, padding: '16px 20px',
            fontSize: 13, color: '#1E40AF', lineHeight: 1.7,
          }}>
            <strong>ℹ️ Yang disertakan dalam export:</strong>
            <ul style={{ marginTop: 8, paddingLeft: 18 }}>
              <li>Issue ID, HU, DO, SKU, Nama Barang, Batch</li>
              <li>Qty System, Qty Fisik, Selisih</li>
              <li>Kategori, Keterangan, Status</li>
              <li>Dibuat Oleh & Tanggal</li>
              <li>Diselesaikan Oleh & Tanggal (jika ada)</li>
              <li>Storage Tujuan</li>
            </ul>
            <p style={{ marginTop: 8 }}>
              ⚠️ Foto bukti tidak disertakan dalam export.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
