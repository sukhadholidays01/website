import Image from "next/image";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface ImageReadyMediaProps {
  src: string;
  alt: string;
  imageAvailable: boolean;
  sizes: string;
  className?: string;
  children: ReactNode;
}

export function ImageReadyMedia({
  src,
  alt,
  imageAvailable,
  sizes,
  className,
  children,
}: ImageReadyMediaProps) {
  return (
    <div
      className={cn("relative overflow-hidden bg-brand-light-teal", className)}
      role={imageAvailable ? undefined : "img"}
      aria-label={imageAvailable ? undefined : `${alt} — image ready placeholder`}
    >
      {imageAvailable ? (
        <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" />
      ) : (
        children
      )}
    </div>
  );
}
