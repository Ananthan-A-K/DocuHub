"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, WifiOff, ServerOff } from "lucide-react";

export function Header() {
    const pathname = usePathname();

  const isHomeOrDashboard =
    pathname === "/" || pathname === "/dashboard";

  return (
    <header className="sticky top-0 z-50 w-full bg-[#eef6f5] shadow-sm">
      <div className="container mx-auto px-6 md:px-12 flex items-center justify-between py-6">
        {/* Logo Area */}
       {isHomeOrDashboard && (
  <div className="flex flex-col">
    <Link href="/" className="group">
      <span className="text-4xl font-bold text-[#1e1e2e] tracking-tight group-hover:opacity-80 transition-opacity">
        DocuHub
      </span>
    </Link>
    <span className="text-sm text-muted-foreground font-medium tracking-wide">
      Privacy-first, offline document processing
    </span>
  </div>
)}

      </div>

      {/* Banner Strip - Now part of the Header */}
      <div className="w-full bg-[#cadbd9] py-3 border-b border-white/20">
        <div className="container mx-auto px-6 flex flex-wrap items-center justify-center gap-6 md:gap-8 text-[#2d3748] font-medium text-sm md:text-base">
          <span className="flex items-center gap-2">
            <Shield className="w-4 h-4" /> 100% Client-Side
          </span>
          <span className="flex items-center gap-2">
            <WifiOff className="w-4 h-4" /> Works Offline
          </span>
          <span className="flex items-center gap-2">
            <ServerOff className="w-4 h-4" /> No Server Upload
          </span>
        </div>
      </div>
    </header>
  );
}
