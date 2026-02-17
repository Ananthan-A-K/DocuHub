"use client";

import { FileText, ArrowLeftRight, ScanText, LayoutGrid, Search, ArrowRight } from "lucide-react";
import { ToolCard } from "@/components/ToolCard";
import ToolCardSkeleton from "@/components/ToolCardSkeleton";
import RecentFiles from "@/components/RecentFiles";
import RecentlyDeletedFiles from "@/components/RecentlyDeletedFiles";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRecentFiles } from "@/lib/hooks/useRecentFiles";
import { motion } from "framer-motion";

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastTool, setLastTool] = useState<string | null>(null);
  const [hideResume, setHideResume] = useState(false);
  const [recentTools, setRecentTools] = useState<string[]>([]);
  const [toolCounts, setToolCounts] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");

  const pathname = usePathname();

  const {
    recentFiles,
    deletedFiles,
    deleteRecentFile,
    restoreDeletedFile,
    permanentlyDeleteFile,
    clearRecentHistory,
    clearDeletedHistory,
  } = useRecentFiles();

  useEffect(() => {
    setMounted(true);
    setTimeout(() => setIsLoading(false), 800);

    const storedTool = localStorage.getItem("lastUsedTool");
    const dismissedFor = localStorage.getItem("hideResumeFor");

    const storedRecent = JSON.parse(
      localStorage.getItem("recentTools") || "[]"
    );
    setRecentTools(storedRecent);

    const storedCounts = JSON.parse(
      localStorage.getItem("toolUsageCounts") || "{}"
    );
    setToolCounts(storedCounts);

    if (storedTool) {
      setLastTool(storedTool);
      setHideResume(dismissedFor === storedTool);
    }
  }, []);

  if (!mounted) return null;

  const mostUsedTools = Object.entries(toolCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const tools = [
    {
      icon: FileText,
      title: "PDF Tools",
      description: "Work with PDF files",
      href: "/tool/pdf-tools",
    },
    {
      icon: ArrowLeftRight,
      title: "File Conversion",
      description: "Convert document formats",
      href: "/tool/file-conversion",
    },
    {
      icon: ScanText,
      title: "OCR",
      description: "Extract text from images",
      href: "/tool/ocr",
    },
    {
      icon: LayoutGrid,
      title: "Data Tools",
      description: "Clean and process files",
      href: "/tool/data-tools",
    },
  ];

  const filteredTools = tools.filter((tool) =>
    tool.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-background/50">
      <main className="flex-1 container mx-auto px-6 py-12 md:px-12 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Resume Banner */}
          {lastTool && !hideResume && (
            <div className="mb-10 rounded-2xl border border-primary/20 p-6 flex items-center justify-between gap-4 bg-primary/5 shadow-sm backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary text-primary-foreground hidden sm:block">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-primary/80 uppercase tracking-wider">
                    Resume your work
                  </p>
                  <Link
                    href={`/tool/${lastTool}`}
                    className="text-lg font-bold text-foreground hover:text-primary transition-colors flex items-center gap-2"
                  >
                    {lastTool.replace("-", " ").toUpperCase()}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              <button
                onClick={() => {
                  if (lastTool) {
                    localStorage.setItem("hideResumeFor", lastTool);
                  }
                  setHideResume(true);
                }}
                className="p-2 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
              >
                ✕
              </button>
            </div>
          )}

          {/* Page Title + Search */}
          <div className="mb-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
              <div>
                <h1 className="text-4xl font-black tracking-tight mb-2 text-foreground">
                  Workspace
                </h1>
                <p className="text-muted-foreground text-lg">
                  Select a tool to begin processing your documents.
                </p>
              </div>

              {/* Search Bar */}
              <div className="flex items-center gap-3 border border-border/60 rounded-2xl px-4 py-3 bg-card shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all w-full md:w-80">
                <Search className="w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Find a tool..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-transparent outline-none text-sm w-full font-medium"
                />
              </div>
            </div>

            {/* Most Used Tools */}
            {mostUsedTools.length > 0 && search === "" && (
              <div className="mb-12">
                <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4">
                  Frequently Used
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {mostUsedTools.map(([tool, count]) => (
                    <Link
                      key={tool}
                      href={`/tool/${tool}`}
                      className="glass-card p-5 flex flex-col justify-between group"
                    >
                      <span className="font-bold text-foreground group-hover:text-primary transition-colors">
                        {tool.replace("-", " ").toUpperCase()}
                      </span>
                      <span className="text-xs text-muted-foreground mt-2">
                        {count} sessions
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Tools Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 max-w-5xl">
          {isLoading ? (
            <>
              <ToolCardSkeleton />
              <ToolCardSkeleton />
              <ToolCardSkeleton />
              <ToolCardSkeleton />
            </>
          ) : filteredTools.length > 0 ? (
            filteredTools.map((tool) => (
              <ToolCard
                key={tool.title}
                icon={tool.icon}
                title={tool.title}
                description={tool.description}
                href={tool.href}
                disabled={false}
                active={pathname === tool.href}
              />
            ))
          ) : (
            <p className="text-muted-foreground">No tools found.</p>
          )}
        </div>

        <RecentFiles
          files={recentFiles}
          onDelete={deleteRecentFile}
          onClear={clearRecentHistory}
        />
        <RecentlyDeletedFiles
          deletedFiles={deletedFiles}
          onRestore={restoreDeletedFile}
          onPermanentDelete={permanentlyDeleteFile}
          onClear={clearDeletedHistory}
        />
      </main>
    </div>
  );
}
