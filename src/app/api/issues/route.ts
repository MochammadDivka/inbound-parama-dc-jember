import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dsGetIssues, dsCreateIssue, dsCheckDuplicateIssue } from '@/lib/data-source';
import { createIssueSchema } from '@/lib/validators';
import { ZodError } from 'zod';
import { google } from 'googleapis';
import { Readable } from 'stream';
import { ACCEPTED_IMAGE_TYPES, MAX_PHOTO_SIZE_MB, MAX_PHOTOS } from '@/lib/constants';

export const dynamic = 'force-dynamic';

const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID ?? '';

function getDriveClient() {
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON tidak dikonfigurasi');

  const creds = JSON.parse(Buffer.from(serviceAccountJson, 'base64').toString('utf-8'));

  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  return google.drive({ version: 'v3', auth });
}

const isDriveEnabled = !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON && !!DRIVE_FOLDER_ID;

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const mine = searchParams.get('mine') === 'true';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20')));

  const params = {
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

  const contentType = request.headers.get('content-type') || '';
  let validatedData: any;
  let files: File[] = [];

  if (contentType.includes('multipart/form-data')) {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Form data tidak valid' } }, { status: 400 });
    }

    // Ekstrak file foto
    files = formData.getAll('photos') as File[];

    // Parse fields
    const qtySystemRaw = formData.get('qty_system_pcs');
    const qtyFisikRaw = formData.get('qty_fisik_pcs');

    const fields = {
      hu: (formData.get('hu') as string) || '',
      do_number: (formData.get('do_number') as string) || '',
      sku: (formData.get('sku') as string) || '',
      nama_barang: (formData.get('nama_barang') as string) || '',
      batch: (formData.get('batch') as string) || '',
      qty_system_pcs: qtySystemRaw ? parseFloat(qtySystemRaw as string) : undefined,
      qty_fisik_pcs: qtyFisikRaw ? parseFloat(qtyFisikRaw as string) : undefined,
      kategori_issue: (formData.get('kategori_issue') as string) || '',
      keterangan: (formData.get('keterangan') as string) || '',
      storage_tujuan: (formData.get('storage_tujuan') as string) || '',
      created_at: (formData.get('created_at') as string) || undefined,
    };

    try {
      validatedData = createIssueSchema.parse(fields);
    } catch (err) {
      if (err instanceof ZodError)
        return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Data tidak valid', details: err.flatten().fieldErrors } }, { status: 422 });
      throw err;
    }
  } else {
    // Fallback JSON parsing
    let body: unknown;
    try { body = await request.json(); } catch {
      return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Body tidak valid' } }, { status: 400 });
    }

    try { validatedData = createIssueSchema.parse(body); } catch (err) {
      if (err instanceof ZodError)
        return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Data tidak valid', details: err.flatten().fieldErrors } }, { status: 422 });
      throw err;
    }
  }

  // Server-side duplicate check (skip jika SKU kosong — HU Rusak tanpa SKU)
  if (validatedData.sku && validatedData.batch) {
    const dup = await dsCheckDuplicateIssue(validatedData.sku, validatedData.batch);
    if (dup.isDuplicate)
      return NextResponse.json({ success: false, error: { code: 'DUPLICATE_ISSUE', message: `Issue dengan SKU ${validatedData.sku} dan Batch ${validatedData.batch} sudah ada`, details: { existing_id: dup.existing_id } } }, { status: 409 });
  }

  // Generate issue ID terlebih dahulu agar bisa dipakai untuk nama file Drive
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 90000) + 10000;
  const issueId = `ISS-${year}-${rand}`;

  let photoUrlStr: string | null = null;
  const uploadedFileIds: string[] = [];

  // Upload foto jika ada file yang dikirim
  if (files && files.length > 0) {
    if (files.length > MAX_PHOTOS) {
      return NextResponse.json({ success: false, error: { code: 'TOO_MANY_FILES', message: `Maksimal ${MAX_PHOTOS} foto per issue` } }, { status: 400 });
    }

    // Validasi file
    const maxSizeBytes = MAX_PHOTO_SIZE_MB * 1024 * 1024;
    for (const file of files) {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        return NextResponse.json({ success: false, error: { code: 'INVALID_FILE_TYPE', message: `Format tidak didukung: ${file.type}. Gunakan JPG, PNG, atau WEBP.` } }, { status: 400 });
      }
      if (file.size > maxSizeBytes) {
        return NextResponse.json({ success: false, error: { code: 'FILE_TOO_LARGE', message: `Ukuran file maksimal ${MAX_PHOTO_SIZE_MB}MB. File "${file.name}" terlalu besar.` } }, { status: 400 });
      }
    }

    if (!isDriveEnabled) {
      return NextResponse.json({ success: false, error: { code: 'DRIVE_NOT_CONFIGURED', message: 'Upload foto belum dikonfigurasi.' } }, { status: 503 });
    }

    let drive;
    try {
      drive = getDriveClient();
    } catch (err) {
      console.error('[POST /api/issues] Gagal membuat Drive client:', err);
      return NextResponse.json({ success: false, error: { code: 'DRIVE_AUTH_ERROR', message: 'Konfigurasi service account tidak valid' } }, { status: 500 });
    }

    try {
      const uploadPromises = files.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
        const timestamp = Date.now();
        const filename = `${issueId}_photo_${timestamp}.${ext}`;

        const response = await drive.files.create({
          requestBody: {
            name: filename,
            parents: [DRIVE_FOLDER_ID],
          },
          media: {
            mimeType: file.type,
            body: Readable.from(buffer),
          },
          fields: 'id, name, webViewLink',
        });

        const fileId = response.data.id;
        if (!fileId) throw new Error('Drive tidak mengembalikan file ID');

        uploadedFileIds.push(fileId);

        await drive.permissions.create({
          fileId,
          requestBody: {
            role: 'reader',
            type: 'anyone',
          },
        });

        return `https://drive.google.com/uc?export=view&id=${fileId}`;
      });

      const urls = await Promise.all(uploadPromises);
      photoUrlStr = urls.join(',');
    } catch (err) {
      console.error('[POST /api/issues] Gagal mengupload foto bukti:', err);
      // Cleanup files on Drive if any failure occurred
      for (const fid of uploadedFileIds) {
        try {
          await drive.files.delete({ fileId: fid });
        } catch (cleanErr) {
          console.error('[POST /api/issues] Gagal membersihkan file sampah:', fid, cleanErr);
        }
      }
      return NextResponse.json({ success: false, error: { code: 'UPLOAD_FAILED', message: `Gagal mengunggah foto bukti: ${(err as Error).message}` } }, { status: 500 });
    }
  }

  // Create issue in DB
  const result = await dsCreateIssue({
    ...validatedData,
    issue_id: issueId, // Gunakan ID yang sama yang dipakai untuk upload
    photo_url: photoUrlStr ?? undefined,
    created_by: session.user.name,
    created_by_name: session.user.name,
    performed_by: session.user.name,
  });

  if (!result.success) {
    // DB write failed: Cleanup Drive files since issue wasn't successfully created
    if (uploadedFileIds.length > 0) {
      try {
        const drive = getDriveClient();
        for (const fid of uploadedFileIds) {
          await drive.files.delete({ fileId: fid });
        }
      } catch (cleanErr) {
        console.error('[POST /api/issues] Gagal membersihkan file sampah pasca db error:', cleanErr);
      }
    }
    return NextResponse.json(result, { status: 500 });
  }

  // NOTIFICATION LOG sudah dimasukkan secara otomatis dalam dsCreateIssue,
  // sehingga dsAddLog redundan di sini dihapus demi efisiensi DB (menghindari double logs).

  return NextResponse.json(result, { status: 201 });
}
