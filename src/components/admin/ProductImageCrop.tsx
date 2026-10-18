import { useEffect, useState } from "react";
import { cropProductImage } from "@/lib/product-image-crop";

export function ProductImageCrop({
  file,
  top,
  bottom,
  onChange,
}: {
  file: File;
  top: number;
  bottom: number;
  onChange: (top: number, bottom: number) => void;
}) {
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    let url = "";
    setError("");
    const timer = setTimeout(() => {
      void cropProductImage(file, top, bottom)
        .then((result) => {
          if (active) {
            url = URL.createObjectURL(result);
            setPreview(url);
          }
        })
        .catch((e) => {
          if (active) setError(e instanceof Error ? e.message : "Could not preview crop.");
        });
    }, 120);
    return () => {
      active = false;
      clearTimeout(timer);
      if (url) URL.revokeObjectURL(url);
    };
  }, [file, top, bottom]);
  return (
    <div className="space-y-3">
      {preview && (
        <img
          src={preview}
          alt="Cropped product preview"
          className="max-h-80 w-full rounded bg-white object-contain"
        />
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <label className="block text-sm">
        Trim top: {top}%
        <input
          type="range"
          min="0"
          max="35"
          step="1"
          value={top}
          onChange={(e) => onChange(Number(e.target.value), bottom)}
          className="mt-2 block w-full"
        />
      </label>
      <label className="block text-sm">
        Trim bottom: {bottom}%
        <input
          type="range"
          min="0"
          max="35"
          step="1"
          value={bottom}
          onChange={(e) => onChange(top, Number(e.target.value))}
          className="mt-2 block w-full"
        />
      </label>
      <button type="button" className="text-sm underline" onClick={() => onChange(0, 0)}>
        Reset crop
      </button>
      <p className="text-xs text-muted-foreground">
        Preview the trim before saving. Your original photograph is unchanged.
      </p>
    </div>
  );
}
