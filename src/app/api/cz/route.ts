import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dsGetCZ, dsCreateCZ, dsCheckDuplicateCZ, dsGetUserById } from '@/lib/data-source';
import { createCZSchema } from '@/lib/validators';
import { ZodError } from 'zod';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const mine = searchParams.get('mine') === 'true';
  const status = searchParams.get('status') ?? undefined;
  const search = searchParams.get('search') ?? undefined;
  const date_from = searchParams.get('date_from') ?? undefined;
  const date_to = searchParams.get('date_to') ?? undefined;

  const params = {
    user_id: mine ? session.user.name : undefined,
    user_id_alt: mine ? session.user.id : undefined,
    username: mine ? session.user.username : undefined,
    status,
    search,
    date_from,
    date_to,
  };

  const result = await dsGetCZ(params);
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
  try { validated = createCZSchema.parse(body); } catch (err) {
    if (err instanceof ZodError)
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Data tidak valid', details: err.flatten().fieldErrors } }, { status: 422 });
    throw err;
  }

  // Server-side duplicate check
  const dup = await dsCheckDuplicateCZ(validated.sku, validated.batch);
  if (dup.isDuplicate)
    return NextResponse.json({ success: false, error: { code: 'DUPLICATE_CZ', message: `CZ record dengan SKU ${validated.sku} dan Batch ${validated.batch} sudah ada`, details: { existing_id: dup.existing_id } } }, { status: 409 });

  const result = await dsCreateCZ({
    ...validated,
    created_by: session.user.name, // nama lengkap, bukan ID
    created_by_name: session.user.name,
    performed_by: session.user.name,
  });

  if (!result.success) return NextResponse.json(result, { status: 500 });
  return NextResponse.json(result, { status: 201 });
}
