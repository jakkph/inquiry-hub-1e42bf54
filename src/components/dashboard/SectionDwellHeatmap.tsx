import { useSectionDwell, SectionDwellData } from "@/hooks/useAnalyticsData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";

interface HeatmapCell {
  sectionKey: string;
  pagePath: string;
  avgDwell: number;
  eventCount: number;
  intensity: number;
}

export function SectionDwellHeatmap() {
  const { data, isLoading, error } = useSectionDwell();

  const { cells, sections, pages, maxDwell } = useMemo(() => {
    if (!data || data.length === 0) {
      return { cells: [], sections: [], pages: [], maxDwell: 0 };
    }

    // Aggregate by section and page (across all days)
    const aggregated = new Map<string, { totalDwell: number; totalCount: number; entries: number }>();
    
    data.forEach((item) => {
      const key = `${item.section_key}|${item.page_path}`;
      const existing = aggregated.get(key);
      if (existing) {
        existing.totalDwell += (item.avg_dwell || 0) * (item.event_count || 1);
        existing.totalCount += item.event_count || 0;
        existing.entries += 1;
      } else {
        aggregated.set(key, {
          totalDwell: (item.avg_dwell || 0) * (item.event_count || 1),
          totalCount: item.event_count || 0,
          entries: 1,
        });
      }
    });

    const cellsData: HeatmapCell[] = [];
    let max = 0;

    aggregated.forEach((value, key) => {
      const [sectionKey, pagePath] = key.split("|");
      const avgDwell = value.totalCount > 0 ? value.totalDwell / value.totalCount : 0;
      max = Math.max(max, avgDwell);
      cellsData.push({
        sectionKey,
        pagePath,
        avgDwell,
        eventCount: value.totalCount,
        intensity: 0, // Will calculate after we know max
      });
    });

    // Calculate intensity (0-1) for each cell
    cellsData.forEach((cell) => {
      cell.intensity = max > 0 ? cell.avgDwell / max : 0;
    });

    const uniqueSections = [...new Set(cellsData.map((c) => c.sectionKey))].sort();
    const uniquePages = [...new Set(cellsData.map((c) => c.pagePath))].sort();

    return { cells: cellsData, sections: uniqueSections, pages: uniquePages, maxDwell: max };
  }, [data]);

  const getIntensityColor = (intensity: number) => {
    if (intensity === 0) return "bg-muted/30";
    if (intensity < 0.2) return "bg-primary/20";
    if (intensity < 0.4) return "bg-primary/40";
    if (intensity < 0.6) return "bg-primary/60";
    if (intensity < 0.8) return "bg-primary/80";
    return "bg-primary";
  };

  const getCellData = (section: string, page: string): HeatmapCell | undefined => {
    return cells.find((c) => c.sectionKey === section && c.pagePath === page);
  };

  const formatDwell = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    return `${(seconds / 60).toFixed(1)}m`;
  };

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="font-mono text-sm text-foreground">
            Section Dwell Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="font-mono text-sm text-foreground">
            Section Dwell Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-mono text-xs text-destructive">Error loading data</p>
        </CardContent>
      </Card>
    );
  }

  if (cells.length === 0) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="font-mono text-sm text-foreground">
            Section Dwell Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48">
            <p className="font-mono text-xs text-muted-foreground">
              No section dwell data available yet
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="font-mono text-sm text-foreground">
            Section Dwell Heatmap
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-muted-foreground">Low</span>
            <div className="flex gap-0.5">
              <div className="w-3 h-3 rounded-sm bg-primary/20" />
              <div className="w-3 h-3 rounded-sm bg-primary/40" />
              <div className="w-3 h-3 rounded-sm bg-primary/60" />
              <div className="w-3 h-3 rounded-sm bg-primary/80" />
              <div className="w-3 h-3 rounded-sm bg-primary" />
            </div>
            <span className="font-mono text-[10px] text-muted-foreground">High</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-fit">
            {/* Header row with page paths */}
            <div className="flex">
              <div className="w-32 shrink-0" /> {/* Empty corner cell */}
              {pages.map((page) => (
                <div
                  key={page}
                  className="w-20 shrink-0 px-1 py-2 font-mono text-[10px] text-muted-foreground text-center truncate"
                  title={page}
                >
                  {page.length > 10 ? `${page.slice(0, 10)}…` : page}
                </div>
              ))}
            </div>

            {/* Data rows */}
            {sections.map((section) => (
              <div key={section} className="flex">
                <div
                  className="w-32 shrink-0 px-2 py-2 font-mono text-[10px] text-muted-foreground truncate"
                  title={section}
                >
                  {section}
                </div>
                {pages.map((page) => {
                  const cell = getCellData(section, page);
                  return (
                    <div
                      key={`${section}-${page}`}
                      className="w-20 shrink-0 p-1"
                    >
                      <div
                        className={`
                          h-10 rounded-md flex flex-col items-center justify-center
                          transition-all hover:ring-2 hover:ring-ring cursor-pointer
                          ${cell ? getIntensityColor(cell.intensity) : "bg-muted/10 border border-dashed border-border/30"}
                        `}
                        title={
                          cell
                            ? `${section} on ${page}\nAvg dwell: ${formatDwell(cell.avgDwell)}\nEvents: ${cell.eventCount}`
                            : "No data"
                        }
                      >
                        {cell && (
                          <>
                            <span className="font-mono text-[10px] font-medium text-foreground">
                              {formatDwell(cell.avgDwell)}
                            </span>
                            <span className="font-mono text-[8px] text-muted-foreground">
                              {cell.eventCount} events
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Summary stats */}
        <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <p className="font-mono text-[10px] text-muted-foreground">Sections Tracked</p>
              <p className="font-mono text-sm text-foreground">{sections.length}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] text-muted-foreground">Pages</p>
              <p className="font-mono text-sm text-foreground">{pages.length}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] text-muted-foreground">Max Avg Dwell</p>
              <p className="font-mono text-sm text-foreground">{formatDwell(maxDwell)}</p>
            </div>
          </div>
          <p className="font-mono text-[10px] text-muted-foreground">
            Hover cells for details
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
