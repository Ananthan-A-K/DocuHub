"use client";

import {
  ArrowLeft,
  Upload,
  Loader2,
  FileText,
  Image as ImageIcon,
  CheckCircle,
  ArrowLeftRight,
  ScanText,
  Shield,
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
  "pdf-redact",
  "metadata-viewer",
  "pdf-extract-images",
  "pdf-delete-pages",
  "pdf-page-reorder",
  "pdf-password-remover",
  "pdf-page-numbers",
  "pdf-rotate",
]);
const CATEGORY_TOOLS = new Set(["pdf-tools", "file-conversion", "data-tools"]);
const FILE_CONVERSION_TOOLS = Object.freeze([
  {
    id: "document-to-pdf",
    title: "Document to PDF",
    description: "Convert TXT and DOCX documents to PDF",
    href: "/dashboard/document-to-pdf",
    icon: FileText,
  },
  {
    id: "jpeg-to-pdf",
    title: "JPEG to PDF",
    description: "Convert JPEG images into PDF",
    href: "/tool/jpeg-to-pdf",
    icon: ImageIcon,
  },
  {
    id: "png-to-pdf",
    title: "PNG to PDF",
    description: "Convert PNG images into PDF",
    href: "/tool/png-to-pdf",
    icon: ImageIcon,
  },
]);
const DATA_TOOLS = Object.freeze([
  {
    id: "ocr",
    title: "OCR",
    description: "Extract text from images",
    href: "/tool/ocr",
    icon: ScanText,
  },
  {
    id: "metadata-viewer",
    title: "Metadata Viewer",
    description: "Extract and download PDF metadata",
    href: "/tool/metadata-viewer",
    icon: FileText,
  },
  {
    id: "pdf-redact",
    title: "Redact PDF",
    description: "Flatten PDF pages to remove selectable text",
    href: "/tool/pdf-redact",
    icon: Shield,
  },
]);
const MOVED_TO_DASHBOARD: Record<string, string> = {
  "pdf-merge": "/dashboard/pdf-merge",
  "document-to-pdf": "/dashboard/document-to-pdf",
  "pdf-split": "/dashboard/pdf-split",
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

  /* Rotate PDF */
  const [rotateConfig, setRotateConfig] = useState({
    angle: 90,
    pages: "",
  });

  const [pageNumberFormat, setPageNumberFormat] = useState("numeric");
  const [pageNumberFontSize, setPageNumberFontSize] = useState(14);
  const [compressionLevel, setCompressionLevel] = useState<"low" | "medium" | "high">("medium");
  const [protectPassword, setProtectPassword] = useState("");
  const [passwordRemoverPassword, setPasswordRemoverPassword] = useState("");
  const [deletePagesInput, setDeletePagesInput] = useState("");
  const [reorderPagesInput, setReorderPagesInput] = useState("");
  const [extractImageFormat, setExtractImageFormat] = useState<"png" | "jpg">("png");
  const [redactionStrategy, setRedactionStrategy] = useState<"flatten">("flatten");

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
      case "pdf-redact":
      case "metadata-viewer":
      case "pdf-extract-images":
      case "pdf-delete-pages":
      case "pdf-page-reorder":
      case "pdf-password-remover":
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
    if (toolId === "pdf-protect" && !protectPassword.trim()) {
      setFileError("Please enter a password.");
      return;
    }
    if (toolId === "pdf-password-remover" && !passwordRemoverPassword.trim()) {
      setFileError("Please enter the current password.");
      return;
    }
    if (toolId === "pdf-watermark" && !watermarkText.trim()) {
      setFileError("Please enter watermark text.");
      return;
    }
    if (toolId === "pdf-delete-pages" && !deletePagesInput.trim()) {
      setFileError("Enter at least one page to delete.");
      return;
    }
    if (toolId === "pdf-page-reorder" && !reorderPagesInput.trim()) {
      setFileError("Enter a page order.");
      return;
    }

    setIsProcessing(true);

    try {
      const ok = await storeFiles(
        selectedFiles,
        toolId === "pdf-protect"
          ? { password: protectPassword }
          : toolId === "pdf-password-remover"
          ? { password: passwordRemoverPassword }
          : undefined
      );
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
      if (toolId === "pdf-redact") {
        localStorage.setItem("pdfRedactionStrategy", redactionStrategy);
      }
      if (toolId === "pdf-extract-images") {
        localStorage.setItem("pdfExtractImageFormat", extractImageFormat);
      }
      if (toolId === "pdf-delete-pages") {
        localStorage.setItem("pdfDeletePages", deletePagesInput.trim());
      }
      if (toolId === "pdf-page-reorder") {
        localStorage.setItem("pdfReorderPages", reorderPagesInput.trim());
      }

      if (toolId === "pdf-page-numbers") {
        localStorage.setItem("pageNumberFormat", pageNumberFormat);
        localStorage.setItem("pageNumberFontSize", pageNumberFontSize.toString());
      }

      if (toolId === "pdf-compress") {
        localStorage.setItem("compressionLevel", compressionLevel);
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

  /* Tools page */
  if (CATEGORY_TOOLS.has(toolId)) {
    const categoryConfig =
      toolId === "pdf-tools"
        ? {
            title: "PDF Tools",
            subtitle: "Choose a PDF tool",
            tools: PDF_TOOLS,
            icon: FileText,
          }
        : toolId === "file-conversion"
        ? {
            title: "File Conversion",
            subtitle: "Convert files across supported formats",
            tools: FILE_CONVERSION_TOOLS,
            icon: ArrowLeftRight,
          }
        : {
            title: "Data Tools",
            subtitle: "Extract and process document data",
            tools: DATA_TOOLS,
            icon: ScanText,
          };

    return (
      <div className="min-h-screen flex flex-col">
        <main className="container mx-auto px-6 py-12 md:px-12">
          <div className="flex items-center gap-3 mb-2">
            <categoryConfig.icon className="w-7 h-7 text-primary" />
            <h1 className="text-3xl font-semibold">{categoryConfig.title}</h1>
          </div>
          <p className="text-muted-foreground mb-12">{categoryConfig.subtitle}</p>

          <div className="grid gap-6 md:grid-cols-2 max-w-5xl">
            {categoryConfig.tools.map(tool => (
              <ToolCard key={tool.id} {...tool} />
            ))}
          </div>
        </main>
      </div>
    );
  }

  const dashboardFallback = MOVED_TO_DASHBOARD[toolId];
  if (!UPLOAD_ENABLED_TOOLS.has(toolId)) {
    const heading = dashboardFallback
      ? "This tool moved to Dashboard"
      : "This tool is currently unavailable";
    const details = dashboardFallback
      ? "Use the dashboard route for this tool."
      : "Choose an available tool to continue.";

    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center border rounded-xl p-6">
          <h1 className="text-2xl font-semibold">{heading}</h1>
          <p className="text-muted-foreground mt-2">
            {details} (Tool ID: {toolId})
          </p>
          <div className="mt-6 flex flex-col gap-3">
            {dashboardFallback && (
              <button
                onClick={() => router.push(dashboardFallback)}
                className="w-full py-3 rounded-lg text-sm font-medium bg-black text-white hover:bg-gray-800"
              >
                Open Tool
              </button>
            )}
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full py-3 rounded-lg text-sm font-medium border border-gray-300 hover:bg-gray-50"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* Upload page */
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

        {selectedFiles.length > 0 && (
          <div className="mt-6 space-y-3">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-4 rounded-xl border bg-white shadow-sm"
              >
                {getFileIcon(file)}

                {/* ✅ CHECK ICON ADDED HERE */}
                <div className="flex-1 flex items-start justify-between">
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>

                  {!fileError && (
                    <CheckCircle className="w-4 h-4 text-green-500 mt-1" />
                  )}
                </div>

                <button
                  onClick={handleReplaceFile}
                  className="text-sm text-blue-600 hover:underline mr-3"
                >
                  Replace
                </button>

                <button
                  onClick={() => handleRemoveFile(index)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {toolId === "pdf-rotate" && (
          <div className="mt-6 rounded-xl border bg-white p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Rotation Angle
              </label>
              <select
                value={rotateConfig.angle}
                onChange={e =>
                  setRotateConfig(prev => ({
                    ...prev,
                    angle: Number(e.target.value),
                  }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value={90}>90°</option>
                <option value={180}>180°</option>
                <option value={270}>270°</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Pages (optional)
              </label>
              <input
                type="text"
                value={rotateConfig.pages}
                onChange={e =>
                  setRotateConfig(prev => ({
                    ...prev,
                    pages: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="all pages, or e.g. 1,3-5"
              />
            </div>
          </div>
        )}

        {toolId === "pdf-compress" && (
          <div className="mt-6 rounded-xl border bg-white p-4 space-y-3">
            <p className="text-sm font-medium">Compression Level</p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="compression-level"
                checked={compressionLevel === "low"}
                onChange={() => setCompressionLevel("low")}
              />
              Low (best quality, smaller reduction)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="compression-level"
                checked={compressionLevel === "medium"}
                onChange={() => setCompressionLevel("medium")}
              />
              Medium (balanced)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="compression-level"
                checked={compressionLevel === "high"}
                onChange={() => setCompressionLevel("high")}
              />
              High (smallest size, lowest visual quality)
            </label>
          </div>
        )}

        {toolId === "pdf-watermark" && (
          <div className="mt-6 rounded-xl border bg-white p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Watermark Text
              </label>
              <input
                type="text"
                value={watermarkText}
                onChange={e => setWatermarkText(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="CONFIDENTIAL"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Rotation ({rotationAngle}deg)
              </label>
              <input
                type="range"
                min={-90}
                max={90}
                value={rotationAngle}
                onChange={e => setRotationAngle(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Opacity ({opacity}%)
              </label>
              <input
                type="range"
                min={10}
                max={90}
                value={opacity}
                onChange={e => setOpacity(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        )}

        {toolId === "pdf-redact" && (
          <div className="mt-6 rounded-xl border bg-white p-4 space-y-3">
            <p className="text-sm font-medium">Redaction Strategy</p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="redaction-strategy"
                checked={redactionStrategy === "flatten"}
                onChange={() => setRedactionStrategy("flatten")}
              />
              Flatten each page to image-only PDF (removes selectable text).
            </label>
          </div>
        )}

        {toolId === "pdf-extract-images" && (
          <div className="mt-6 rounded-xl border bg-white p-4 space-y-3">
            <p className="text-sm font-medium">Output Image Format</p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="extract-image-format"
                checked={extractImageFormat === "png"}
                onChange={() => setExtractImageFormat("png")}
              />
              PNG (best quality)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="extract-image-format"
                checked={extractImageFormat === "jpg"}
                onChange={() => setExtractImageFormat("jpg")}
              />
              JPG (smaller files)
            </label>
          </div>
        )}

        {toolId === "pdf-delete-pages" && (
          <div className="mt-6 rounded-xl border bg-white p-4 space-y-2">
            <label className="block text-sm font-medium">
              Pages To Delete
            </label>
            <input
              type="text"
              value={deletePagesInput}
              onChange={e => setDeletePagesInput(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Example: 2,4-6"
            />
          </div>
        )}

        {toolId === "pdf-page-reorder" && (
          <div className="mt-6 rounded-xl border bg-white p-4 space-y-2">
            <label className="block text-sm font-medium">
              New Page Order
            </label>
            <input
              type="text"
              value={reorderPagesInput}
              onChange={e => setReorderPagesInput(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Example: 3,1,2,4"
            />
            <p className="text-xs text-gray-500">
              Include every page once. 1-based indexing.
            </p>
          </div>
        )}

        {toolId === "pdf-protect" && (
          <div className="mt-6 rounded-xl border bg-white p-4 space-y-2">
            <label className="block text-sm font-medium">
              Enter Password
            </label>
            <input
              type="password"
              value={protectPassword}
              onChange={e => setProtectPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Password to protect PDF"
            />
          </div>
        )}

        {toolId === "pdf-password-remover" && (
          <div className="mt-6 rounded-xl border bg-white p-4 space-y-2">
            <label className="block text-sm font-medium">
              Current PDF Password
            </label>
            <input
              type="password"
              value={passwordRemoverPassword}
              onChange={e => setPasswordRemoverPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Password used to open PDF"
            />
          </div>
        )}

        <button
          onClick={handleProcessFile}
          disabled={
            !selectedFiles.length ||
            isProcessing ||
            (toolId === "pdf-protect" && !protectPassword.trim()) ||
            (toolId === "pdf-password-remover" && !passwordRemoverPassword.trim())
          }
          className={`mt-8 w-full py-3 rounded-lg text-sm font-medium transition ${
            selectedFiles.length && !isProcessing
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
