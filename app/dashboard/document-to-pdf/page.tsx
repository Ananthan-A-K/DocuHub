'use client';

import { useState } from 'react';
import { PDFDocument, StandardFonts } from 'pdf-lib';

export default function DocumentToPdfPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const removeFile = (indexToRemove: number) => {
    setFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...droppedFiles]);
  };

  const handleConvert = async () => {
    if (files.length === 0) {
      alert('Please select a document file');
      return;
    }

    setLoading(true);

    try {
      const file = files[0];
      const text = await file.text();

      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage();

      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      const fontSize = 12;
      const { width, height } = page.getSize();

      page.drawText(text.slice(0, 5000), {
        x: 50,
        y: height - 50,
        size: fontSize,
        font: font,
        maxWidth: width - 100,
        lineHeight: 14,
      });

      const pdfBytes = await pdfDoc.save();

      const blob = new Blob([pdfBytes], {
        type: 'application/pdf',
      });

      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = file.name.replace(/\.[^/.]+$/, "") + ".pdf";
      a.click();

      URL.revokeObjectURL(url);

    } catch (err) {
      console.error(err);
      alert('Failed to convert document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "40px auto",
        padding: "24px",
        border: isDragging ? "2px dashed #4f46e5" : "2px dashed #d1d5db",
        backgroundColor: isDragging ? "#eef2ff" : "#fafafa",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >

      <h1 style={{
        fontSize: "24px",
        fontWeight: "600",
        marginBottom: "6px",
      }}>
        Document to PDF
      </h1>

      <p style={{
        color: "#6b7280",
        fontSize: "14px",
        marginBottom: "16px",
      }}>
        Convert document files into PDF format (client-side, offline).
      </p>

      <input
        type="file"
        accept=".txt,.html,.json"
        onChange={(e) => {
          if (!e.target.files) return;
          setFiles(Array.from(e.target.files));
        }}
      />

      <p>{files.length} file(s) selected</p>

      {files.map((file, index) => (
        <div
          key={index}
          style={{
            padding: "12px",
            marginTop: "10px",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            backgroundColor: "white",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <div>
            📄 {file.name}
            <div style={{ fontSize: "12px", color: "#666" }}>
              {formatFileSize(file.size)}
            </div>
          </div>

          <button
            onClick={() => removeFile(index)}
            style={{
              backgroundColor: "#ef4444",
              color: "white",
              border: "none",
              borderRadius: "6px",
              padding: "6px 10px",
              cursor: "pointer",
            }}
          >
            Remove
          </button>

        </div>
      ))}

      <div style={{ textAlign: "center" }}>
        <button
          onClick={handleConvert}
          disabled={loading || files.length === 0}
          style={{
            marginTop: "20px",
            backgroundColor: loading || files.length === 0 ? "#9ca3af" : "#4f46e5",
            color: "white",
            border: "none",
            borderRadius: "8px",
            padding: "10px 18px",
            cursor: loading || files.length === 0 ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Converting..." : "Convert to PDF"}
        </button>
      </div>

    </div>
  );
}
