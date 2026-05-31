import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const mine = searchParams.get('mine') === 'true';

  const db = getSupabaseAdmin();
  let openQuery = db.from('issues').select('*', { count: 'exact', head: true }).eq('status', 'OPEN');
  let solvedQuery = db.from('issues').select('*', { count: 'exact', head: true }).eq('status', 'SOLVED');

  if (mine) {
    openQuery = openQuery.eq('created_by', session.user.name);
    solvedQuery = solvedQuery.eq('created_by', session.user.name);
  }

  const [openRes, solvedRes] = await Promise.all([openQuery, solvedQuery]);

  return NextResponse.json({
    success: true,
    data: {
      open: openRes.count ?? 0,
      solved: solvedRes.count ?? 0,
    },
  });
}
