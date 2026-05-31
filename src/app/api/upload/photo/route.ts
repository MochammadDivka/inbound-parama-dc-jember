import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ACCEPTED_IMAGE_TYPES, MAX_PHOTO_SIZE_MB, MAX_PHOTOS } from '@/lib/constants';
import { google } from 'googleapis';
import { Readable } from 'stream';

const MAX_SIZE_BYTES = MAX_PHOTO_SIZE_MB * 1024 * 1024;

const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID ?? '';

/**
 * Buat Google Drive client menggunakan service account dari env.
 */
function getDriveClient() {
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON tidak dikonfigurasi');

  let creds: any;
  const cleanedStr = serviceAccountJson.trim();

  try {
    // 1. Coba parse sebagai base64
    const decoded = Buffer.from(cleanedStr, 'base64').toString('utf-8');
    if (decoded.trim().startsWith('{')) {
      creds = JSON.parse(decoded);
    } else {
      creds = JSON.parse(cleanedStr);
    }
  } catch (e) {
    // 2. Jika gagal, coba parse langsung sebagai raw JSON
    try {
      creds = JSON.parse(cleanedStr);
    } catch (e2) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON tidak valid (bukan Base64 atau JSON)');
    }
  }

  if (!creds || !creds.private_key) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON tidak mengandung private_key');
  }

  // Normalisasi private_key secara mendalam
  let privateKey = creds.private_key;
  
  // Mengatasi literal \n ganda atau tunggal
  privateKey = privateKey.replace(/\\n/g, '\n');
  privateKey = privateKey.replace(/\r/g, '');
  
  // Pastikan format PEM rapi
  if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
    privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}`;
  }
  if (!privateKey.includes('-----END PRIVATE KEY-----')) {
    privateKey = `${privateKey}\n-----END PRIVATE KEY-----`;
  }

  creds.private_key = privateKey;

  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  return google.drive({ version: 'v3', auth });
}

const isDriveEnabled = !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON && !!DRIVE_FOLDER_ID;

/**
 * POST /api/upload/photo
 * Upload foto bukti issue ke Google Drive via service account (langsung, tanpa GAS)
 * FormData fields:
 *   - photos: File[] (max 3, max 5MB each, JPG/PNG/WEBP)
 *   - issue_id: string (digunakan untuk nama file)
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
      { status: 401 }
    );

  if (!isDriveEnabled) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'DRIVE_NOT_CONFIGURED',
          message:
            'Upload foto belum dikonfigurasi. Set GOOGLE_SERVICE_ACCOUNT_JSON dan GOOGLE_DRIVE_FOLDER_ID di environment variables.',
        },
      },
      { status: 503 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'Form data tidak valid' } },
      { status: 400 }
    );
  }

  const files = formData.getAll('photos') as File[];
  const issueId = (formData.get('issue_id') as string | null) ?? 'UNKNOWN';

  if (!files || files.length === 0)
    return NextResponse.json(
      { success: false, error: { code: 'NO_FILES', message: 'Tidak ada file yang diupload' } },
      { status: 400 }
    );

  if (files.length > MAX_PHOTOS)
    return NextResponse.json(
      { success: false, error: { code: 'TOO_MANY_FILES', message: `Maksimal ${MAX_PHOTOS} foto per issue` } },
      { status: 400 }
    );

  // Validasi semua file sebelum proses
  for (const file of files) {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type))
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_FILE_TYPE',
            message: `Format tidak didukung: ${file.type}. Gunakan JPG, PNG, atau WEBP.`,
          },
        },
        { status: 400 }
      );
    if (file.size > MAX_SIZE_BYTES)
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: `Ukuran file maksimal ${MAX_PHOTO_SIZE_MB}MB. File "${file.name}" terlalu besar.`,
          },
        },
        { status: 400 }
      );
  }

  let drive: ReturnType<typeof getDriveClient>;
  try {
    drive = getDriveClient();
  } catch (err: any) {
    console.error('[upload/photo] Gagal membuat Drive client:', err);
    return NextResponse.json(
      {
        success: false,
        error: { 
          code: 'DRIVE_AUTH_ERROR', 
          message: `Konfigurasi service account tidak valid: ${err?.message || err}` 
        },
      },
      { status: 500 }
    );
  }

  // Upload foto secara paralel
  let uploadedResults: Array<{ fileId: string; webViewUrl: string }> = [];
  const uploadedFileIds: string[] = [];
  try {
    const uploadPromises = files.map(async (file) => {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
      const timestamp = Date.now();
      const filename = `${issueId}_photo_${timestamp}.${ext}`;

      // Upload ke Google Drive via googleapis
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
      
      // Catat ID file untuk rollback jika ada kegagalan pada file lain
      uploadedFileIds.push(fileId);

      // Buat file dapat diakses publik (anyone with link can view)
      await drive.permissions.create({
        fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });

      // URL untuk thumbnail/preview langsung (direct image URL)
      const webViewUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;

      return { fileId, webViewUrl };
    });

    uploadedResults = await Promise.all(uploadPromises);
  } catch (err) {
    console.error('[upload/photo] Gagal upload file secara paralel:', err);
    // Jalankan cleanup rollback untuk menghapus file sampah di Drive
    for (const fid of uploadedFileIds) {
      try {
        await drive.files.delete({ fileId: fid });
        console.log(`[upload/photo] Rollback: file sampah ${fid} berhasil dibersihkan`);
      } catch (cleanErr) {
        console.error(`[upload/photo] Rollback: Gagal membersihkan file sampah ${fid}:`, cleanErr);
      }
    }
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UPLOAD_FAILED',
          message: `Gagal mengupload foto: ${(err as Error).message}`,
        },
      },
      { status: 500 }
    );
  }

  const urls = uploadedResults.map((r) => r.webViewUrl);

  return NextResponse.json({
    success: true,
    data: {
      urls,
      thumbnails: urls.map(url => {
        const idMatch = url.match(/[?&]id=([^&]+)/);
        return idMatch ? `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w320` : url;
      }),
      fileIds: uploadedResults.map((r) => r.fileId),
      // Comma-separated URLs untuk disimpan di field Issue.photo_url
      photo_url: urls.join(','),
    },
    message: `${urls.length} foto berhasil diupload ke Google Drive`,
  });
}
