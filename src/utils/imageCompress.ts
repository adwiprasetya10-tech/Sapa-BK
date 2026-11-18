export interface CompressedImageResult {
  dataUrl: string;
  name: string;
  sizeKB: number;
}

export function compressImageFile(
  file: File,
  maxDimension = 1000,
  quality = 0.78
): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('File harus berupa gambar (JPG, PNG, atau WEBP).'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.onload = () => {
      const rawDataUrl = String(reader.result || '');
      const img = new Image();
      img.onerror = () => reject(new Error('Format gambar tidak dapat dimuat.'));
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width >= height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({
              dataUrl: rawDataUrl,
              name: file.name,
              sizeKB: Math.round((rawDataUrl.length * 0.75) / 1024),
            });
            return;
          }

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          const compressed = canvas.toDataURL('image/jpeg', quality);
          const sizeKB = Math.max(1, Math.round((compressed.length * 0.75) / 1024));
          resolve({
            dataUrl: compressed,
            name: file.name,
            sizeKB,
          });
        } catch (err) {
          reject(err instanceof Error ? err : new Error('Gagal mengompres gambar.'));
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  });
}
