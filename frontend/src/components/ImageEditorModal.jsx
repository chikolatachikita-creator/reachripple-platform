import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { X, RotateCw, RotateCcw, Check, Crop as CropIcon } from "lucide-react";

/**
 * ImageEditorModal — crop + rotate an image and return the result as a File.
 *
 * Props:
 *  - src        : data URL or blob URL of the source image
 *  - filename   : name to use for the produced File
 *  - aspect     : desired crop aspect ratio (default 3/4 portrait, common for listings)
 *  - onCancel() : close without saving
 *  - onSave({ file, preview }) : called with the cropped/rotated File + dataURL
 */
export default function ImageEditorModal({
  src,
  filename = "image.jpg",
  aspect = 3 / 4,
  onCancel,
  onSave,
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [aspectRatio, setAspectRatio] = useState(aspect);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_, areaPixels) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    setSaving(true);
    try {
      const { file, preview } = await getCroppedImg(src, croppedAreaPixels, rotation, filename);
      onSave({ file, preview });
    } catch (err) {
      console.error("crop failed", err);
      onCancel();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-zinc-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <CropIcon className="w-5 h-5 text-pink-400" /> Edit photo
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 hover:bg-white/10 rounded-lg transition"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>

        {/* Cropper area */}
        <div className="relative flex-1 bg-black min-h-[55vh]">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspectRatio}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
            objectFit="contain"
          />
        </div>

        {/* Controls */}
        <div className="px-5 py-4 border-t border-white/10 bg-zinc-900 space-y-3">
          {/* Aspect chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-white/60 mr-1">Ratio:</span>
            {[
              { label: "Portrait 3:4", value: 3 / 4 },
              { label: "Square 1:1", value: 1 },
              { label: "Landscape 4:3", value: 4 / 3 },
              { label: "Wide 16:9", value: 16 / 9 },
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setAspectRatio(opt.value)}
                className={`px-3 py-1 text-xs rounded-full border transition ${
                  Math.abs(aspectRatio - opt.value) < 0.01
                    ? "bg-pink-500 border-pink-500 text-white"
                    : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Zoom + rotate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center gap-3">
              <span className="text-xs text-white/60 w-12">Zoom</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-pink-500"
              />
            </label>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
                className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white text-sm flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" /> Rotate
              </button>
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white text-sm flex items-center gap-1.5"
              >
                <RotateCw className="w-4 h-4" /> Rotate
              </button>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-white/70 hover:text-white text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !croppedAreaPixels}
              className="px-5 py-2 bg-gradient-to-r from-pink-500 to-purple-500 hover:brightness-110 text-white font-semibold text-sm rounded-lg shadow flex items-center gap-2 disabled:opacity-50"
            >
              <Check className="w-4 h-4" /> {saving ? "Saving..." : "Apply"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

function getRadianAngle(deg) {
  return (deg * Math.PI) / 180;
}

function rotateSize(width, height, rotation) {
  const rad = getRadianAngle(rotation);
  return {
    width: Math.abs(Math.cos(rad) * width) + Math.abs(Math.sin(rad) * height),
    height: Math.abs(Math.sin(rad) * width) + Math.abs(Math.cos(rad) * height),
  };
}

async function getCroppedImg(imageSrc, pixelCrop, rotation, filename) {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas context");

  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.width,
    image.height,
    rotation
  );

  // Draw rotated image onto an interim canvas
  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(getRadianAngle(rotation));
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);

  // Extract the cropped region from the rotated canvas
  const data = ctx.getImageData(pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height);

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.putImageData(data, 0, 0);

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/jpeg", 0.92);
  });
  const safeName = filename.replace(/\.(png|webp|gif|bmp)$/i, ".jpg");
  const file = new File([blob], safeName, { type: "image/jpeg" });
  const preview = await new Promise((resolve) => {
    const r = new FileReader();
    r.onload = (e) => resolve(e.target.result);
    r.readAsDataURL(blob);
  });
  return { file, preview };
}
