import { cn } from "@/lib/utils";

interface Column {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
  format?: (value: unknown) => string;
}

interface TableDisplayProps {
  columns: Column[];
  data: Record<string, unknown>[];
  emptyMessage?: string;
  className?: string;
}

export function TableDisplay({ columns, data, emptyMessage = "No data", className }: TableDisplayProps) {
  return (
    <div className={cn("overflow-hidden rounded-md border border-border", className)}>
      <table className="w-full">
        <thead className="bg-secondary/50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground font-medium",
                  col.align === "right" && "text-right",
                  col.align === "center" && "text-center"
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center font-mono text-xs text-muted-foreground">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr key={i} className="bg-card hover:bg-secondary/30 transition-colors">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-4 py-3 font-mono text-xs text-foreground",
                      col.align === "right" && "text-right",
                      col.align === "center" && "text-center"
                    )}
                  >
                    {col.format ? col.format(row[col.key]) : String(row[col.key] ?? "-")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
