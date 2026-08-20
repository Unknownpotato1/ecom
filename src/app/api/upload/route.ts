import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'

/**
 * POST /api/upload
 * Accepts multipart form data with a "file" field.
 * Uploads to Cloudinary using server-side signed credentials.
 * Returns { url, publicId } on success.
 */
export async function POST(req: NextRequest) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      { error: 'Cloudinary credentials not configured.' },
      { status: 500 }
    )
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  })

  const formData = await req.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 413 })
  }

  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg']
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 415 })
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'aurora',
          resource_type: 'image',
          unique_filename: true,
          overwrite: false,
        },
        (err, res) => {
          if (err) reject(err)
          else if (!res) reject(new Error('No response from Cloudinary'))
          else resolve({ secure_url: res.secure_url, public_id: res.public_id })
        }
      )
      stream.end(buffer)
    })

    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id,
    })
  } catch (e) {
    console.error('Cloudinary upload failed:', (e as Error).message)
    return NextResponse.json(
      { error: 'Upload failed: ' + (e as Error).message },
      { status: 500 }
    )
  }
}
