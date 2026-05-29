import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dsGetIssues } from '@/lib/data-source';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Issue } from '@/types';
import * as XLSX from 'xlsx';

/**
 * GET /api/export/excel
 * Export filtered issues as .xlsx — ADMIN/SPV only
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
  if (session.user.role === 'USER')
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Akses ditolak' } }, { status: 403 });

  const { searchParams } = new URL(request.url);

  // Fetch all matching issues (no pagination for export)
  const result = await dsGetIssues({
    search: searchParams.get('search') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    kategori: searchParams.get('kategori') ?? undefined,
    created_by: searchParams.get('created_by') ?? undefined,
    date_from: searchParams.get('date_from') ?? undefined,
    date_to: searchParams.get('date_to') ?? undefined,
    limit: 10000,
    page: 1,
  });

  if (!result.success || !result.data) {
    return NextResponse.json({ success: false, error: { code: 'FETCH_ERROR', message: 'Gagal mengambil data' } }, { status: 500 });
  }

  const issues = result.data;

  // Fallback jika data kosong
  if (issues.length === 0) {
    return NextResponse.json({ success: false, error: { code: 'NO_DATA', message: 'Tidak ada data untuk diekspor' } }, { status: 404 });
  }

  const safeDate = (s?: string) => {
    if (!s) return '';
    try { return format(new Date(s), 'dd/MM/yyyy HH:mm', { locale: localeId }); } catch { return s; }
  };

  const rows = issues.map((i: Issue) => ({
    'HU': i.hu ?? '',
    'DO': i.do_number ?? '',
    'SKU': i.sku,
    'Nama Barang': i.nama_barang,
    'Batch': i.batch ?? '',
    'Qty System (PCS)': i.qty_system_pcs,
    'Qty Fisik (PCS)': i.qty_fisik_pcs,
    'Selisih (PCS)': i.selisih_pcs,
    'Kategori Issue': i.kategori_issue,
    'Keterangan': i.keterangan ?? '',
    'Status': i.status,
    'Storage Tujuan': i.storage_tujuan ?? '',
    'Dibuat Oleh': i.created_by_name ?? i.created_by,
    'Tanggal Dibuat': safeDate(i.created_at),
    'Diselesaikan Oleh': i.solved_by_name ?? i.solved_by ?? '',
    'Tanggal Selesai': safeDate(i.solved_at),
    'Dibatalkan Oleh': i.cancelled_by_name ?? i.cancelled_by ?? '',
    'Tanggal Batal': safeDate(i.cancelled_at),
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Auto column widths
  const colWidths = Object.keys(rows[0]).map((key) => ({
    wch: Math.max(key.length, ...rows.map((r) => String((r as Record<string, unknown>)[key] ?? '').length)) + 2,
  }));
  worksheet['!cols'] = colWidths;

  // Freeze header row
  worksheet['!freeze'] = { xSplit: 0, ySplit: 1 };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Issues');

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  const filename = `Parama_DC_Jember_Issues_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.length),
    },
  });
}
