import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dsGetIssueById, dsUpdateIssue, dsSolveIssue, dsCancelIssue, dsRequestSolved, dsRejectSolved } from '@/lib/data-source';
import { editIssueSchema, issueActionSchema } from '@/lib/validators';
import { ZodError } from 'zod';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });

  const result = await dsGetIssueById(params.id);
  if (!result.success) return NextResponse.json(result, { status: 404 });

  return NextResponse.json(result);
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });

  const issueRes = await dsGetIssueById(params.id);
  if (!issueRes.success || !issueRes.data)
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Issue tidak ditemukan' } }, { status: 404 });

  const issue = issueRes.data;

  // Permission: USER hanya bisa edit issue milik sendiri (OPEN)
  if (session.user.role === 'USER') {
    const cleanString = (str: any) => String(str ?? '').trim().toLowerCase();
    const isOwner =
      cleanString(issue.created_by) === cleanString(session.user.name) ||
      cleanString(issue.created_by) === cleanString(session.user.username) ||
      cleanString(issue.created_by) === cleanString(session.user.id) ||
      cleanString(issue.created_by_name) === cleanString(session.user.name);

    if (!isOwner || issue.status !== 'OPEN')
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Tidak dapat mengedit issue ini' } }, { status: 403 });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Body tidak valid' } }, { status: 400 });
  }

  let validated;
  try { validated = editIssueSchema.parse(body); } catch (err) {
    if (err instanceof ZodError)
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Data tidak valid', details: err.flatten().fieldErrors } }, { status: 422 });
    throw err;
  }

  const result = await dsUpdateIssue(params.id, {
    ...validated,
    selisih_pcs: (validated.qty_fisik_pcs ?? issue.qty_fisik_pcs) - (validated.qty_system_pcs ?? issue.qty_system_pcs),
    updated_by: session.user.name, // nama lengkap
    performed_by: session.user.name,
  });

  if (!result.success) return NextResponse.json(result, { status: 500 });
  return NextResponse.json({ ...result, message: 'Issue berhasil diperbarui' });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });

  if (session.user.role === 'USER') {
    const currentIssue = await dsGetIssueById(params.id);
    if (!currentIssue.data) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Issue tidak ditemukan' } }, { status: 404 });

    const body2 = await request.clone().json().catch(() => ({})) as { action?: string };
    if (body2?.action === 'update-photo') {
      // USER hanya bisa update foto untuk issue milik sendiri
      const cleanString = (str: any) => String(str ?? '').trim().toLowerCase();
      const isOwner =
        cleanString(currentIssue.data.created_by) === cleanString(session.user.name) ||
        cleanString(currentIssue.data.created_by) === cleanString(session.user.username) ||
        cleanString(currentIssue.data.created_by) === cleanString(session.user.id) ||
        cleanString(currentIssue.data.created_by_name) === cleanString(session.user.name);

      if (!isOwner) {
        return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Akses ditolak' } }, { status: 403 });
      }
    } else if (body2?.action !== 'request-solved') {
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Akses ditolak' } }, { status: 403 });
    }
  }

  const issueRes = await dsGetIssueById(params.id);
  if (!issueRes.success || !issueRes.data)
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Issue tidak ditemukan' } }, { status: 404 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Body tidak valid' } }, { status: 400 });
  }

  let validated;
  try { validated = issueActionSchema.parse(body); } catch (err) {
    if (err instanceof ZodError)
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Data tidak valid', details: err.flatten().fieldErrors } }, { status: 422 });
    throw err;
  }

  if (validated.action === 'solve') {
    if (session.user.role !== 'ADMIN')
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Hanya ADMIN yang bisa approve solved' } }, { status: 403 });
    const result = await dsSolveIssue(params.id, {
      solved_by: session.user.name, // nama lengkap
      storage_tujuan: validated.storage_tujuan,
      catatan: validated.catatan,
      performed_by: session.user.name,
    });
    if (!result.success) return NextResponse.json(result, { status: 500 });
    return NextResponse.json(result);
  }

  if (validated.action === 'cancel') {
    if (session.user.role !== 'ADMIN')
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Hanya ADMIN yang bisa cancel issue' } }, { status: 403 });
    const result = await dsCancelIssue(params.id, {
      cancelled_by: session.user.name, // nama lengkap
      alasan: validated.alasan,
      performed_by: session.user.name,
    });
    if (!result.success) return NextResponse.json(result, { status: 500 });
    return NextResponse.json(result);
  }

  if (validated.action === 'request-solved') {
    const issueCheck = await dsGetIssueById(params.id);
    if (issueCheck.data?.status !== 'OPEN')
      return NextResponse.json({ success: false, error: { code: 'INVALID_STATE', message: 'Hanya issue berstatus OPEN yang bisa di-request solved' } }, { status: 409 });
    const result = await dsRequestSolved(params.id, {
      req_solved_by: session.user.name, // nama lengkap
      req_solved_reason: validated.req_solved_reason ?? validated.alasan,
      performed_by: session.user.name,
    });
    if (!result.success) return NextResponse.json(result, { status: 500 });
    return NextResponse.json(result);
  }

  if (validated.action === 'approve') {
    if (session.user.role !== 'ADMIN')
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Hanya ADMIN yang bisa approve' } }, { status: 403 });
    const issueCheck = await dsGetIssueById(params.id);
    if (issueCheck.data?.status !== 'WAITING_APPROVAL')
      return NextResponse.json({ success: false, error: { code: 'INVALID_STATE', message: 'Issue harus dalam status WAITING_APPROVAL' } }, { status: 409 });
    const result = await dsSolveIssue(params.id, {
      solved_by: session.user.name,
      storage_tujuan: validated.storage_tujuan,
      performed_by: session.user.name,
    });
    if (!result.success) return NextResponse.json(result, { status: 500 });
    return NextResponse.json(result);
  }

  if (validated.action === 'reject') {
    if (session.user.role !== 'ADMIN')
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Hanya ADMIN yang bisa reject' } }, { status: 403 });
    const issueCheck = await dsGetIssueById(params.id);
    if (issueCheck.data?.status !== 'WAITING_APPROVAL')
      return NextResponse.json({ success: false, error: { code: 'INVALID_STATE', message: 'Issue harus dalam status WAITING_APPROVAL' } }, { status: 409 });
    const result = await dsRejectSolved(params.id, {
      reject_reason: validated.reject_reason,
      rejected_by: session.user.name,
      performed_by: session.user.name,
    });
    if (!result.success) return NextResponse.json(result, { status: 500 });
    return NextResponse.json(result);
  }

  if (validated.action === 'update-photo') {
    const result = await dsUpdateIssue(params.id, { photo_url: validated.photo_url ?? '' });
    if (!result.success) return NextResponse.json(result, { status: 500 });
    return NextResponse.json(result);
  }

  return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Action tidak valid' } }, { status: 400 });
}
