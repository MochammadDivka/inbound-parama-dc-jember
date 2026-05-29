import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dsGetIssues, dsCreateIssue, dsCheckDuplicateIssue, dsAddLog } from '@/lib/data-source';
import { createIssueSchema } from '@/lib/validators';
import { ZodError } from 'zod';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const mine = searchParams.get('mine') === 'true';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20')));

  const params = {
    // USER bisa lihat semua issue (#4). mine=true untuk filter "Milikku"
    created_by: mine ? session.user.name : (searchParams.get('created_by') ?? undefined),
    search: searchParams.get('search') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    kategori: searchParams.get('kategori') ?? undefined,
    date_from: searchParams.get('date_from') ?? undefined,
    date_to: searchParams.get('date_to') ?? undefined,
    sku: searchParams.get('sku') ?? undefined,
    hu: searchParams.get('hu') ?? undefined,
    sort: searchParams.get('sort') ?? undefined,
    order: searchParams.get('order') ?? undefined,
    page,
    limit,
  };

  const result = await dsGetIssues(params);
  if (!result.success) return NextResponse.json(result, { status: 500 });
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Body tidak valid' } }, { status: 400 });
  }

  let validated;
  try { validated = createIssueSchema.parse(body); } catch (err) {
    if (err instanceof ZodError)
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Data tidak valid', details: err.flatten().fieldErrors } }, { status: 422 });
    throw err;
  }

  // Server-side duplicate check (skip jika SKU kosong — HU Rusak tanpa SKU)
  if (validated.sku && validated.batch) {
    const dup = await dsCheckDuplicateIssue(validated.sku, validated.batch);
    if (dup.isDuplicate)
      return NextResponse.json({ success: false, error: { code: 'DUPLICATE_ISSUE', message: `Issue dengan SKU ${validated.sku} dan Batch ${validated.batch} sudah ada`, details: { existing_id: dup.existing_id } } }, { status: 409 });
  }

  const result = await dsCreateIssue({
    ...validated,
    created_by: session.user.name, // nama lengkap, bukan ID
    created_by_name: session.user.name,
    performed_by: session.user.name,
  });

  if (!result.success) return NextResponse.json(result, { status: 500 });

  await dsAddLog({
    reference_id: result.data?.issue_id ?? '',
    reference_type: 'ISSUE',
    action: 'issue_created',
    performed_by: session.user.username ?? session.user.name,
    notes: 'Issue baru dibuat',
  });

  return NextResponse.json(result, { status: 201 });
}
