import { useState, useEffect } from "react";
import { SystemHeader } from "@/components/SystemHeader";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserSettings, useUpdateSettings } from "@/hooks/useUserSettings";
import { useIsAdmin } from "@/hooks/useUserRoles";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { User, Bell, Palette, Save, Loader2, ShieldCheck, Webhook } from "lucide-react";

export default function Settings() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { data: settings, isLoading: settingsLoading } = useUserSettings();
  const updateSettings = useUpdateSettings();
  const { hasRole: isAdmin } = useIsAdmin();

  // Local form state
  const [operatorAlias, setOperatorAlias] = useState("");
  const [theme, setTheme] = useState<"dark" | "light" | "system">("dark");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationAnomalies, setNotificationAnomalies] = useState(true);
  const [notificationPrivacyAlerts, setNotificationPrivacyAlerts] = useState(true);
  const [notificationSystemUpdates, setNotificationSystemUpdates] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Populate form with settings
  useEffect(() => {
    if (settings) {
      setOperatorAlias(settings.operator_alias || "");
      setTheme(settings.theme || "dark");
      setNotificationsEnabled(settings.notifications_enabled ?? true);
      setNotificationAnomalies(settings.notification_anomalies ?? true);
      setNotificationPrivacyAlerts(settings.notification_privacy_alerts ?? true);
      setNotificationSystemUpdates(settings.notification_system_updates ?? true);
    }
  }, [settings]);

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", prefersDark);
    } else {
      root.classList.toggle("dark", theme === "dark");
    }
  }, [theme]);

  const handleSave = () => {
    updateSettings.mutate({
      operator_alias: operatorAlias || null,
      theme,
      notifications_enabled: notificationsEnabled,
      notification_anomalies: notificationAnomalies,
      notification_privacy_alerts: notificationPrivacyAlerts,
      notification_system_updates: notificationSystemUpdates,
    });
  };

  if (authLoading || settingsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans">
      <SystemHeader systemStatus="online" version="v1.0.0-day6" />

      <main className="container py-8 space-y-8 max-w-3xl">
        {/* Navigation */}
        <nav className="flex items-center gap-4">
          <Link
            to="/"
            className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ← System Overview
          </Link>
          <span className="text-border">|</span>
          <span className="font-mono text-xs text-primary">Settings</span>
        </nav>

        {/* Page Title */}
        <div>
          <h1 className="font-mono text-xl font-semibold text-foreground">Settings</h1>
          <p className="font-mono text-sm text-muted-foreground mt-1">
            Configure your preferences and notifications
          </p>
        </div>

        {/* User Preferences */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded bg-primary/20 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="font-mono text-sm">User Preferences</CardTitle>
                <CardDescription className="font-mono text-xs">
                  Manage your profile and display settings
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="operator-alias" className="font-mono text-xs">
                Operator Alias
              </Label>
              <Input
                id="operator-alias"
                value={operatorAlias}
                onChange={(e) => setOperatorAlias(e.target.value)}
                placeholder="Enter your display name..."
                className="font-mono text-sm bg-background"
              />
              <p className="font-mono text-[10px] text-muted-foreground">
                This name will be displayed across the system
              </p>
            </div>

            <div className="space-y-2">
              <Label className="font-mono text-xs">Email</Label>
              <Input
                value={user?.email || ""}
                disabled
                className="font-mono text-sm bg-muted text-muted-foreground"
              />
            </div>
          </CardContent>
        </Card>

        {/* Theme Settings */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded bg-accent/20 flex items-center justify-center">
                <Palette className="h-4 w-4 text-accent" />
              </div>
              <div>
                <CardTitle className="font-mono text-sm">Appearance</CardTitle>
                <CardDescription className="font-mono text-xs">
                  Customize the visual theme
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="theme" className="font-mono text-xs">
                Theme
              </Label>
              <Select value={theme} onValueChange={(v) => setTheme(v as typeof theme)}>
                <SelectTrigger className="font-mono text-sm bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark" className="font-mono text-sm">
                    Dark
                  </SelectItem>
                  <SelectItem value="light" className="font-mono text-sm">
                    Light
                  </SelectItem>
                  <SelectItem value="system" className="font-mono text-sm">
                    System
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="font-mono text-[10px] text-muted-foreground">
                Choose between dark mode, light mode, or follow system preferences
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded bg-info/20 flex items-center justify-center">
                <Bell className="h-4 w-4 text-info" />
              </div>
              <div>
                <CardTitle className="font-mono text-sm">Notifications</CardTitle>
                <CardDescription className="font-mono text-xs">
                  Configure in-app notification preferences
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="font-mono text-xs">Enable Notifications</Label>
                <p className="font-mono text-[10px] text-muted-foreground">
                  Master toggle for all notifications
                </p>
              </div>
              <Switch
                checked={notificationsEnabled}
                onCheckedChange={setNotificationsEnabled}
              />
            </div>

            <Separator className="bg-border" />

            <div className="space-y-4 opacity-100 transition-opacity" style={{ opacity: notificationsEnabled ? 1 : 0.5 }}>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="font-mono text-xs">Anomaly Alerts</Label>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    Get notified when anomalies are detected
                  </p>
                </div>
                <Switch
                  checked={notificationAnomalies}
                  onCheckedChange={setNotificationAnomalies}
                  disabled={!notificationsEnabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="font-mono text-xs">Privacy Alerts</Label>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    Notifications for PII detection events
                  </p>
                </div>
                <Switch
                  checked={notificationPrivacyAlerts}
                  onCheckedChange={setNotificationPrivacyAlerts}
                  disabled={!notificationsEnabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="font-mono text-xs">System Updates</Label>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    Important system announcements
                  </p>
                </div>
                <Switch
                  checked={notificationSystemUpdates}
                  onCheckedChange={setNotificationSystemUpdates}
                  disabled={!notificationsEnabled}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Integrations */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded bg-primary/20 flex items-center justify-center">
                <Webhook className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="font-mono text-sm">Integrations</CardTitle>
                <CardDescription className="font-mono text-xs">
                  Configure external integrations and webhooks
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link to="/webhooks">
              <Button variant="outline" className="font-mono text-sm w-full justify-start gap-2">
                <Webhook className="h-4 w-4" />
                Webhook Configuration
                <span className="ml-auto text-muted-foreground">→</span>
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Admin Section */}
        {isAdmin && (
          <Card className="border-destructive/30 bg-card">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded bg-destructive/20 flex items-center justify-center">
                  <ShieldCheck className="h-4 w-4 text-destructive" />
                </div>
                <div>
                  <CardTitle className="font-mono text-sm">Administration</CardTitle>
                  <CardDescription className="font-mono text-xs">
                    Manage system settings and user access
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link to="/admin/roles">
                <Button variant="outline" className="font-mono text-sm w-full justify-start gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Role Management
                  <span className="ml-auto text-muted-foreground">→</span>
                </Button>
              </Link>
              <Link to="/audit-trail">
                <Button variant="outline" className="font-mono text-sm w-full justify-start gap-2 mt-2">
                  <User className="h-4 w-4" />
                  Audit Trail
                  <span className="ml-auto text-muted-foreground">→</span>
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={updateSettings.isPending}
            className="font-mono text-sm gap-2"
          >
            {updateSettings.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>

        {/* Footer */}
        <footer className="border-t border-border pt-6">
          <p className="font-mono text-[10px] text-muted-foreground">
            SETTINGS · PRIVACY-FIRST ANALYTICS
          </p>
        </footer>
      </main>
    </div>
  );
}
