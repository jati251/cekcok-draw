export function encodePixelPayload(
  metadata: {
    layer_id?: string;
    start_x: number;
    start_y: number;
    width: number;
    height: number;
    action_name?: string;
  },
  pixels: Uint8Array | Uint8ClampedArray
): Uint8Array {
  if (
    !Number.isSafeInteger(metadata.width) ||
    !Number.isSafeInteger(metadata.height) ||
    metadata.width <= 0 ||
    metadata.height <= 0 ||
    pixels.length !== metadata.width * metadata.height * 4
  ) {
    throw new Error('Invalid pixel region');
  }
  const header = new TextEncoder().encode(JSON.stringify(metadata));
  const result = new Uint8Array(4 + header.length + pixels.length);
  new DataView(result.buffer).setUint32(0, header.length, true);
  result.set(header, 4);
  result.set(pixels, 4 + header.length);
  return result;
}
