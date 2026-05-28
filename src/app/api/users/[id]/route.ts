import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dsGetUserById, dsResetPin, dsToggleStatus } from '@/lib/data-source';
import { hashSecret } from '@/lib/bcrypt';
import { userActionSchema } from '@/lib/validators';
import { ZodError } from 'zod';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
  if (session.user.role !== 'ADMIN')
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Akses ditolak' } }, { status: 403 });

  const userRes = await dsGetUserById(params.id);
  if (!userRes.success || !userRes.data)
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'User tidak ditemukan' } }, { status: 404 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Body tidak valid' } }, { status: 400 });
  }

  let validated;
  try { validated = userActionSchema.parse(body); } catch (err) {
    if (err instanceof ZodError)
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Data tidak valid', details: err.flatten().fieldErrors } }, { status: 422 });
    throw err;
  }

  // ─── Reset PIN ─────────────────────────────────────────────────
  if (validated.action === 'reset-pin') {
    const pin_hash = await hashSecret(validated.new_pin);
    const result = await dsResetPin(params.id, {
      pin_hash,
      performed_by: session.user.name,
    });
    if (!result.success) return NextResponse.json(result, { status: 500 });
    return NextResponse.json(result);
  }

  // ─── Toggle Status ─────────────────────────────────────────────
  if (validated.action === 'toggle-status') {
    const result = await dsToggleStatus(params.id, {
      performed_by: session.user.name,
    });
    if (!result.success) return NextResponse.json(result, { status: 500 });
    return NextResponse.json(result);
  }

  return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Action tidak valid' } }, { status: 400 });
}
