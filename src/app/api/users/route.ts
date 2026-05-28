import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dsGetUsers, dsCreateUser } from '@/lib/data-source';
import { hashSecret } from '@/lib/bcrypt';
import { createUserSchema } from '@/lib/validators';
import { ZodError } from 'zod';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
  if (session.user.role !== 'ADMIN')
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Akses ditolak' } }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') ?? undefined;

  const result = await dsGetUsers({ search });
  if (!result.success) return NextResponse.json(result, { status: 500 });
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
  if (session.user.role !== 'ADMIN')
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Akses ditolak' } }, { status: 403 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Body tidak valid' } }, { status: 400 });
  }

  let validated;
  try { validated = createUserSchema.parse(body); } catch (err) {
    if (err instanceof ZodError)
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Data tidak valid', details: err.flatten().fieldErrors } }, { status: 422 });
    throw err;
  }

  // Hash PIN before storing
  const pin_hash = await hashSecret(validated.pin);

  const result = await dsCreateUser({
    nama: validated.nama,
    username: validated.username,
    role: validated.role,
    pin_hash,
    performed_by: session.user.name,
  });

  if (!result.success) return NextResponse.json(result, { status: result.error?.code === 'DUPLICATE_USERNAME' ? 409 : 500 });
  return NextResponse.json(result, { status: 201 });
}
