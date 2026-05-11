import * as React from "react";

import { cn } from "./utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "resize-none border-[rgba(6,20,27,0.14)] placeholder:text-muted-foreground aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive flex field-sizing-content min-h-24 w-full rounded-xl border bg-white px-4 py-3 text-sm text-[#06141B] shadow-[0_1px_2px_rgba(6,20,27,0.04)] transition-[border-color,box-shadow,background-color] outline-none hover:border-[rgba(6,20,27,0.24)] focus-visible:border-[#A36B31] focus-visible:ring-[#EDD987]/40 focus-visible:ring-[4px] disabled:cursor-not-allowed disabled:bg-[rgba(6,20,27,0.04)] disabled:text-[#8a9199] disabled:opacity-100",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
