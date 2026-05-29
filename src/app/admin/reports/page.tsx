'use client';

import { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useToast } from '@/components/ui/ToastProvider';
import { FileSpreadsheet, FileText, Filter, Settings } from 'lucide-react';

interface ColumnConfig {
  key: string;
  label: string;
  pdfLabel: string;
  getValue: (item: any) => string | number;
}

const EXPORT_COLUMNS: ColumnConfig[] = [
  { key: 'hu', label: 'HU', pdfLabel: 'HU', getValue: (i) => i.hu ?? '—' },
  { key: 'do_number', label: 'DO', pdfLabel: 'DO', getValue: (i) => i.do_number ?? '—' },
  { key: 'sku', label: 'SKU', pdfLabel: 'SKU', getValue: (i) => i.sku ?? '—' },
  { key: 'nama_barang', label: 'Nama Barang', pdfLabel: 'Nama Barang', getValue: (i) => i.nama_barang ?? '' },
  { key: 'batch', label: 'Batch', pdfLabel: 'Batch', getValue: (i) => i.batch ?? '—' },
  { key: 'qty_system_pcs', label: 'Qty System (PCS)', pdfLabel: 'Sys', getValue: (i) => i.qty_system_pcs ?? 0 },
  { key: 'qty_fisik_pcs', label: 'Qty Fisik (PCS)', pdfLabel: 'Fisik', getValue: (i) => i.qty_fisik_pcs ?? 0 },
  { key: 'selisih_pcs', label: 'Selisih (PCS)', pdfLabel: 'Selisih', getValue: (i) => (i.selisih_pcs > 0 ? '+' : '') + i.selisih_pcs },
  { key: 'kategori_issue', label: 'Kategori', pdfLabel: 'Kategori', getValue: (i) => i.kategori_issue ?? '' },
  { key: 'keterangan', label: 'Keterangan', pdfLabel: 'Keterangan', getValue: (i) => i.keterangan ?? '—' },
  { key: 'status', label: 'Status', pdfLabel: 'Status', getValue: (i) => i.status ?? '' },
  { key: 'storage_tujuan', label: 'Storage Tujuan', pdfLabel: 'Storage', getValue: (i) => i.storage_tujuan ?? '—' },
  { key: 'created_by', label: 'Dibuat Oleh', pdfLabel: 'Dibuat', getValue: (i) => i.created_by_name ?? i.created_by ?? '—' },
  { key: 'created_at', label: 'Dibuat Pada', pdfLabel: 'Tanggal', getValue: (i) => i.created_at ? new Date(i.created_at).toLocaleDateString('id-ID') : '—' },
  { key: 'solved_by', label: 'Diselesaikan Oleh', pdfLabel: 'Diselesaikan', getValue: (i) => i.solved_by_name ?? i.solved_by ?? '—' },
  { key: 'solved_at', label: 'Diselesaikan Pada', pdfLabel: 'Tgl Selesai', getValue: (i) => i.solved_at ? new Date(i.solved_at).toLocaleDateString('id-ID') : '—' },
];

export default function AdminReportsPage() {
  const toast = useToast();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [exporting, setExporting] = useState<string | null>(null);
  
  // State for column selection — all checked by default
  const [selectedKeys, setSelectedKeys] = useState<string[]>(EXPORT_COLUMNS.map(col => col.key));

  const handleExportExcel = async () => {
    if (selectedKeys.length === 0) {
      toast.error('Pilih minimal satu kolom untuk diekspor!');
      return;
    }

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
      
      const rows = issues.map((i: any) => {
        const row: any = {};
        EXPORT_COLUMNS.forEach(col => {
          if (selectedKeys.includes(col.key)) {
            row[col.label] = col.getValue(i);
          }
        });
        return row;
      });
      
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
    if (selectedKeys.length === 0) {
      toast.error('Pilih minimal satu kolom untuk diekspor!');
      return;
    }

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
      
      const headers = EXPORT_COLUMNS.filter(col => selectedKeys.includes(col.key)).map(col => col.pdfLabel);
      const rows = data.data.map((i: any) => 
        EXPORT_COLUMNS.filter(col => selectedKeys.includes(col.key)).map(col => String(col.getValue(i)))
      );
      
      autoTable(doc, {
        startY: 38,
        head: [headers],
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

  const handleToggleColumn = (key: string) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
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

        {/* Right side: Column Selection & Export Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Column Selection Card */}
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Settings size={18} color="var(--color-primary)" />
              Pilih Kolom Laporan
            </h2>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>
              Pilih kolom apa saja yang ingin Anda sertakan di dalam file ekspor Excel atau PDF.
            </p>
            
            {/* Quick selectors */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <button 
                className="btn btn-ghost btn-sm" 
                onClick={() => setSelectedKeys(EXPORT_COLUMNS.map(c => c.key))}
                style={{ fontSize: 12 }}
              >
                Pilih Semua
              </button>
              <button 
                className="btn btn-ghost btn-sm" 
                onClick={() => setSelectedKeys(['hu', 'sku', 'nama_barang', 'selisih_pcs', 'status', 'created_at'])}
                style={{ fontSize: 12 }}
              >
                Default (Utama)
              </button>
              <button 
                className="btn btn-ghost btn-sm" 
                onClick={() => setSelectedKeys([])}
                style={{ fontSize: 12, color: 'var(--color-open)' }}
              >
                Kosongkan
              </button>
            </div>

            {/* Checkbox Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 12,
              padding: 16,
              background: '#F9FAFB',
              borderRadius: 10,
              border: '1px solid var(--color-border)',
            }}>
              {EXPORT_COLUMNS.map(col => {
                const checked = selectedKeys.includes(col.key);
                return (
                  <label 
                    key={col.key} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 8, 
                      cursor: 'pointer', 
                      fontSize: 13, 
                      userSelect: 'none',
                      padding: '4px 6px',
                      borderRadius: 6,
                      background: checked ? '#EFF6FF' : 'transparent',
                      border: checked ? '1px solid #BFDBFE' : '1px solid transparent',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleColumn(col.key)}
                      style={{ width: 15, height: 15, cursor: 'pointer' }}
                    />
                    <span style={{ 
                      fontWeight: checked ? 600 : 400, 
                      color: checked ? '#1E40AF' : 'var(--color-text-secondary)' 
                    }}>
                      {col.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Export Action Card */}
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Export Data</h2>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>
              Data yang diexport mengikuti filter yang dipilih di panel kiri dan pilihan kolom di atas.
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
            <strong>ℹ️ Catatan Ekspor Laporan:</strong>
            <ul style={{ marginTop: 8, paddingLeft: 18 }}>
              <li>Ekspor PDF diatur secara otomatis ke mode lanskap A4.</li>
              <li>Kolom tabel yang panjang akan menyesuaikan lebar secara proporsional.</li>
              <li>Anda dapat menyaring status dan rentang waktu sebelum mengekspor data.</li>
            </ul>
            <p style={{ marginTop: 8 }}>
              ⚠️ Foto bukti tidak disertakan dalam export file ini demi menghemat ukuran dokumen.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
