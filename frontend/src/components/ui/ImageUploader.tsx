"use client";

import React, { useRef, useState } from "react";
import { Upload, X } from "lucide-react";

export interface StagedImage {
  file: File;
  previewUrl: string;
}

interface ImageUploaderProps {
  /** Existing image URLs already saved (e.g. when editing a product). */
  existingUrls?: string[];
  maxImages?: number;
  onChange: (files: File[]) => void;
  label?: string;
  /** "logo" renders a small circular avatar-style dropzone; "grid" renders the product-style row of boxes. */
  variant?: "logo" | "grid";
}

/**
 * Manual, user-initiated image upload widget (PROMPT.md items 4 & 8).
 *
 * Selecting a file only stages a local preview via `URL.createObjectURL` —
 * it does NOT upload anywhere by itself. The parent form collects the
 * staged `File[]` via `onChange` and uploads them itself (e.g. to a
 * Supabase Storage bucket) only when the user submits the surrounding
 * form / explicit "Upload" action. This also avoids the auto-upload state
 * churn that was causing the page-reload bug (item 7).
 */
export const ImageUploader: React.FC<ImageUploaderProps> = ({
  existingUrls = [],
  maxImages = 3,
  onChange,
  label,
  variant = "grid",
}) => {
  const [staged, setStaged] = useState<StagedImage[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const totalCount = existingUrls.length + staged.length;

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const remaining = maxImages - totalCount;
    if (remaining <= 0) return;

    const newFiles = Array.from(fileList).slice(0, remaining);
    const newStaged = newFiles.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));

    const merged = [...staged, ...newStaged];
    setStaged(merged);
    onChange(merged.map((s) => s.file));

    // Reset the input so selecting the same file again re-triggers onChange.
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeStaged = (index: number) => {
    const merged = staged.filter((_, i) => i !== index);
    setStaged(merged);
    onChange(merged.map((s) => s.file));
  };

  if (variant === "logo") {
    const preview = staged[0]?.previewUrl || existingUrls[0];
    return (
      <div className="flex flex-col items-center gap-2">
        {label && <span className="text-sm font-bold text-[#111111] self-start">{label}</span>}
        <div className="relative w-20 h-20">
          <div className="w-20 h-20 rounded-full bg-[#EAEAEA] border-2 border-dashed border-[#B7B7B7] flex items-center justify-center overflow-hidden">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Store logo preview" className="w-full h-full object-cover" />
            ) : (
              <Upload className="w-6 h-6 text-[#B7B7B7]" />
            )}
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#FA1EFF] text-white flex items-center justify-center shadow-md hover:bg-[#E000EC]"
            aria-label="Upload store logo"
          >
            +
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        {label && <span className="text-sm font-bold text-[#111111]">{label}</span>}
        <span className="text-xs text-[#B7B7B7]">
          {totalCount} / {maxImages} photos
        </span>
      </div>

      <div className="flex flex-wrap gap-3">
        {existingUrls.map((url, i) => (
          <div key={`existing-${i}`} className="relative w-24 h-24 rounded-xl overflow-hidden border border-[#EAEAEA]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Product image ${i + 1}`} className="w-full h-full object-cover" />
          </div>
        ))}

        {staged.map((s, i) => (
          <div key={`staged-${i}`} className="relative w-24 h-24 rounded-xl overflow-hidden border border-[#EAEAEA]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.previewUrl} alt={`Staged image ${i + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeStaged(i)}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
              aria-label="Remove image"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        {totalCount < maxImages && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-24 h-24 rounded-xl border-2 border-dashed border-[#B7B7B7] flex flex-col items-center justify-center gap-1 text-[#B7B7B7] hover:border-[#FA1EFF] hover:text-[#FA1EFF] transition-colors"
          >
            <Upload className="w-5 h-5" />
            <span className="text-[10px] font-bold">Upload Photos</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
};
