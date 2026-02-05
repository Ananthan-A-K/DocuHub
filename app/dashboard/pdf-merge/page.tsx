'use client';

import { useState } from 'react';
import { PDFDocument } from 'pdf-lib';

export default function PdfMergePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

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
        pages.forEach((page) => mergedPdf.addPage(page));
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
    <div style={{ padding: '2rem' }}>
      <h1>PDF Merge</h1>
      <p>Select multiple PDF files to merge them into one.</p>

      <input
        type="file"
        accept="application/pdf"
        multiple
        onChange={(e) => {
          if (!e.target.files) return;
          setFiles(Array.from(e.target.files));
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
