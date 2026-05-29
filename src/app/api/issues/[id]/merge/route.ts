import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dsMergeIssue, dsGetIssueById } from '@/lib/data-source';
import { z, ZodError } from 'zod';

const mergeSchema = z.object({
  new_qty_system: z.number({ required_error: 'Qty System wajib diisi' }),
  new_qty_fisik: z.number({ required_error: 'Qty Fisik wajib diisi' }),
  new_selisih: z.number(),
  keterangan: z.string().optional(),
});

/**
 * POST /api/issues/[id]/merge
 * Merge issue baru ke issue yang sudah ada (OPEN only).
 * Menambahkan selisih ke remaining_selisih_pcs dan append ke merge_history.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
      { status: 401 }
    );

  // Cek issue ada dan statusnya OPEN
  const issueResult = await dsGetIssueById(params.id);
  if (!issueResult.success || !issueResult.data)
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Issue tidak ditemukan' } },
      { status: 404 }
    );

  if (issueResult.data.status !== 'OPEN')
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_STATUS', message: 'Hanya issue OPEN yang bisa di-merge' } },
      { status: 409 }
    );

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'Body tidak valid' } },
      { status: 400 }
    );
  }

  let validated;
  try {
    validated = mergeSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError)
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Data tidak valid', details: err.flatten().fieldErrors } },
        { status: 422 }
      );
    throw err;
  }

  const userName = session.user.name;

  const result = await dsMergeIssue(params.id, {
    new_qty_system: validated.new_qty_system,
    new_qty_fisik: validated.new_qty_fisik,
    new_selisih: validated.new_selisih,
    keterangan: validated.keterangan,
    by: userName,
    performed_by: userName,
  });

  if (!result.success)
    return NextResponse.json(result, { status: 500 });

  // Re-fetch full issue after merge so frontend gets latest complete data
  const freshIssue = await dsGetIssueById(params.id);
  const remaining = freshIssue.data?.remaining_selisih_pcs ?? result.data?.remaining_selisih_pcs ?? 0;

  return NextResponse.json({
    success: true,
    data: {
      ...(freshIssue.data ?? result.data),
      balanced: remaining === 0,
      remaining_selisih_pcs: remaining,
    },
    message: 'Merge berhasil',
  });
}
