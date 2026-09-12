export function canvasToBlob(
  canvas: HTMLCanvasElement,
  mime: string,
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => {
        if (!blob || blob.type !== mime)
          reject(new Error(`This environment cannot encode ${mime}`));
        else resolve(blob);
      },
      mime,
      quality
    )
  );
}

export function canvasToTiffBlob(canvas: HTMLCanvasElement, dpi = 72): Blob {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable');
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const count = 14;
  const bitsOffset = 8 + 2 + count * 12 + 4;
  const resolutionOffset = bitsOffset + 8;
  const pixelOffset = resolutionOffset + 16;
  const buffer = new ArrayBuffer(pixelOffset + pixels.length);
  const view = new DataView(buffer);
  view.setUint16(0, 0x4949, true);
  view.setUint16(2, 42, true);
  view.setUint32(4, 8, true);
  view.setUint16(8, count, true);
  const tags = [
    [256, 4, 1, canvas.width],
    [257, 4, 1, canvas.height],
    [258, 3, 4, bitsOffset],
    [259, 3, 1, 1],
    [262, 3, 1, 2],
    [273, 4, 1, pixelOffset],
    [277, 3, 1, 4],
    [278, 4, 1, canvas.height],
    [279, 4, 1, pixels.length],
    [282, 5, 1, resolutionOffset],
    [283, 5, 1, resolutionOffset + 8],
    [284, 3, 1, 1],
    [296, 3, 1, 2],
    [338, 3, 1, 2],
  ];
  tags.forEach(([tag, type, n, value], i) => {
    const offset = 10 + i * 12;
    view.setUint16(offset, tag, true);
    view.setUint16(offset + 2, type, true);
    view.setUint32(offset + 4, n, true);
    view.setUint32(offset + 8, value, true);
  });
  for (let i = 0; i < 4; i++) view.setUint16(bitsOffset + i * 2, 8, true);
  for (const offset of [resolutionOffset, resolutionOffset + 8]) {
    view.setUint32(offset, Math.round(dpi * 1000), true);
    view.setUint32(offset + 4, 1000, true);
  }
  new Uint8Array(buffer, pixelOffset).set(pixels);
  return new Blob([buffer], { type: 'image/tiff' });
}

export async function canvasToPdfBlob(canvas: HTMLCanvasElement, dpi = 72): Promise<Blob> {
  const jpeg = new Uint8Array(await (await canvasToBlob(canvas, 'image/jpeg', 0.95)).arrayBuffer());
  const w = ((canvas.width * 72) / dpi).toFixed(4);
  const h = ((canvas.height * 72) / dpi).toFixed(4);
  const encoder = new TextEncoder();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  const offsets = [0];
  let length = 0;
  const append = (value: string | Uint8Array<ArrayBuffer>) => {
    const bytes = typeof value === 'string' ? encoder.encode(value) : value;
    chunks.push(bytes);
    length += bytes.length;
  };
  const object = (id: number, body: string) => {
    offsets[id] = length;
    append(`${id} 0 obj\n${body}\nendobj\n`);
  };
  append('%PDF-1.4\n');
  object(1, '<< /Type /Catalog /Pages 2 0 R >>');
  object(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  object(
    3,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`
  );
  offsets[4] = length;
  append(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`
  );
  append(jpeg);
  append('\nendstream\nendobj\n');
  const commands = `q\n${w} 0 0 ${h} 0 0 cm\n/Im0 Do\nQ\n`;
  object(5, `<< /Length ${encoder.encode(commands).length} >>\nstream\n${commands}endstream`);
  const xref = length;
  append('xref\n0 6\n0000000000 65535 f \n');
  for (const offset of offsets.slice(1)) append(`${String(offset).padStart(10, '0')} 00000 n \n`);
  append(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(chunks, { type: 'application/pdf' });
}
