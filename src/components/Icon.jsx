"use client";

import { DynamicIcon } from "lucide-react/dynamic";

export function Icon({ name, className, size = 18 }) {
  return (
    <DynamicIcon name={name} className={className} size={size} aria-hidden />
  );
}
