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

    } else if (toolId === "jpeg-to-pdf") {
      convertJpegToPdfFlow(fileData);

    } else {
      setStatus("done");
      clearStoredFile();
    }
  }, [toolId]);

  /* OCR */
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

  /* PDF COMPRESS */
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

      if (!res.ok) throw new Error(data.error || "Compression failed");

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

  /* PDF PROTECT */
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
      const buffer = savedBytes.buffer as ArrayBuffer;

      const blob = new Blob([buffer], { type: "application/pdf" });

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

  /* JPEG → PDF */
  const convertJpegToPdfFlow = async (base64Data: string) => {
    setStatus("processing");
    setProgress(20);

    try {
      const cleanedBase64 = base64Data.split(",")[1] || base64Data;

      const imageBytes = Uint8Array.from(
        atob(cleanedBase64),
        (c) => c.charCodeAt(0)
      );

      setProgress(50);

      const pdfDoc = await PDFDocument.create();
      const image = await pdfDoc.embedJpg(imageBytes);

      const page = pdfDoc.addPage([image.width, image.height]);

      page.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height,
      });

      const pdfBytes = await pdfDoc.save();

      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], {
        type: "application/pdf",
      });

      const url = URL.createObjectURL(blob);
      localStorage.setItem("jpegPdf", url);

      setProgress(100);
      setStatus("done");
      clearStoredFile();

    } catch (err) {
      console.error(err);
      setStatus("error");
      setErrorMessage("Failed to convert JPEG to PDF.");
    }
  };

  const handleCopyText = async () => {
    if (!extractedText) return;
    await navigator.clipboard.writeText(extractedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* UI STATES */

  if (status === "processing") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#eef6f5]">
        <Loader2 className="h-10 w-10 animate-spin" />
        <p className="ml-3">{progress}%</p>
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
            <h2 className="text-2xl font-semibold mb-2">
              {toolId === "jpeg-to-pdf"
                ? "JPEG Converted to PDF!"
                : "Done Successfully!"}
            </h2>
          </div>

          {/* DOWNLOAD BUTTON */}
          {toolId === "jpeg-to-pdf" && (
            <div className="flex justify-center">
              <button
                onClick={() => {
                  const url = localStorage.getItem("jpegPdf");
                  if (url) {
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "converted.pdf";
                    a.click();
                  }
                }}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg"
              >
                Download PDF
              </button>
            </div>
          )}

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  );
}
