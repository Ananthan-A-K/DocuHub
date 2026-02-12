"use client";

import Link from "next/link";
import {
  Minimize2,
  Trash2,
  X,
  ArrowLeft,
  Upload,
  Combine,
  Scissors,
  FileUp,
  Loader2,
  FileText,
} from "lucide-react";

import { ToolCard } from "@/components/ToolCard";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

import { storeFile } from "@/lib/fileStore";
import {
  saveToolState,
  loadToolState,
  clearToolState,
} from "@/lib/toolStateStorage";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

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
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [persistedFileMeta, setPersistedFileMeta] = useState<{
    name: string;
    size: number;
    type: string;
  } | null>(null);

  const [compressionLevel, setCompressionLevel] = useState<
    "low" | "medium" | "high"
  >("medium");

  /* Restore persisted state */
  useEffect(() => {
    if (!toolId) return;
    const stored = loadToolState(toolId);
    if (stored?.fileMeta) setPersistedFileMeta(stored.fileMeta);
  }, [toolId]);

  /* Persist state */
  useEffect(() => {
    if (!toolId) return;
    if (selectedFile) {
      saveToolState(toolId, {
        fileMeta: {
          name: selectedFile.name,
          size: selectedFile.size,
          type: selectedFile.type,
        },
      });
    }
  }, [toolId, selectedFile]);

  /* Recent tools tracking */
  useEffect(() => {
    if (!toolId || toolId === "pdf-tools") return;

    localStorage.setItem("lastUsedTool", toolId);
    localStorage.removeItem("hideResume");

    const existing = JSON.parse(localStorage.getItem("recentTools") || "[]");

    const updated = [
      toolId,
      ...existing.filter((t: string) => t !== toolId),
    ].slice(0, 5);

    localStorage.setItem("recentTools", JSON.stringify(updated));
  }, [toolId]);

  /* Warn before refresh */
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!hasUnsavedWork) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () =>
      window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedWork]);

  const getSupportedTypes = () => {
    switch (toolId) {
      case "ocr":
        return [".jpg", ".jpeg", ".png"];
      case "pdf-merge":
      case "pdf-split":
      case "pdf-protect":
      case "pdf-redact":
      case "pdf-compress":
        return [".pdf"];
      default:
        return [];
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = getSupportedTypes();
    const ext = "." + file.name.split(".").pop()?.toLowerCase();

    if (allowed.length && !allowed.includes(ext)) {
      setFileError(`Unsupported file type. Allowed: ${allowed.join(", ")}`);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setFileError(
        `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 10MB.`
      );
      return;
    }

    setFileError(null);
    setSelectedFile(file);
    setFiles((prev) => [...prev, file]);
    setHasUnsavedWork(true);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPersistedFileMeta(null);
    clearToolState(toolId);
    setHasUnsavedWork(false);
  };

  const handleProcessFile = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);

    try {
      const ok = await storeFile(selectedFile);

      if (ok) {
        clearToolState(toolId);
        router.push(`/tool/${toolId}/processing`);
      } else {
        setFileError("Failed to process file.");
      }
    } catch {
      setFileError("Unexpected error occurred.");
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

  if (toolId === "pdf-tools") {
    return (
      <div className="min-h-screen flex flex-col">
        <main className="container mx-auto px-6 py-12 md:px-12">
          <h1 className="text-3xl font-semibold mb-2">PDF Tools</h1>
          <p className="text-muted-foreground mb-12">Choose a PDF tool</p>

          <div className="grid gap-6 md:grid-cols-2 max-w-5xl">
            <ToolCard icon={Combine} title="Merge PDF" description="Combine multiple PDFs" href="/dashboard/pdf-merge" />
            <ToolCard icon={Minimize2} title="Compress PDF" description="Reduce PDF file size" href="/tool/pdf-compress" />
            <ToolCard icon={Scissors} title="Split PDF" description="Split PDF pages" href="/dashboard/pdf-split" />
            <ToolCard icon={FileText} title="Protect PDF" description="Add password protection" href="/tool/pdf-protect" />
            <ToolCard icon={FileUp} title="Document to PDF" description="Convert documents to PDF" href="/dashboard/document-to-pdf" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="container mx-auto px-6 py-12 md:px-12">
        <button onClick={handleBackNavigation} className="inline-flex items-center gap-2 text-sm mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <h1 className="text-3xl font-semibold mb-8">Upload your file</h1>

        {selectedFile && toolId === "pdf-compress" && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <p className="font-medium mb-3">Compression Level</p>

            <div className="space-y-2 text-sm">
              {(["low", "medium", "high"] as const).map((level) => (
                <label key={level} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={compressionLevel === level}
                    onChange={() => setCompressionLevel(level)}
                    className="accent-blue-600"
                  />
                  {level.charAt(0).toUpperCase() + level.slice(1)} Compression
                </label>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
