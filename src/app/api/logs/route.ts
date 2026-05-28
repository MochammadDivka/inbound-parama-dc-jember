import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dsGetLogs } from '@/lib/data-source';
import { ReferenceType } from '@/types';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
  if (session.user.role === 'USER')
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Akses ditolak' } }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '10')));
  const reference_id = searchParams.get('reference_id') ?? undefined;
  const reference_type = searchParams.get('reference_type') ?? undefined;

  const validRefTypes: ReferenceType[] = ['ISSUE', 'CZ', 'USER'];
  const safeRefType = validRefTypes.includes(reference_type as ReferenceType)
    ? (reference_type as ReferenceType)
    : undefined;

  const result = await dsGetLogs({ limit, reference_id, reference_type: safeRefType });
  if (!result.success) return NextResponse.json(result, { status: 500 });
  return NextResponse.json(result);
}
