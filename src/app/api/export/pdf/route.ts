import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dsGetIssues } from '@/lib/data-source';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Issue } from '@/types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * GET /api/export/pdf
 * Export filtered issues as PDF landscape A4 — ADMIN/SPV only
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
  if (session.user.role === 'USER')
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Akses ditolak' } }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get('status') ?? 'ALL';
  const kategoriFilter = searchParams.get('kategori') ?? 'ALL';
  const date_from = searchParams.get('date_from') ?? undefined;
  const date_to = searchParams.get('date_to') ?? undefined;

  const result = await dsGetIssues({
    search: searchParams.get('search') ?? undefined,
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
    kategori: kategoriFilter !== 'ALL' ? kategoriFilter : undefined,
    created_by: searchParams.get('created_by') ?? undefined,
    date_from,
    date_to,
    limit: 10000,
    page: 1,
  });

  if (!result.success || !result.data)
    return NextResponse.json({ success: false, error: { code: 'FETCH_ERROR', message: 'Gagal mengambil data' } }, { status: 500 });

  const issues = result.data;
  const safeDate = (s?: string) => {
    if (!s) return '';
    try { return format(new Date(s), 'dd/MM/yy'); } catch { return ''; }
  };

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Header
  const printDate = format(new Date(), 'dd MMMM yyyy, HH:mm', { locale: localeId });
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Laporan Issue Inbound — Parama DC Jember', 14, 15);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Dicetak: ${printDate}  |  Total: ${issues.length} issue`, 14, 21);

  const filterParts: string[] = [];
  if (statusFilter !== 'ALL') filterParts.push(`Status: ${statusFilter}`);
  if (kategoriFilter !== 'ALL') filterParts.push(`Kategori: ${kategoriFilter}`);
  if (date_from) filterParts.push(`Dari: ${date_from}`);
  if (date_to) filterParts.push(`Sampai: ${date_to}`);
  let startY = 25;
  if (filterParts.length) {
    doc.text(`Filter: ${filterParts.join(' | ')}`, 14, 26);
    startY = 30;
  }
  doc.setTextColor(0);

  const tableHead = [['HU', 'SKU', 'Nama Barang', 'Batch', 'DO', 'Sys', 'Fisik', 'Selisih', 'Kategori', 'Status', 'Dibuat Oleh', 'Tgl', 'Storage']];

  const tableBody: string[][] = issues.map((i: Issue) => [
    i.hu ?? '',
    i.sku ?? '',
    i.nama_barang,
    i.batch ?? '',
    i.do_number ?? '',
    String(i.qty_system_pcs),
    String(i.qty_fisik_pcs),
    i.selisih_pcs > 0 ? `+${i.selisih_pcs}` : String(i.selisih_pcs),
    i.kategori_issue,
    i.status,
    i.created_by_name ?? i.created_by,
    safeDate(i.created_at),
    i.storage_tujuan ?? '',
  ]);

  autoTable(doc, {
    head: tableHead,
    body: tableBody,
    startY,
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [26, 86, 219], textColor: 255, fontStyle: 'bold', fontSize: 7 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 22 }, // HU
      2: { cellWidth: 24 }, // Nama Barang
      8: { cellWidth: 24 }, // Kategori
    },
    didParseCell: (data) => {
      if (data.column.index === 7 && data.section === 'body') {
        const val = Number(data.cell.raw);
        if (val < 0) data.cell.styles.textColor = [220, 38, 38];
        else if (val > 0) data.cell.styles.textColor = [5, 150, 105];
        data.cell.styles.fontStyle = 'bold';
      }
      if (data.column.index === 9 && data.section === 'body') {
        const val = String(data.cell.raw);
        if (val === 'OPEN') data.cell.styles.textColor = [217, 119, 6];
        else if (val === 'SOLVED') data.cell.styles.textColor = [5, 150, 105];
        else if (val === 'CANCELLED') data.cell.styles.textColor = [220, 38, 38];
        data.cell.styles.fontStyle = 'bold';
      }
    },
    didDrawPage: (data) => {
      const pageCount = (doc as jsPDF & { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Halaman ${data.pageNumber} dari ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 5,
        { align: 'center' }
      );
    },
  });

  const buffer = Buffer.from(doc.output('arraybuffer'));
  const filename = `Parama_DC_Jember_Issues_${format(new Date(), 'yyyy-MM-dd')}.pdf`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.length),
    },
  });
}
