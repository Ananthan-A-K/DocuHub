import {
  Combine,
  Minimize2,
  Scissors,
  FileText,
  FileUp,
} from "lucide-react";

export const PDF_TOOLS = Object.freeze([
  {
    id: "pdf-merge",
    title: "Merge PDF",
    description: "Combine PDFs",
    href: "/dashboard/pdf-merge",
    icon: Combine,
  },

  // ✅ Document to PDF
  {
    id: "document-to-pdf",
    title: "Document to PDF",
    description: "Convert documents to PDF",
    href: "/dashboard/document-to-pdf",
    icon: FileText,
  },

  // ✅ NEW — JPG to PDF tool (ADDED)
  {
    id: "jpg-to-pdf",
    title: "JPG to PDF",
    description: "Convert JPG/IMG images to PDF",
    href: "/tool/jpg-to-pdf",
    icon: FileText,
  },

  {
    id: "pdf-compress",
    title: "Compress PDF",
    description: "Reduce file size",
    href: "/tool/pdf-compress",
    icon: Minimize2,
  },

  {
    id: "pdf-split",
    title: "Split PDF",
    description: "Split pages",
    href: "/dashboard/pdf-split",
    icon: Scissors,
  },

  {
    id: "pdf-protect",
    title: "Protect PDF",
    description: "Add password protection",
    href: "/tool/pdf-protect",
    icon: FileText,
  },

  {
    id: "pdf-redact",
    title: "Redact PDF",
    description: "Remove sensitive information",
    href: "/tool/pdf-redact",
    icon: FileUp,
  },

  {
    id: "metadata-viewer",
    title: "Metadata Viewer",
    description: "View PDF metadata details",
    href: "/tool/metadata-viewer",
    icon: FileText,
  },

  // ✅ Watermark Tool
  {
    id: "pdf-watermark",
    title: "Watermark PDF",
    description: "Add text watermark to PDF files",
    href: "/tool/pdf-watermark",
    icon: FileText,
  },
]);
