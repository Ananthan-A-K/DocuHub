"use client";

import {
  ArrowLeft,
  Upload,
  Loader2,
  FileText,
  Image as ImageIcon,
  CheckCircle
} from "lucide-react";

import { ToolCard } from "@/components/ToolCard";
import { PDF_TOOLS } from "@/lib/pdfTools";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { clearStoredFiles, storeFiles } from "@/lib/fileStore";

import {
  saveToolState,
  loadToolState,
  clearToolState,
} from "@/lib/toolStateStorage";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const UPLOAD_ENABLED_TOOLS = new Set([
  "ocr",
  "jpeg-to-pdf",
  "png-to-pdf",
  "pdf-protect",
  "pdf-compress",
  "pdf-watermark",
  "pdf-page-numbers",
  "pdf-rotate",
]);

const CATEGORY_TOOLS = new Set(["pdf-tools"]);

const MOVED_TO_DASHBOARD: Record<string, string> = {
  "pdf-merge": "/dashboard/pdf-merge",
  "document-to-pdf": "/dashboard/document-to-pdf",
  "pdf-split": "/dashboard/pdf-split",
  "pdf-redact": "/dashboard/pdf-redact",
  "metadata-viewer": "/dashboard/metadata-viewer",
};

export default function ToolUploadPage() {
  const router = useRouter();
  const params = useParams();

  const toolId = Array.isArray(params.id)
    ? params.id[0]
    : (params.id as string);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasUnsavedWork, setHasUnsavedWork] = useState(false);

  const [watermarkText, setWatermarkText] = useState("");
  const [rotationAngle, setRotationAngle] = useState(45);
  const [opacity, setOpacity] = useState(40);

  const [rotateConfig, setRotateConfig] = useState({
    angle: 90,
    pages: "",
  });

  const [pageNumberFormat, setPageNumberFormat] = useState("numeric");
  const [pageNumberFontSize, setPageNumberFontSize] = useState(14);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [persistedFileMeta, setPersistedFileMeta] = useState<{
    name: string;
    size: number;
    type: string;
  } | null>(null);

  useEffect(() => {
    if (!toolId) return;
    const stored = loadToolState(toolId);
    if (stored?.fileMeta) setPersistedFileMeta(stored.fileMeta);
  }, [toolId]);

  useEffect(() => {
    if (!toolId || !selectedFiles.length) return;

    const file = selectedFiles[0];

    saveToolState(toolId, {
      fileMeta: {
        name: file.name,
        size: file.size,
        type: file.type,
      },
    });
  }, [toolId, selectedFiles]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!hasUnsavedWork) return;
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedWork]);

  const getSupportedTypes = () => {
    switch (toolId) {
      case "ocr":
        return [".jpg", ".jpeg", ".png"];

      case "jpeg-to-pdf":
        return [".jpg", ".jpeg"];

      case "png-to-pdf":
        return [".png"];

      case "pdf-merge":
      case "pdf-split":
      case "pdf-protect":
      case "pdf-compress":
      case "pdf-watermark":
      case "pdf-page-numbers":
      case "pdf-rotate":
        return [".pdf"];

      default:
        return [];
    }
  };

  const getFileIcon = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "pdf")
      return <FileText className="w-6 h-6 text-red-500" />;

    if (["jpg", "jpeg", "png"].includes(ext || ""))
      return <ImageIcon className="w-6 h-6 text-blue-500" />;

    return <FileText className="w-6 h-6 text-gray-400" />;
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    clearStoredFiles();

    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // ✅ MAX FILE LIMIT
    const MAX_FILES = 10;
    if (files.length > MAX_FILES) {
      setFileError(`You can upload a maximum of ${MAX_FILES} files.`);
      return;
    }

    const allowed = getSupportedTypes();
    const validFiles: File[] = [];

    for (const file of files) {
      const ext = "." + file.name.split(".").pop()?.toLowerCase();

      if (allowed.length && !allowed.includes(ext)) {
        setFileError(`Unsupported file type: ${file.name}`);
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setFileError(`File too large: ${file.name}`);
        return;
      }

      validFiles.push(file);
    }

    setFileError(null);
    setSelectedFiles(validFiles);
    setHasUnsavedWork(true);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleReplaceFile = () => {
    fileInputRef.current?.click();
  };

  const handleProcessFile = async () => {
    if (!selectedFiles.length) return;

    setIsProcessing(true);

    try {
      const ok = await storeFiles(selectedFiles);

      if (!ok) {
        setFileError("Failed to process file.");
        return;
      }

      if (toolId === "pdf-rotate") {
        localStorage.setItem("pdfRotateConfig", JSON.stringify(rotateConfig));
      }

      if (toolId === "pdf-watermark") {
        localStorage.setItem("watermarkRotation", rotationAngle.toString());
        localStorage.setItem("watermarkText", watermarkText);
        localStorage.setItem("watermarkOpacity", opacity.toString());
      }

      if (toolId === "pdf-page-numbers") {
        localStorage.setItem("pageNumberFormat", pageNumberFormat);
        localStorage.setItem("pageNumberFontSize", pageNumberFontSize.toString());
      }

      clearToolState(toolId);
      router.push(`/tool/${toolId}/processing`);
    } catch {
      setFileError("Unexpected error occurred.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBackNavigation = () => {
    if (hasUnsavedWork) {
      const confirmLeave = window.confirm(
        "You have unsaved work. Leave anyway?"
      );
      if (!confirmLeave) return;
    }
    router.push("/dashboard");
  };

  if (CATEGORY_TOOLS.has(toolId)) {
    return (
      <div className="min-h-screen flex flex-col">
        <main className="container mx-auto px-6 py-12 md:px-12">
          <h1 className="text-3xl font-semibold mb-2">PDF Tools</h1>
          <p className="text-muted-foreground mb-12">Choose a PDF tool</p>

          <div className="grid gap-6 md:grid-cols-2 max-w-5xl">
            {PDF_TOOLS.map(tool => (
              <ToolCard key={tool.id} {...tool} />
            ))}
          </div>
        </main>
      </div>
    );
  }

  const dashboardFallback = MOVED_TO_DASHBOARD[toolId];
  if (!UPLOAD_ENABLED_TOOLS.has(toolId)) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center border rounded-xl p-6">
          <h1 className="text-2xl font-semibold">
            This tool is currently unavailable
          </h1>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-6 w-full py-3 rounded-lg border"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="container mx-auto px-6 py-12 md:px-12">

        <button
          onClick={handleBackNavigation}
          className="inline-flex items-center gap-2 text-sm mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <h1 className="text-3xl font-semibold mb-8">Upload your file</h1>

        <motion.div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => {
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

          <p>
            {selectedFiles.length
              ? `${selectedFiles.length} file(s) selected`
              : persistedFileMeta
              ? `Previously selected: ${persistedFileMeta.name}`
              : "Drag & drop or click to browse"}
          </p>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept={getSupportedTypes().join(",")}
            onChange={handleFile}
          />
        </motion.div>
<p className="text-sm text-gray-500 mt-2">
  Maximum 10 files allowed
</p>

        {fileError && (
          <p className="mt-3 text-sm text-red-600">{fileError}</p>
        )}

        <button
          onClick={handleProcessFile}
          disabled={!selectedFiles.length || isProcessing}
          className="mt-8 w-full py-3 rounded-lg text-sm font-medium bg-black text-white"
        >
          {isProcessing ? "Processing..." : "Process File"}
        </button>

      </main>
    </div>
  );
}
