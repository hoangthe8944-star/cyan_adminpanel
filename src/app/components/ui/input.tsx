import * as React from "react";

import { cn } from "./utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-[rgba(6,20,27,0.14)] flex h-11 w-full min-w-0 rounded-xl border bg-white px-4 py-2 text-sm text-[#06141B] shadow-[0_1px_2px_rgba(6,20,27,0.04)] transition-[border-color,box-shadow,background-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-[rgba(6,20,27,0.04)] disabled:text-[#8a9199] disabled:opacity-100",
        "hover:border-[rgba(6,20,27,0.24)] focus-visible:border-[#A36B31] focus-visible:ring-[#EDD987]/40 focus-visible:ring-[4px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
