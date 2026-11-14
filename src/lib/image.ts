const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const MAX_COMPRESSED_BYTES = 100 * 1024;

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not process this image.')), type, quality);
  });
}

/** Resize and compress a user-selected image before putting it in workspace data. */
export async function compressItemPhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('Choose a photo smaller than 12 MB.');

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('This photo could not be opened.'));
    });

    const formatCanvas = document.createElement('canvas');
    const formatContext = formatCanvas.getContext('2d');
    if (!formatContext) throw new Error('Photo processing is unavailable in this browser.');
    formatCanvas.width = 1;
    formatCanvas.height = 1;
    const supportsWebP = formatCanvas.toDataURL('image/webp').startsWith('data:image/webp');
    const type = supportsWebP ? 'image/webp' : 'image/jpeg';

    for (const maxSide of [640, 512, 400, 320]) {
      const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) continue;
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.78, 0.66, 0.54]) {
        const blob = await canvasBlob(canvas, type, quality);
        if (blob.size <= MAX_COMPRESSED_BYTES) {
          return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not save this photo.'));
            reader.onerror = () => reject(new Error('Could not save this photo.'));
            reader.readAsDataURL(blob);
          });
        }
      }
    }
    throw new Error('This photo is still too large after compression. Try a smaller or simpler image.');
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
