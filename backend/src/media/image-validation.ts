/** Hard ceiling accepted by the upload interceptor (chat attachments). */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
/** Product / shop / workshop / review images. */
export const MAX_CONTENT_IMAGE_BYTES = 5 * 1024 * 1024;
/** Chat attachments. */
export const MAX_CHAT_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export type DetectedImage = { mime: string };

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * Detects the real image type from the file's magic bytes. The client-supplied
 * MIME type and filename are never trusted. Raster formats only: SVG is
 * rejected on purpose because it can carry scripts. Cloudinary converts every
 * accepted format to a web format on delivery (f_auto).
 */
export function detectImageType(buf: Buffer): DetectedImage | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: 'image/jpeg' };
  if (buf.length >= 8 && buf.subarray(0, 8).equals(PNG)) return { mime: 'image/png' };
  if (buf.length >= 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') {
    return { mime: 'image/webp' };
  }
  if (buf.length >= 6) {
    const head = buf.subarray(0, 6).toString('ascii');
    if (head === 'GIF87a' || head === 'GIF89a') return { mime: 'image/gif' };
  }
  if (buf.length >= 2 && buf[0] === 0x42 && buf[1] === 0x4d) return { mime: 'image/bmp' };
  if (buf.length >= 4) {
    const tiffLE = buf[0] === 0x49 && buf[1] === 0x49 && buf[2] === 0x2a && buf[3] === 0x00;
    const tiffBE = buf[0] === 0x4d && buf[1] === 0x4d && buf[2] === 0x00 && buf[3] === 0x2a;
    if (tiffLE || tiffBE) return { mime: 'image/tiff' };
  }
  if (buf.length >= 12 && buf.subarray(4, 8).toString('ascii') === 'ftyp') {
    const brand = buf.subarray(8, 12).toString('ascii');
    if (brand === 'avif' || brand === 'avis') return { mime: 'image/avif' };
    if (['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1'].includes(brand)) return { mime: 'image/heic' };
  }
  return null;
}
