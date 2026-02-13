"use client";

import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Copy,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Tesseract from "tesseract.js";
import { getStoredFile, clearStoredFile } from "@/lib/fileStore";
import { PDFDocument } from "pdf-lib";

export default function ProcessingPage() {
  const router = useRouter();
  const params = useParams();
  const toolId = params.id as string;

  const [status, setStatus] = useState<
    "idle" | "processing" | "done" | "error"
  >("idle");

  const [progress, setProgress] = useState(0);
  const [extractedText, setExtractedText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [compressedPdfData, setCompressedPdfData] = useState<string | null>(null);

  /* --------------------------------------------------
     INIT
  -------------------------------------------------- */
  useEffect(() => {
    const storedFile = getStoredFile();

    if (!storedFile) {
      router.push(`/tool/${toolId}`);
      return;
    }

    const fileData = storedFile.data;

    if (toolId === "ocr") {
      runOCR(fileData);
    } else if (toolId === "pdf-compress") {
      startCompressFlow(fileData);
    } else if (toolId === "pdf-protect") {
      protectPDF(fileData);
    } else {
      setStatus("done");
      clearStoredFile();
    }
  }, [toolId]);

  /* --------------------------------------------------
     OCR
  -------------------------------------------------- */
  const runOCR = async (base64Data: string) => {
    setStatus("processing");
    setProgress(0);

    try {
      const result = await Tesseract.recognize(base64Data, "eng", {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      setExtractedText(result.data.text);
      setStatus("done");
      clearStoredFile();
    } catch (err) {
      console.error(err);
      setStatus("error");
      setErrorMessage("Failed to extract text.");
    }
  };

  /* --------------------------------------------------
     PDF COMPRESS
  -------------------------------------------------- */
  const startCompressFlow = async (base64Data: string) => {
    setStatus("processing");
    setProgress(20);

    try {
      const targetSize = localStorage.getItem("targetSize") || "1MB";

      let targetBytes = 0;

      if (targetSize.includes("KB")) {
        const kb = Number(targetSize.replace("KB", ""));
        targetBytes = kb * 1024;
      } else {
        const mb = Number(targetSize.replace("MB", ""));
        targetBytes = mb * 1024 * 1024;
      }

      const res = await fetch("/api/compress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64: base64Data,
          targetBytes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Compression failed");
      }

      setCompressedPdfData(data.file);

      setProgress(100);
      setStatus("done");
      clearStoredFile();
    } catch (err) {
      console.error(err);
      setStatus("error");
      setErrorMessage("Failed to compress PDF.");
    }
  };

  /* --------------------------------------------------
     PDF PROTECT
  -------------------------------------------------- */
  const protectPDF = async (base64Data: string) => {
    setStatus("processing");
    setProgress(20);

    try {
      const cleanedBase64 = base64Data.split(",")[1] || base64Data;

      const pdfBytes = Uint8Array.from(
        atob(cleanedBase64),
        (c) => c.charCodeAt(0)
      );

      setProgress(50);

      const pdfDoc = await PDFDocument.load(pdfBytes);

      setProgress(70);

      const savedBytes = await pdfDoc.save();

      const blob = new Blob([savedBytes], {
        type: "application/pdf",
      });

      const url = URL.createObjectURL(blob);
      localStorage.setItem("protectedPDF", url);

      setProgress(100);
      setStatus("done");
      clearStoredFile();
    } catch (err) {
      console.error(err);
      setStatus("error");
      setErrorMessage("Failed to protect PDF.");
    }
  };

  /* --------------------------------------------------
     COPY HANDLER
  -------------------------------------------------- */
  const handleCopyText = async () => {
    if (!extractedText) return;
    await navigator.clipboard.writeText(extractedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* --------------------------------------------------
     UI STATES
  -------------------------------------------------- */

  if (status === "processing") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#eef6f5]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4" />
          <p>{progress}% complete</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#eef6f5]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p>{errorMessage}</p>
        </div>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="min-h-screen bg-[#eef6f5] py-12">
        <div className="container mx-auto px-6 max-w-3xl">
          <div className="text-center mb-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-[#1e1e2e] mb-2">
              {toolId === "pdf-compress"
                ? "PDF Compressed Successfully!"
                : toolId === "pdf-protect"
                ? "PDF Protected Successfully!"
                : "Text Extracted Successfully!"}
            </h2>
          </div>

          <div className="flex justify-center gap-4 mb-6">
            {toolId === "ocr" && (
              <button
                onClick={handleCopyText}
                className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50"
              >
                <Copy className="w-4 h-4" />
                {copied ? "Copied!" : "Copy Text"}
              </button>
            )}

            {toolId === "pdf-compress" && compressedPdfData && (
              <button
                onClick={() => {
                  const blob = new Blob(
                    [Uint8Array.from(atob(compressedPdfData), (c) => c.charCodeAt(0))],
                    { type: "application/pdf" }
                  );
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "compressed.pdf";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg"
              >
                Download PDF
              </button>
            )}

            {toolId === "pdf-protect" && (
              <button
                onClick={() => {
                  const url = localStorage.getItem("protectedPDF");
                  if (url) {
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "protected.pdf";
                    a.click();
                  }
                }}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg"
              >
                Download Protected PDF
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#eef6f5]">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  );
}
