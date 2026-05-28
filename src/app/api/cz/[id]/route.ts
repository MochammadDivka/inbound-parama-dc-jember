import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dsGetCZById, dsSolveCZ, dsUpdateCZ, dsDeleteCZ, dsCheckDuplicateCZ } from '@/lib/data-source';
import { solveCZSchema, createCZSchema } from '@/lib/validators';
import { ZodError } from 'zod';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });

  const result = await dsGetCZById(params.id);
  if (!result.success) return NextResponse.json(result, { status: 404 });
  return NextResponse.json(result);
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });

  if (session.user.role === 'USER')
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Akses ditolak' } }, { status: 403 });

  const existing = await dsGetCZById(params.id);
  if (!existing.success || !existing.data)
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'CZ record tidak ditemukan' } }, { status: 404 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Body tidak valid' } }, { status: 400 });
  }

  let validated;
  try { validated = solveCZSchema.parse(body); } catch (err) {
    if (err instanceof ZodError)
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Data tidak valid', details: err.flatten().fieldErrors } }, { status: 422 });
    throw err;
  }

  const result = await dsSolveCZ(params.id, {
    solved_by: session.user.name, // nama lengkap
    storage_tujuan: validated.storage_tujuan,
    catatan_penyelesaian: validated.catatan_penyelesaian,
    performed_by: session.user.name,
  });

  if (!result.success) return NextResponse.json(result, { status: 500 });
  return NextResponse.json(result);
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });

  const existing = await dsGetCZById(params.id);
  if (!existing.success || !existing.data)
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'CZ record tidak ditemukan' } }, { status: 404 });

  // USER can only edit their own OPEN CZ record
  if (session.user.role === 'USER') {
    const isOwner =
      existing.data.created_by === session.user.name ||
      existing.data.created_by === session.user.id ||
      existing.data.created_by === session.user.username;

    if (!isOwner || existing.data.status !== 'OPEN') {
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Akses ditolak' } }, { status: 403 });
    }
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Body tidak valid' } }, { status: 400 });
  }

  let validated;
  try {
    // We can use createCZSchema but make all fields optional
    validated = createCZSchema.partial().parse(body);
  } catch (err) {
    if (err instanceof ZodError)
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Data tidak valid', details: err.flatten().fieldErrors } }, { status: 422 });
    throw err;
  }

  // Strict duplicate check before updating SKU or Batch
  if (validated.sku || validated.batch) {
    const sku = validated.sku ?? existing.data.sku;
    const batch = (validated.batch ?? existing.data.batch).toUpperCase();
    const dup = await dsCheckDuplicateCZ(sku, batch, params.id);
    if (dup.isDuplicate) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'DUPLICATE_CZ',
          message: `CZ record dengan SKU ${sku} dan Batch ${batch} sudah ada dan aktif`,
          details: { existing_id: dup.existing_id }
        }
      }, { status: 409 });
    }
  }

  const result = await dsUpdateCZ(params.id, {
    ...validated,
    performed_by: session.user.name,
  });

  if (!result.success) return NextResponse.json(result, { status: 500 });
  return NextResponse.json(result);
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });

  const existing = await dsGetCZById(params.id);
  if (!existing.success || !existing.data)
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'CZ record tidak ditemukan' } }, { status: 404 });

  // USER can only delete their own OPEN CZ record
  if (session.user.role === 'USER') {
    const isOwner =
      existing.data.created_by === session.user.name ||
      existing.data.created_by === session.user.id ||
      existing.data.created_by === session.user.username;

    if (!isOwner || existing.data.status !== 'OPEN') {
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Akses ditolak' } }, { status: 403 });
    }
  }

  const result = await dsDeleteCZ(params.id, session.user.name);
  if (!result.success) return NextResponse.json(result, { status: 500 });
  return NextResponse.json(result);
}
