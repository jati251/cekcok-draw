export function validateDimensions(width: number, height: number, dpi = 72) {
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > 32768 ||
    height > 32768 ||
    width * height > 64 * 1024 * 1024
  ) {
    throw new Error(
      'Use positive canvas dimensions up to 32,768 pixels per side and 64 megapixels total.'
    );
  }
  if (!Number.isFinite(dpi) || dpi <= 0) throw new Error('Resolution must be a positive number');
}
