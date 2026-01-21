import { useEffect, useState } from "react";
import { SystemHeader } from "@/components/SystemHeader";
import { LiveMetricsPanel } from "@/components/dashboard/LiveMetricsPanel";
import { LiveSessionsPanel } from "@/components/dashboard/LiveSessionsPanel";
import { LiveEventFeed } from "@/components/dashboard/LiveEventFeed";
import { AnomalyChart } from "@/components/dashboard/AnomalyChart";
import { SessionsChart } from "@/components/dashboard/SessionsChart";
import { NavigationFlowChart } from "@/components/dashboard/NavigationFlowChart";
import { ScrollDepthChart } from "@/components/dashboard/ScrollDepthChart";
import { ReferrerBreakdown } from "@/components/dashboard/ReferrerBreakdown";
import { SectionDwellHeatmap } from "@/components/dashboard/SectionDwellHeatmap";
import { DataExport } from "@/components/DataExport";
import { ScheduledExportManager } from "@/components/ScheduledExportManager";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const [currentTime, setCurrentTime] = useState(new Date().toISOString());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date().toISOString());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background font-sans">
      <SystemHeader systemStatus="online" version="v1.0.0-day6" />
      
      <main className="container py-8 space-y-8">
        {/* Navigation */}
        <nav className="flex items-center gap-4">
          <Link 
            to="/" 
            className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ← System Overview
          </Link>
          <span className="text-border">|</span>
          <span className="font-mono text-xs text-primary">Admin Dashboard</span>
          <span className="text-border">|</span>
          <Link 
            to="/privacy-audit" 
            className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Privacy Audit Log →
          </Link>
        </nav>

        {/* Live Metrics */}
        <LiveMetricsPanel />

        {/* Live Sessions and Event Feed - Side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LiveSessionsPanel />
          <LiveEventFeed />
        </div>

        {/* Charts Grid - Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SessionsChart />
          <AnomalyChart />
        </div>

        {/* Charts Grid - Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <NavigationFlowChart />
          <ScrollDepthChart />
          <ReferrerBreakdown />
        </div>

        {/* Section Dwell Heatmap - Full width */}
        <SectionDwellHeatmap />

        {/* Data Export */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DataExport />
          <ScheduledExportManager />
        </div>

        {/* Footer */}
        <footer className="border-t border-border pt-6 flex items-center justify-between">
          <p className="font-mono text-[10px] text-muted-foreground">
            ADMIN DASHBOARD · PRIVACY-FIRST ANALYTICS
          </p>
          <div className="flex items-center gap-4">
            <span className="font-mono text-[10px] text-muted-foreground">
              Auto-refresh: 30s
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {currentTime.replace("T", " ").slice(0, 19)} UTC
            </span>
          </div>
        </footer>
      </main>
    </div>
  );
}
