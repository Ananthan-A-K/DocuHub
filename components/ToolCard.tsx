"use client";

import { Info, LucideIcon, ArrowRight } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type HelpTooltipProps = {
  text: string;
};

export function HelpTooltip({ text }: HelpTooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label="Tool help"
        aria-expanded={open}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="ml-2 text-muted-foreground
          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-primary
          focus-visible:ring-offset-2
          focus-visible:ring-offset-background"
      >
        <Info className="w-4 h-4" />
      </button>

      {open && (
        <div
          role="tooltip"
          className="absolute left-0 top-6 z-20 w-72 rounded-lg border bg-white p-3 text-sm text-[#1e1e2e] shadow-md"
        >
          {text}
        </div>
      )}
    </span>
  );
}

interface ToolCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  active?: boolean;
  disabled?: boolean;
}

export function ToolCard({
  icon: Icon,
  title,
  description,
  href,
  active,
  disabled
}: ToolCardProps) {
  if (disabled) {
    return (
      <div
        className={cn(
          "group relative flex flex-col justify-between overflow-hidden rounded-xl border bg-card p-6 shadow-sm transition-all",
          "opacity-50 cursor-not-allowed border-dashed"
        )}
      >
        <div className="absolute right-4 top-4 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="text-xs font-medium px-2 py-1 rounded bg-muted text-muted-foreground">Coming Soon</span>
        </div>

        <div className="mb-4">
          <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Icon className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-foreground flex items-center">
            {title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {description}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-xl border bg-card p-6 shadow-sm transition-all hover:bg-muted/50 hover:shadow-md",
        active ? "border-primary ring-1 ring-primary" : "border-border"
      )}
    >
      <div className="absolute right-4 top-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
        <ArrowRight className="h-5 w-5 -rotate-45 transition-transform group-hover:rotate-0" />
      </div>

      <div className="mb-4">
        <div className={cn(
          "mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
          active ? "bg-primary/10 text-primary" : "bg-primary/5 text-primary group-hover:bg-primary/10"
        )}>
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="font-semibold text-foreground flex items-center">
          {title}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
          {description}
        </p>
      </div>
    </Link>
  );
}
