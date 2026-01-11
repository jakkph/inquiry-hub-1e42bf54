import { cn } from "@/lib/utils";

interface CodeBlockProps {
  title?: string;
  code: string;
  language?: string;
  className?: string;
}

export function CodeBlock({ title, code, language = "json", className }: CodeBlockProps) {
  return (
    <div className={cn("rounded-md border border-border overflow-hidden", className)}>
      {title && (
        <div className="bg-secondary/50 px-4 py-2 border-b border-border flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{title}</span>
          <span className="font-mono text-[10px] text-muted-foreground/50">{language}</span>
        </div>
      )}
      <pre className="bg-card p-4 overflow-x-auto">
        <code className="font-mono text-xs text-foreground whitespace-pre">{code}</code>
      </pre>
    </div>
  );
}
