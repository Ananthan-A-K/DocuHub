"use client";

import {
  ArrowLeft,
  Upload,
  Combine,
  Scissors,
  FileUp,
  Loader2,
} from "lucide-react";

import { ToolCard } from "@/components/ToolCard";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

// In-memory fallback for large files that can't fit in sessionStorage
let inMemoryFile: { data: string; name: string; type: string } | null = null;

export function getStoredFile() {
  // Try sessionStorage first
  const sessionData = sessionStorage.getItem("ocrFile");
  if (sessionData) {
    return {
      data: sessionData,
      name: sessionStorage.getItem("ocrFileName") || "file",
      type: sessionStorage.getItem("ocrFileType") || "image/png",
    };
  }
  // Fall back to in-memory
  return inMemoryFile;
}

export function clearStoredFile() {
  sessionStorage.removeItem("ocrFile");
  sessionStorage.removeItem("ocrFileName");
  sessionStorage.removeItem("ocrFileType");
  inMemoryFile = null;
}

// Compress image using canvas
async function compressImage(
  file: File,
  maxSizeMB: number = 4
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        // Calculate target dimensions while maintaining aspect ratio
        const maxDimension = 2048; // Max width/height
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height / width) * maxDimension;
            width = maxDimension;
          } else {
            width = (width / height) * maxDimension;
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Start with high quality and reduce if needed
        let quality = 0.9;
        let dataUrl = canvas.toDataURL("image/jpeg", quality);

        // Reduce quality until under maxSizeMB
        const maxBytes = maxSizeMB * 1024 * 1024;
        while (dataUrl.length > maxBytes && quality > 0.1) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }

        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

// Store file with compression fallback
async function storeFile(file: File): Promise<boolean> {
  const maxSessionStorageSize = 4 * 1024 * 1024; // 4MB to be safe

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;

      // If small enough, store directly
      if (dataUrl.length < maxSessionStorageSize) {
        try {
          sessionStorage.setItem("ocrFile", dataUrl);
          sessionStorage.setItem("ocrFileName", file.name);
          sessionStorage.setItem("ocrFileType", file.type);
          resolve(true);
          return;
        } catch {
          // Continue to compression
        }
      }

      // Try compressing if it's an image
      if (file.type.startsWith("image/")) {
        try {
          const compressedDataUrl = await compressImage(file);

          if (compressedDataUrl.length < maxSessionStorageSize) {
            sessionStorage.setItem("ocrFile", compressedDataUrl);
            sessionStorage.setItem("ocrFileName", file.name);
            sessionStorage.setItem("ocrFileType", "image/jpeg");
            resolve(true);
            return;
          }
        } catch (err) {
          console.warn("Compression failed:", err);
        }
      }

      // Fall back to in-memory storage
      inMemoryFile = {
        data: dataUrl,
        name: file.name,
        type: file.type,
      };
      resolve(true);
    };
    reader.onerror = () => resolve(false);
    reader.readAsDataURL(file);
  });
}

export default function ToolUploadPage() {
  const router = useRouter();
  const params = useParams();

  const toolId = Array.isArray(params.id)
    ? params.id[0]
    : (params.id as string);

  const [hasUnsavedWork, setHasUnsavedWork] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /* --------------------------------------------
     Remember last-used tool
  --------------------------------------------- */
  useEffect(() => {
    if (toolId && toolId !== "pdf-tools") {
      localStorage.setItem("lastUsedTool", toolId);
      localStorage.removeItem("hideResume");
    }
  }, [toolId]);

  /* --------------------------------------------
     Warn before refresh / tab close
  --------------------------------------------- */
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!hasUnsavedWork) return;
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedWork]);

  const getSupportedTypes = () => {
    switch (toolId) {
      case "ocr":
        return [".jpg", ".jpeg", ".png"];
      case "pdf-merge":
      case "pdf-split":
      case "pdf-protect":
      case "pdf-redact":
        return [".pdf"];
      default:
        return [];
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = getSupportedTypes();
    const ext = "." + file.name.split(".").pop()?.toLowerCase();

    if (allowed.length && !allowed.includes(ext)) {
      setFileError(`Unsupported file type. Allowed: ${allowed.join(", ")}`);
      e.target.value = "";
      return;
    }

    setFileError(null);
    setSelectedFile(file);
    setHasUnsavedWork(true);
    
    // Don't auto-navigate - let user click "Process File" button
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const allowedTypes = getSupportedTypes();
    const extension =
      "." + file.name.split(".").pop()?.toLowerCase();

    if (allowedTypes.length && !allowedTypes.includes(extension)) {
      setFileError(
        `Unsupported file type. Allowed: ${allowedTypes.join(", ")}`
      );
      return;
    }

    setFileError(null);
    setSelectedFile(file);
    setHasUnsavedWork(true);
  };

  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };

  const handleProcessFile = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setFileError(null);

    try {
      const success = await storeFile(selectedFile);
      if (success) {
        router.push(`/tool/${toolId}/processing`);
      } else {
        setFileError("Failed to process file. Please try again.");
      }
    } catch (err) {
      setFileError("An error occurred while processing the file.");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBackNavigation = () => {
    if (hasUnsavedWork) {
      const confirmLeave = window.confirm(
        "You have unsaved work. Are you sure you want to leave?"
      );
      if (!confirmLeave) return;
    }
    router.push("/dashboard");
  };

  /* --------------------------------------------
     PDF TOOLS LANDING PAGE
  --------------------------------------------- */
  if (toolId === "pdf-tools") {
    return (
      <div className="min-h-screen flex flex-col">
        <main className="flex-1 container mx-auto px-6 py-12 md:px-12">
          <h1 className="text-3xl font-semibold mb-2">PDF Tools</h1>
          <p className="text-muted-foreground mb-12">
            Choose a PDF tool
          </p>

          <div className="grid gap-6 md:grid-cols-2 max-w-5xl">
            <ToolCard
              icon={Combine}
              title="Merge PDF"
              description="Combine multiple PDFs"
              href="/dashboard/pdf-merge"
            />
            <ToolCard
              icon={Scissors}
              title="Split PDF"
              description="Split PDF pages"
              href="/dashboard/pdf-split"
            />
            <ToolCard
              icon={FileUp}
              title="Document to PDF"
              description="Convert documents to PDF"
              href="/dashboard/document-to-pdf"
            />
          </div>
        </main>
      </div>
    );
  }

  /* --------------------------------------------
     GENERIC UPLOAD PAGE
  --------------------------------------------- */
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 container mx-auto px-6 py-12 md:px-12">
        <button
          onClick={handleBackNavigation}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <h1 className="text-3xl font-semibold mb-12">
          Upload your file
        </h1>

        <motion.div
          onClick={handleClickUpload}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-20 text-center cursor-pointer transition-colors ${
            isDraggingOver ? "border-blue-500 bg-blue-50" : "hover:border-gray-400"
          }`}
        >

          <Upload className="mx-auto mb-4" />

          <p>Drag & drop or click to browse</p>
          <p className="text-sm text-gray-500 mt-2">
            Supported: {getSupportedTypes().join(", ")}
          </p>

          <input
            type="file"
            ref={fileInputRef}
            accept={getSupportedTypes().join(",")}
            className="hidden"
            onChange={handleFile}
          />

        </motion.div>

        {selectedFile && (
          <div className="mt-4">

            <p className="font-medium">{selectedFile.name}</p>
            <p className="text-sm text-gray-500">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>

            <button
              onClick={handleProcessFile}
              disabled={isProcessing}
              className="mt-3 px-4 py-2 bg-black text-white rounded disabled:opacity-50 flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Process File"
              )}
            </button>
          </div>
        )}

        {fileError && (
          <p className="mt-3 text-sm text-red-600">{fileError}</p>
        )}

        <div className="flex justify-between text-xs text-muted-foreground mt-4">
          <span>
            Supported formats:{" "}
            {getSupportedTypes().length
              ? getSupportedTypes().join(", ")
              : "—"}
          </span>
          <span>Max file size: 10MB</span>
        </div>
      </main>
    </div>
  );
}
