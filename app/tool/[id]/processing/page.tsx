"use client";

import { Loader2, CheckCircle, AlertCircle, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Tesseract from "tesseract.js";
import { getStoredFiles, clearStoredFiles } from "@/lib/fileStore";
import { PDFDocument, rgb, degrees } from "pdf-lib";

export default function ProcessingPage() {
  const router = useRouter();
  const params = useParams();
  const toolId = params.id as string;

  const [status, setStatus] = useState<"processing" | "done" | "error">("processing");
  const [progress, setProgress] = useState(0);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [downloadUrls, setDownloadUrls] = useState<string[]>([]);

  /* ================= RUN TOOL ================= */
  useEffect(() => {
    const run = async () => {
      const files = getStoredFiles();

      if (!files.length) {
        router.push(`/tool/${toolId}`);
        return;
      }

      try {
        if (toolId === "ocr") await runOCR(files[0].data);
        else if (toolId === "pdf-protect") await protectPDF(files);
        else if (toolId === "jpeg-to-pdf") await imageToPdf(files, "jpg");
        else if (toolId === "png-to-pdf") await imageToPdf(files, "png");
        else if (toolId === "pdf-watermark") await watermarkPDF(files);
        else setStatus("done");
      } catch (e) {
        console.error(e);
        setError("Processing failed");
        setStatus("error");
      } finally {
        clearStoredFiles();
      }
    };

    run();
  }, [toolId, router]);

  /* ================= OCR ================= */
  const runOCR = async (base64: string) => {
    const res = await Tesseract.recognize(base64, "eng", {
      logger: (m) => {
        if (m.status === "recognizing text") {
          setProgress(Math.round(m.progress * 100));
        }
      },
    });

    setText(res.data.text);
    setStatus("done");
  };

  /* ================= WATERMARK ================= */
  const watermarkPDF = async (files: any[]) => {
    const text = localStorage.getItem("watermarkText") || "";
    const rotation = Number(localStorage.getItem("watermarkRotation") || 45);
    const opacity = Number(localStorage.getItem("watermarkOpacity") || 40) / 100;

    const urls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const bytes = base64ToBytes(files[i].data);
      const pdf = await PDFDocument.load(bytes);
      const pages = pdf.getPages();

      pages.forEach((page) => {
        const { width, height } = page.getSize();

        page.drawText(text, {
          x: width / 3,
          y: height / 2,
          size: 50,
          rotate: degrees(rotation),
          color: rgb(0.75, 0.75, 0.75),
          opacity,
        });
      });

      const saved = await pdf.save();
      urls.push(makeBlobUrl(saved));
    }

    setDownloadUrls(urls);
    setStatus("done");
  };

  /* ================= PDF PROTECT ================= */
  const protectPDF = async (files: any[]) => {
    const urls: string[] = [];

    for (const f of files) {
      const bytes = base64ToBytes(f.data);
      const pdf = await PDFDocument.load(bytes);
      const saved = await pdf.save();
      urls.push(makeBlobUrl(saved));
    }

    setDownloadUrls(urls);
    setStatus("done");
  };

  /* ================= IMAGE → PDF ================= */
  const imageToPdf = async (files: any[], type: "jpg" | "png") => {
    const urls: string[] = [];

    for (const f of files) {
      const bytes = base64ToBytes(f.data);
      const pdf = await PDFDocument.create();

      const img =
        type === "jpg"
          ? await pdf.embedJpg(bytes)
          : await pdf.embedPng(bytes);

      const page = pdf.addPage([img.width, img.height]);

      page.drawImage(img, {
        x: 0,
        y: 0,
        width: img.width,
        height: img.height,
      });

      const saved = await pdf.save();
      urls.push(makeBlobUrl(saved));
    }

    setDownloadUrls(urls);
    setStatus("done");
  };

  /* ================= HELPERS ================= */

  const base64ToBytes = (base64: string) => {
    const clean = base64.includes(",") ? base64.split(",")[1] : base64;
    return Uint8Array.from(atob(clean), (c) => c.charCodeAt(0));
  };

  const makeBlobUrl = (bytes: Uint8Array) => {
    const blob = new Blob([new Uint8Array(bytes)], {
      type: "application/pdf",
    });
    return URL.createObjectURL(blob);
  };

  const copyText = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const download = (url: string, index: number) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `result-${index + 1}.pdf`;
    a.click();
  };

  /* ================= UI STATES ================= */

  if (status === "processing")
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin" />
        <p className="ml-3">{progress}%</p>
      </div>
    );

  if (status === "error")
    return (
      <div className="min-h-screen flex items-center justify-center text-center">
        <div>
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
          <p>{error}</p>
        </div>
      </div>
    );

  /* ================= SUCCESS UI ================= */

  return (
    <div className="min-h-screen flex items-center justify-center text-center">
      <div>
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-4">Completed Successfully</h2>

        {downloadUrls.map((url, i) => (
          <button
            key={i}
            onClick={() => download(url, i)}
            className="block mx-auto mb-3 px-6 py-3 bg-black text-white rounded-lg"
          >
            Download File {i + 1}
          </button>
        ))}

        {toolId === "ocr" && (
          <button
            onClick={copyText}
            className="mt-4 px-6 py-3 border rounded-lg"
          >
            <Copy className="inline w-4 h-4 mr-2" />
            {copied ? "Copied!" : "Copy Text"}
          </button>
        )}
      </div>
    </div>
  );
}
