import { cn } from "@/lib/utils";
import React from "react";

export function CustomLoader({ className, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img
      src="/custom-loader.png"
      alt="Loading..."
      className={cn("animate-spin", className)}
      {...props}
    />
  );
}
