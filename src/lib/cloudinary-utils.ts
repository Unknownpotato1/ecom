/**
 * Cloudinary image URL optimizer.
 *
 * Adds f_auto,q_auto,w_[width] transformation parameters to Cloudinary
 * delivery URLs to reduce bandwidth usage:
 *   - f_auto: auto-selects the best format (WebP/AVIF) per browser
 *   - q_auto: auto-compresses quality without visible loss
 *   - w_[width]: sets the pixel width to match the actual display size
 *
 * IMPORTANT: This function ONLY transforms DELIVERY/display URLs. It does
 * NOT touch the upload pipeline (api/upload/route.ts) or any upload preset
 * / incoming transformation settings in Cloudinary. f_auto doesn't work at
 * upload time (it needs the browser's request), and q_auto at upload would
 * permanently recompress and overwrite the original stored files.
 *
 * URLs that are NOT from Cloudinary (e.g. raw.githubusercontent.com, local
 * /upi-logo.svg, etc.) are returned unchanged — we can't transform those.
 *
 * Example:
 *   optimizeCloudinaryUrl(
 *     'https://res.cloudinary.com/drlmgjt6p/image/upload/v123/products/abc.jpg',
 *     800
 *   )
 *   →
 *   'https://res.cloudinary.com/drlmgjt6p/image/upload/f_auto,q_auto,w_800/v123/products/abc.jpg'
 *
 * If the URL already has transformations (e.g. /image/upload/w_100/...), the
 * new f_auto,q_auto,w_[width] are PREPENDED so they don't conflict with
 * existing params.
 */

const CLOUDINARY_HOST = 'res.cloudinary.com'

export function optimizeCloudinaryUrl(url: string | undefined | null, width: number): string {
  if (!url) return ''
  // Only transform Cloudinary URLs. Leave other URLs (GitHub raw, local SVGs,
  // data URIs, etc.) untouched.
  if (!url.includes(CLOUDINARY_HOST)) return url

  // The transformation segment is inserted right after '/image/upload/'.
  // Cloudinary expects: .../image/upload/<transformations>/<version>/<public_id>
  // We insert f_auto,q_auto,w_[width] right after /image/upload/.
  const marker = '/image/upload/'
  const idx = url.indexOf(marker)
  if (idx === -1) return url // unexpected format — return unchanged (safe default)

  const before = url.slice(0, idx + marker.length)
  const after = url.slice(idx + marker.length)

  // If there are already transformation params right after /image/upload/
  // (starts with something other than 'v' followed by a digit), prepend ours.
  // Cloudinary version segments look like /v1785410863/... — if 'after'
  // starts with 'v' + digits + '/', there are no existing transformations.
  const hasExistingTransforms = !/^v\d+\//.test(after)

  const transform = `f_auto,q_auto,w_${width}`
  if (hasExistingTransforms) {
    // Prepend our transform + comma to existing ones (Cloudinary joins
    // transformations with commas in a single segment)
    return `${before}${transform},${after}`
  }
  // No existing transforms — insert our transform + '/'
  return `${before}${transform}/${after}`
}
