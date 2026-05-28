import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dsGetDashboard } from '@/lib/data-source';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });

  const result = await dsGetDashboard();
  if (!result.success) return NextResponse.json(result, { status: 500 });
  return NextResponse.json(result);
}
