/** Trim a product photograph locally; the original file is never overwritten. */
export async function cropProductImage(file: File, top: number, bottom: number): Promise<File> {
  if (top === 0 && bottom === 0) return file;
  if (![top, bottom].every(Number.isFinite) || top < 0 || bottom < 0 || top + bottom > 70)
    throw new Error("Keep at least 30% of the photograph.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (image.naturalWidth * image.naturalHeight > 40_000_000)
      throw new Error("Choose a photograph smaller than 40 megapixels.");
    const y = Math.round((image.naturalHeight * top) / 100);
    const height = Math.max(1, Math.round((image.naturalHeight * (100 - top - bottom)) / 100));
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 2400 / Math.max(image.naturalWidth, height));
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image cropping is unavailable in this browser.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, y, image.naturalWidth, height, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (result) =>
          result ? resolve(result) : reject(new Error("Could not crop this photograph.")),
        "image/jpeg",
        0.9,
      ),
    );
    if (blob.size > 5 * 1024 * 1024) throw new Error("The cropped photograph must be under 5MB.");
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + "-cropped.jpg", {
      type: "image/jpeg",
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
