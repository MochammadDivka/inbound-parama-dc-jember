import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isGASEnabled, gasRequest } from '@/lib/gas-client';
import { ACCEPTED_IMAGE_TYPES, MAX_PHOTO_SIZE_MB, MAX_PHOTOS } from '@/lib/constants';

const isDriveEnabled = isGASEnabled;

const MAX_SIZE_BYTES = MAX_PHOTO_SIZE_MB * 1024 * 1024;

/**
 * POST /api/upload/photo
 * Upload photo evidence for an issue to Google Drive
 * FormData fields:
 *   - photos: File[] (max 3, max 5MB each, JPG/PNG/WEBP)
 *   - issue_id: string (used for filename)
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
          message: 'Upload foto belum dikonfigurasi. Set GOOGLE_APPS_SCRIPT_URL di environment variables.',
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

  // Validate all files before processing any
  for (const file of files) {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type))
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_FILE_TYPE', message: `Format tidak didukung: ${file.type}. Gunakan JPG, PNG, atau WEBP.` } },
        { status: 400 }
      );
    if (file.size > MAX_SIZE_BYTES)
      return NextResponse.json(
        { success: false, error: { code: 'FILE_TOO_LARGE', message: `Ukuran file maksimal ${MAX_PHOTO_SIZE_MB}MB. File "${file.name}" terlalu besar.` } },
        { status: 400 }
      );
  }

  const uploadedResults: Array<{ fileId: string; webViewUrl: string; thumbnailUrl: string }> = [];

  // Upload files sequentially to avoid Drive API rate limits
  for (const file of files) {
    try {
      // Konversi File ke base64
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');
      
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
      const timestamp = Date.now();
      const filename = `${issueId}_photo_${timestamp}.${ext}`;

      const gasRes = await gasRequest<{ fileId: string; photo_url: string }>({
        action: 'uploadPhoto',
        method: 'POST',
        body: {
          fileBase64: base64,
          mimeType: file.type,
          filename,
        },
      });

      if (!gasRes.success || !gasRes.data) {
        console.error('=== DRIVE UPLOAD FAILED ERROR FROM GAS ===', gasRes.error);
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'UPLOAD_FAILED',
              message: `Gagal mengupload "${file.name}": ${gasRes.error?.message ?? 'GAS upload error'}`,
            },
          },
          { status: 500 }
        );
      }

      uploadedResults.push({
        fileId: gasRes.data.fileId,
        webViewUrl: gasRes.data.photo_url,
        thumbnailUrl: gasRes.data.photo_url,
      });
    } catch (err) {
      console.error('=== DRIVE UPLOAD FAILED ERROR ===', err);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UPLOAD_FAILED',
            message: `Gagal mengupload "${file.name}": ${(err as Error).message}`,
          },
        },
        { status: 500 }
      );
    }
  }

  const urls = uploadedResults.map((r) => r.webViewUrl);
  const thumbnails = uploadedResults.map((r) => r.thumbnailUrl);

  return NextResponse.json({
    success: true,
    data: {
      urls,
      thumbnails,
      fileIds: uploadedResults.map((r) => r.fileId),
      // Comma-separated URLs for storage in the Issue.photo_url field
      photo_url: urls.join(','),
    },
    message: `${urls.length} foto berhasil diupload ke Google Drive`,
  });
}
