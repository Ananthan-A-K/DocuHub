'use client';

import { useState } from 'react';
import { PDFDocument } from 'pdf-lib';

export default function PdfMergePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

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

  const droppedFiles = Array.from(e.dataTransfer.files).filter(
    (file) => file.type === 'application/pdf'
  );

  if (droppedFiles.length === 0) return;

  setFiles((prev) => [...prev, ...droppedFiles]);
};

  const handleMerge = async () => {
    if (files.length < 2) {
      alert('Please select at least 2 PDF files');
      return;
    }

    setLoading(true);

    try {
      const mergedPdf = await PDFDocument.create();

      for (const file of files) {
        const bytes = await file.arrayBuffer();
        const pdf = await PDFDocument.load(bytes);
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        pages.forEach((page: any) => mergedPdf.addPage(page));
      }

      const mergedBytes = await mergedPdf.save();
const blob = new Blob([new Uint8Array(mergedBytes)], {
  type: 'application/pdf',
});



      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'merged.pdf';
      a.click();

      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to merge PDFs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
  style={{
    padding: '2rem',
    border: isDragging ? '2px dashed #4f46e5' : '2px dashed #ccc',
    backgroundColor: isDragging ? '#eef2ff' : 'transparent',
    borderRadius: '8px',
  }}
  onDragOver={handleDragOver}
  onDragLeave={handleDragLeave}
  onDrop={handleDrop}
>

      <h1>PDF Merge</h1>
      <p>Select multiple PDF files to merge them into one.</p>
      <p style={{ color: '#666', marginTop: '0.5rem' }}>
  Drag & drop PDF files here, or use the file picker below.
</p>


      <input
        type="file"
        accept="application/pdf"
        multiple
        onChange={(e) => {
          if (!e.target.files) return;
          setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
        }}
      />

      <p>{files.length} file(s) selected</p>

      <button
        onClick={handleMerge}
        disabled={loading || files.length < 2}
        style={{ marginTop: '1rem' }}
      >
        {loading ? 'Merging...' : 'Merge PDFs'}
      </button>
    </div>
  );
}
