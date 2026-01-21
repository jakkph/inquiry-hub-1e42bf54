import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { SystemHeader } from "@/components/SystemHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Webhook,
  Plus,
  Trash2,
  Edit,
  TestTube2,
  Copy,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Link2,
  Bell,
} from "lucide-react";
import {
  useWebhooks,
  useCreateWebhook,
  useUpdateWebhook,
  useDeleteWebhook,
  useTestWebhook,
  WEBHOOK_EVENTS,
  WEBHOOK_EVENT_CATEGORIES,
  Webhook as WebhookType,
} from "@/hooks/useWebhooks";
import { WebhookDeliveryLogs } from "@/components/WebhookDeliveryLogs";
import { WebhookHealthDashboard } from "@/components/WebhookHealthDashboard";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function Webhooks() {
  const { user, loading: authLoading } = useAuth();
  const { data: webhooks, isLoading } = useWebhooks();
  const createWebhook = useCreateWebhook();
  const updateWebhook = useUpdateWebhook();
  const deleteWebhook = useDeleteWebhook();
  const testWebhook = useTestWebhook();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookType | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  // Form state
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formEvents, setFormEvents] = useState<string[]>([]);
  const [formSecret, setFormSecret] = useState("");

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const resetForm = () => {
    setFormName("");
    setFormUrl("");
    setFormEvents([]);
    setFormSecret("");
  };

  const handleCreate = async () => {
    if (!formName || !formUrl || formEvents.length === 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    await createWebhook.mutateAsync({
      name: formName,
      url: formUrl,
      events: formEvents,
      secret: formSecret || undefined,
    });

    resetForm();
    setCreateDialogOpen(false);
  };

  const handleEdit = (webhook: WebhookType) => {
    setEditingWebhook(webhook);
    setFormName(webhook.name);
    setFormUrl(webhook.url);
    setFormEvents(webhook.events);
    setFormSecret(webhook.secret || "");
    setEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingWebhook || !formName || !formUrl || formEvents.length === 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    await updateWebhook.mutateAsync({
      id: editingWebhook.id,
      name: formName,
      url: formUrl,
      events: formEvents,
      secret: formSecret || null,
    });

    resetForm();
    setEditingWebhook(null);
    setEditDialogOpen(false);
  };

  const toggleWebhookActive = async (webhook: WebhookType) => {
    await updateWebhook.mutateAsync({
      id: webhook.id,
      is_active: !webhook.is_active,
    });
  };

  const copySecret = (secret: string) => {
    navigator.clipboard.writeText(secret);
    toast.success("Secret copied to clipboard");
  };

  const toggleShowSecret = (id: string) => {
    setShowSecrets((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const generateSecret = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const secret = Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
    setFormSecret(secret);
  };

  return (
    <div className="min-h-screen bg-background">
      <SystemHeader systemStatus="online" version="v1.0.0-day6" />

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-mono font-bold text-foreground flex items-center gap-3">
              <Webhook className="h-8 w-8" />
              Webhook Configuration
            </h1>
            <p className="text-muted-foreground mt-1 font-mono text-sm">
              Set up external integrations to receive real-time event notifications
            </p>
          </div>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Webhook
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-mono">Create Webhook</DialogTitle>
                <DialogDescription>
                  Configure a new webhook endpoint to receive event notifications
                </DialogDescription>
              </DialogHeader>

              <WebhookForm
                name={formName}
                setName={setFormName}
                url={formUrl}
                setUrl={setFormUrl}
                events={formEvents}
                setEvents={setFormEvents}
                secret={formSecret}
                setSecret={setFormSecret}
                onGenerateSecret={generateSecret}
              />

              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={createWebhook.isPending}
                >
                  {createWebhook.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Create Webhook
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono text-muted-foreground">
                Total Webhooks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono">{webhooks?.length || 0}</div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono text-muted-foreground">
                Active Webhooks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono text-green-500">
                {webhooks?.filter((w) => w.is_active).length || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono text-muted-foreground">
                Failed Deliveries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono text-destructive">
                {webhooks?.reduce((acc, w) => acc + w.failure_count, 0) || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Webhooks Table */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-mono flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Configured Webhooks
            </CardTitle>
            <CardDescription>
              Manage your webhook endpoints and their event subscriptions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : webhooks?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Webhook className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-mono">No webhooks configured</p>
                <p className="text-sm mt-1">
                  Create your first webhook to start receiving event notifications
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-mono">Name</TableHead>
                    <TableHead className="font-mono">URL</TableHead>
                    <TableHead className="font-mono">Events</TableHead>
                    <TableHead className="font-mono">Status</TableHead>
                    <TableHead className="font-mono">Last Triggered</TableHead>
                    <TableHead className="font-mono text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {webhooks?.map((webhook) => (
                    <TableRow key={webhook.id}>
                      <TableCell>
                        <div className="font-mono font-medium">{webhook.name}</div>
                        {webhook.secret && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-xs text-muted-foreground font-mono">
                              Secret:{" "}
                              {showSecrets[webhook.id]
                                ? webhook.secret.substring(0, 16) + "..."
                                : "••••••••"}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4"
                              onClick={() => toggleShowSecret(webhook.id)}
                            >
                              {showSecrets[webhook.id] ? (
                                <EyeOff className="h-3 w-3" />
                              ) : (
                                <Eye className="h-3 w-3" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4"
                              onClick={() => copySecret(webhook.secret!)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                          {webhook.url.length > 40
                            ? webhook.url.substring(0, 40) + "..."
                            : webhook.url}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {webhook.events.slice(0, 2).map((event) => (
                            <Badge
                              key={event}
                              variant="secondary"
                              className="font-mono text-xs"
                            >
                              {event.split(".").pop()}
                            </Badge>
                          ))}
                          {webhook.events.length > 2 && (
                            <Badge variant="outline" className="font-mono text-xs">
                              +{webhook.events.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={webhook.is_active}
                            onCheckedChange={() => toggleWebhookActive(webhook)}
                          />
                          {webhook.is_active ? (
                            <Badge variant="default" className="bg-green-500/20 text-green-500 border-green-500/30">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <XCircle className="h-3 w-3 mr-1" />
                              Inactive
                            </Badge>
                          )}
                          {webhook.failure_count > 0 && (
                            <Badge variant="destructive" className="font-mono">
                              {webhook.failure_count} failures
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {webhook.last_triggered_at ? (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground font-mono">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(webhook.last_triggered_at), {
                              addSuffix: true,
                            })}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground font-mono">
                            Never
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => testWebhook.mutate(webhook)}
                            disabled={testWebhook.isPending}
                          >
                            {testWebhook.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <TestTube2 className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(webhook)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Webhook</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{webhook.name}"? This
                                  action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteWebhook.mutate(webhook.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Delivery Logs */}
        {/* Webhook Health Dashboard */}
        <div className="mt-8">
          <WebhookHealthDashboard />
        </div>

        {/* Delivery Logs */}
        <div className="mt-8">
          <WebhookDeliveryLogs />
        </div>

        {/* Event Types Reference - Categorized */}
        <Card className="border-border/50 mt-8">
          <CardHeader>
            <CardTitle className="font-mono flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Available Event Types
            </CardTitle>
            <CardDescription>
              Subscribe to these events to receive notifications at your webhook endpoint
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {WEBHOOK_EVENT_CATEGORIES.map((category) => (
                <div key={category.category}>
                  <h3 className="text-sm font-mono text-muted-foreground mb-3 uppercase tracking-wide">
                    {category.category}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {category.events.map((event) => (
                      <div
                        key={event.id}
                        className="p-3 border border-border/50 rounded-lg bg-card hover:border-primary/30 transition-colors"
                      >
                        <code className="text-xs font-mono text-primary">{event.id}</code>
                        <h4 className="font-medium text-sm mt-1">{event.label}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {event.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-mono">Edit Webhook</DialogTitle>
              <DialogDescription>
                Update your webhook configuration
              </DialogDescription>
            </DialogHeader>

            <WebhookForm
              name={formName}
              setName={setFormName}
              url={formUrl}
              setUrl={setFormUrl}
              events={formEvents}
              setEvents={setFormEvents}
              secret={formSecret}
              setSecret={setFormSecret}
              onGenerateSecret={generateSecret}
            />

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setEditDialogOpen(false);
                  resetForm();
                  setEditingWebhook(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={updateWebhook.isPending}>
                {updateWebhook.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

// Webhook Form Component
function WebhookForm({
  name,
  setName,
  url,
  setUrl,
  events,
  setEvents,
  secret,
  setSecret,
  onGenerateSecret,
}: {
  name: string;
  setName: (v: string) => void;
  url: string;
  setUrl: (v: string) => void;
  events: string[];
  setEvents: (v: string[]) => void;
  secret: string;
  setSecret: (v: string) => void;
  onGenerateSecret: () => void;
}) {
  const toggleEvent = (eventId: string) => {
    if (events.includes(eventId)) {
      setEvents(events.filter((e) => e !== eventId));
    } else {
      setEvents([...events, eventId]);
    }
  };

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Integration"
          className="font-mono"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="url">Endpoint URL *</Label>
        <Input
          id="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://api.example.com/webhook"
          className="font-mono"
        />
      </div>

      <div className="space-y-2">
        <Label>Events *</Label>
        <div className="max-h-64 overflow-y-auto border border-border rounded-lg p-3 space-y-4">
          {WEBHOOK_EVENT_CATEGORIES.map((category) => (
            <div key={category.category}>
              <h4 className="text-xs font-mono text-muted-foreground uppercase tracking-wide mb-2">
                {category.category}
              </h4>
              <div className="grid grid-cols-1 gap-1">
                {category.events.map((event) => (
                  <div key={event.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={event.id}
                      checked={events.includes(event.id)}
                      onCheckedChange={() => toggleEvent(event.id)}
                    />
                    <label
                      htmlFor={event.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                    >
                      {event.label}
                      <span className="text-xs text-muted-foreground ml-2 font-mono">
                        ({event.id})
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="secret">Signing Secret (optional)</Label>
        <div className="flex gap-2">
          <Input
            id="secret"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Used to verify webhook signatures"
            className="font-mono text-sm"
          />
          <Button type="button" variant="outline" onClick={onGenerateSecret}>
            Generate
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          We'll include this secret in the X-Webhook-Signature header for verification
        </p>
      </div>
    </div>
  );
}
