"use client";

import Link from "next/link";
import { LucideIcon } from "lucide-react";

type ToolCardProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  disabled?: boolean;
  active?: boolean;
};

export function ToolCard({
  icon: Icon,
  title,
  description,
  href,
  disabled,
  active,
}: ToolCardProps) {
  return (
    <Link
      href={disabled ? "#" : href}
      className={`rounded-xl border p-6 transition flex gap-4 items-start
        ${disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-muted"}
        ${active ? "border-primary" : "border-border"}
      `}
    >
      <Icon className="w-6 h-6 mt-1 text-foreground" />

      <div>
        <h3 className="font-semibold text-lg text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </Link>
  );
}
