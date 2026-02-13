"use client";

import {
  ArrowLeft,
  Upload,
  Loader2,
  FileText,
  Image as ImageIcon,
} from "lucide-react";

import { ToolCard } from "@/components/ToolCard";
import { PDF_TOOLS } from "@/lib/pdfTools";
import { useRouter, useParams } from "next/navigation";
import { useRef, useState } from "react";
import { motion } from "framer-motion";

import { jpgToPdf } from "@/lib/image/jpgToPdf";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function ToolUploadPage() {
  const router = useRouter();
  const params = useParams();

  const toolId = Array.isArray(params.id)
    ? params.id[0]
    : (params.id as string);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /* ---------- SUPPORTED TYPES ---------- */
  const getSupportedTypes = () => {
    if (toolId === "jpg-to-pdf") {
      return [".jpg", ".jpeg", ".img"];
    }
    return [];
  };

  /* ---------- ICON ---------- */
  const getFileIcon = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (["jpg", "jpeg", "img"].includes(ext || "")) {
      return <ImageIcon className="w-6 h-6 text-blue-500" />;
    }

    return <FileText className="w-6 h-6 text-gray-400" />;
  };

  /* ---------- FILE SELECT ---------- */
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
      setFileError("File too large. Max size is 10MB.");
      return;
    }

    setFileError(null);
    setSelectedFile(file);
    setSuccessMsg(false);
    setPdfUrl(null);
  };

  /* ---------- CONVERT ---------- */
  const handleProcessFile = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setSuccessMsg(false);

    try {
      const pdfBytes = await jpgToPdf(selectedFile);

      const blob = new Blob([pdfBytes as BlobPart], {

        type: "application/pdf",
      });

      const url = URL.createObjectURL(blob);

      setPdfUrl(url);
      setSuccessMsg(true);
    } catch (err) {
      console.error(err);
      setFileError("Conversion failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  /* ---------- TOOL GRID ---------- */
  if (toolId === "pdf-tools") {
    return (
      <div className="min-h-screen flex flex-col">
        <main className="container mx-auto px-6 py-12 md:px-12">
          <h1 className="text-3xl font-semibold mb-2">PDF Tools</h1>
          <p className="text-muted-foreground mb-12">Choose a PDF tool</p>

          <div className="grid gap-6 md:grid-cols-2 max-w-5xl">
            {PDF_TOOLS.map((tool) => (
              <ToolCard
                key={tool.id}
                icon={tool.icon}
                title={tool.title}
                description={tool.description}
                href={tool.href}
              />
            ))}
          </div>
        </main>
      </div>
    );
  }

  /* ---------- UI ---------- */
  return (
    <div className="min-h-screen flex flex-col">
      <main className="container mx-auto px-6 py-12 md:px-12">

        <button
          onClick={() => router.push("/dashboard")}
          className="inline-flex items-center gap-2 text-sm mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <h1 className="text-3xl font-semibold mb-8">Upload your file</h1>

        <motion.div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingOver(true);
          }}
          onDragLeave={() => setIsDraggingOver(false)}
          className={`border-2 border-dashed rounded-xl p-20 text-center cursor-pointer ${
            isDraggingOver
              ? "border-blue-500 bg-blue-50"
              : "hover:border-gray-400 hover:bg-gray-50"
          }`}
        >
          <Upload className="mx-auto mb-4" />
          <p>Drag & drop or click to browse</p>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={getSupportedTypes().join(",")}
            onChange={handleFile}
          />
        </motion.div>

        {selectedFile && (
          <div className="mt-6 flex items-center gap-3 p-4 rounded-xl border bg-white shadow-sm">
            {getFileIcon(selectedFile)}

            <div className="flex-1">
              <p className="font-medium">{selectedFile.name}</p>
              <p className="text-sm text-gray-500">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
        )}

        {successMsg && pdfUrl && (
          <div className="mt-6 text-center">
            <p className="text-green-600 font-semibold mb-4">
              Successfully Converted ✓
            </p>

            <a
              href={pdfUrl}
              download="converted.pdf"
              className="inline-block px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800"
            >
              Download PDF
            </a>
          </div>
        )}

        <button
          onClick={handleProcessFile}
          disabled={!selectedFile || isProcessing}
          className={`mt-8 w-full py-3 rounded-lg text-sm font-medium transition ${
            selectedFile && !isProcessing
              ? "bg-black text-white hover:bg-gray-800"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </span>
          ) : (
            "Process File"
          )}
        </button>

        {fileError && (
          <p className="mt-3 text-sm text-red-600">{fileError}</p>
        )}
      </main>
    </div>
  );
}
