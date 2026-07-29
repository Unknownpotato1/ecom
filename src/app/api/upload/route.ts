import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'

/**
 * Configure Cloudinary once per request using env vars.
 *
 * Required env vars (already configured in production — verified
 * via /api/debug-env):
 *   - CLOUDINARY_CLOUD_NAME
 *   - CLOUDINARY_API_KEY
 *   - CLOUDINARY_API_SECRET
 *
 * We configure inside the handler (not at module top-level) so that
 * missing env vars produce a clean 500 error instead of crashing the
 * module load (which would break the entire Next.js process).
 */
function getCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      'Cloudinary env vars missing. Need CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.'
    )
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true, // Always serve over https
  })

  return cloudinary
}

/**
 * Allowed MIME types for product images.
 * Keeping this list explicit prevents accidental upload of
 * non-image files (PDFs, executables, etc.) which would otherwise
 * be stored as binary blobs in Cloudinary.
 */
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/heic',
  'image/heif',
])

/** 10 MB — generous enough for high-res product photos, small enough to
 *  prevent accidental abuse. */
const MAX_SIZE = 10 * 1024 * 1024

/**
 * POST /api/upload
 *
 * Accepts multipart/form-data with a single `file` field (an image),
 * uploads it to Cloudinary, and returns the secure URL.
 *
 * Used by the admin product editor (admin-products.tsx → uploadImage).
 *
 * Response shape on success: { url: string, publicId: string }
 * Response shape on error:   { error: string }
 *
 * The admin panel only reads `data.url`, but we also return `publicId`
 * for future use (e.g. deleting images from Cloudinary when a product
 * is removed).
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file')

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'Invalid file — expected a File in the "file" field' },
        { status: 400 }
      )
    }

    // Validate MIME type
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        {
          error: `Unsupported file type: ${file.type || 'unknown'}. Allowed: JPEG, PNG, WebP, GIF, AVIF, HEIC.`,
        },
        { status: 415 }
      )
    }

    // Validate size
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        {
          error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)} MB. Max allowed: 10 MB.`,
        },
        { status: 413 }
      )
    }

    // Configure Cloudinary (throws if env vars are missing)
    let cloudinaryClient
    try {
      cloudinaryClient = getCloudinary()
    } catch (e) {
      console.error('Cloudinary config error:', (e as Error).message)
      return NextResponse.json(
        { error: 'Image storage is not configured on the server.' },
        { status: 500 }
      )
    }

    // Convert the File to a buffer — Cloudinary's upload_stream accepts
    // a Buffer. Using upload_stream is preferred for serverless (Vercel)
    // because it doesn't require writing to /tmp.
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload via a Promise wrapper around upload_stream.
    // Folder: "aurora-ecom/products" — keeps product images grouped in
    // the Cloudinary media library. resource_type "image" ensures
    // Cloudinary treats it as an image (and rejects videos/pdfs).
    const result = await new Promise<{
      secure_url: string
      public_id: string
      bytes: number
      format: string
      width?: number
      height?: number
    }>((resolve, reject) => {
      const uploadStream = cloudinaryClient.uploader.upload_stream(
        {
          folder: 'aurora-ecom/products',
          resource_type: 'image',
        },
        (error, result) => {
          if (error) {
            reject(error)
          } else if (!result) {
            reject(new Error('Cloudinary returned no result'))
          } else {
            resolve(result as {
              secure_url: string
              public_id: string
              bytes: number
              format: string
              width?: number
              height?: number
            })
          }
        }
      )
      uploadStream.end(buffer)
    })

    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id,
      bytes: result.bytes,
      format: result.format,
    })
  } catch (e) {
    console.error('POST /api/upload failed:', (e as Error).message)
    return NextResponse.json(
      { error: 'Upload failed: ' + (e as Error).message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/upload — returns the configuration status (for debugging).
 * Doesn't expose any secrets — just booleans.
 */
export async function GET() {
  return NextResponse.json({
    configured:
      !!process.env.CLOUDINARY_CLOUD_NAME &&
      !!process.env.CLOUDINARY_API_KEY &&
      !!process.env.CLOUDINARY_API_SECRET,
    maxFileSize: `${MAX_SIZE / 1024 / 1024} MB`,
    allowedTypes: Array.from(ALLOWED_MIME),
  })
}
