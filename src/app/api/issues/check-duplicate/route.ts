import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dsCheckDuplicateIssue } from '@/lib/data-source';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const sku = searchParams.get('sku')?.trim() ?? '';
  const batch = searchParams.get('batch')?.trim() ?? '';
  const exclude_id = searchParams.get('exclude_id')?.trim() ?? '';
  const hu = searchParams.get('hu');

  if (!sku || !batch)
    return NextResponse.json({ success: true, data: { isDuplicate: false } });

  const result = await dsCheckDuplicateIssue(
    sku,
    batch,
    exclude_id || undefined,
    hu !== null ? hu.trim() : undefined
  );
  return NextResponse.json({ success: true, data: result });
}
