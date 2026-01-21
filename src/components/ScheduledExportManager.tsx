import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar,
  Clock,
  Mail,
  Plus,
  Play,
  Trash2,
  Loader2,
  FileJson,
  FileSpreadsheet,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  useScheduledExports,
  useCreateScheduledExport,
  useUpdateScheduledExport,
  useDeleteScheduledExport,
  useRunScheduledExport,
  ScheduledExport,
} from "@/hooks/useScheduledExports";

const DATA_TYPES = [
  { value: "sessions", label: "Sessions" },
  { value: "events", label: "Events" },
  { value: "webhooks", label: "Webhooks" },
  { value: "audit_logs", label: "Audit Logs" },
] as const;

const SCHEDULES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
] as const;

export function ScheduledExportManager() {
  const { data: exports, isLoading } = useScheduledExports();
  const createExport = useCreateScheduledExport();
  const updateExport = useUpdateScheduledExport();
  const deleteExport = useDeleteScheduledExport();
  const runExport = useRunScheduledExport();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDataType, setFormDataType] = useState<ScheduledExport["data_type"]>("sessions");
  const [formFormat, setFormFormat] = useState<ScheduledExport["format"]>("json");
  const [formSchedule, setFormSchedule] = useState<ScheduledExport["schedule"]>("daily");
  const [formEmail, setFormEmail] = useState("");

  const resetForm = () => {
    setFormName("");
    setFormDataType("sessions");
    setFormFormat("json");
    setFormSchedule("daily");
    setFormEmail("");
  };

  const handleCreate = async () => {
    if (!formName || !formEmail) return;

    await createExport.mutateAsync({
      name: formName,
      data_type: formDataType,
      format: formFormat,
      schedule: formSchedule,
      email_to: formEmail,
    });

    resetForm();
    setDialogOpen(false);
  };

  const toggleActive = async (exp: ScheduledExport) => {
    await updateExport.mutateAsync({
      id: exp.id,
      is_active: !exp.is_active,
    });
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="font-mono flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Scheduled Exports
          </CardTitle>
          <CardDescription>
            Automate data exports with email delivery
          </CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Schedule Export
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-mono">Create Scheduled Export</DialogTitle>
              <DialogDescription>
                Set up automated data exports delivered to your email
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="font-mono">Export Name</Label>
                <Input
                  id="name"
                  placeholder="Weekly Analytics Report"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-mono">Data Type</Label>
                  <Select value={formDataType} onValueChange={(v) => setFormDataType(v as ScheduledExport["data_type"])}>
                    <SelectTrigger className="font-mono">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DATA_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="font-mono">Format</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={formFormat === "json" ? "default" : "outline"}
                      className="flex-1 font-mono"
                      onClick={() => setFormFormat("json")}
                      type="button"
                    >
                      <FileJson className="h-4 w-4 mr-1" />
                      JSON
                    </Button>
                    <Button
                      variant={formFormat === "csv" ? "default" : "outline"}
                      className="flex-1 font-mono"
                      onClick={() => setFormFormat("csv")}
                      type="button"
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-1" />
                      CSV
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-mono">Schedule</Label>
                <Select value={formSchedule} onValueChange={(v) => setFormSchedule(v as ScheduledExport["schedule"])}>
                  <SelectTrigger className="font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCHEDULES.map((sched) => (
                      <SelectItem key={sched.value} value={sched.value}>
                        {sched.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="font-mono">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="reports@example.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createExport.isPending || !formName || !formEmail}
              >
                {createExport.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Schedule
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : exports?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-mono">No scheduled exports</p>
            <p className="text-sm mt-1">
              Create a schedule to receive automated data exports via email
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-mono">Name</TableHead>
                <TableHead className="font-mono">Data</TableHead>
                <TableHead className="font-mono">Schedule</TableHead>
                <TableHead className="font-mono">Email</TableHead>
                <TableHead className="font-mono">Next Run</TableHead>
                <TableHead className="font-mono">Status</TableHead>
                <TableHead className="font-mono text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exports?.map((exp) => (
                <TableRow key={exp.id}>
                  <TableCell className="font-mono font-medium">{exp.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {exp.format === "json" ? (
                        <FileJson className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-mono text-sm">{exp.data_type}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs capitalize">
                      {exp.schedule}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span className="font-mono">{exp.email_to}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {exp.next_run_at ? (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground font-mono">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(exp.next_run_at), { addSuffix: true })}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground font-mono">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={exp.is_active}
                      onCheckedChange={() => toggleActive(exp)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => runExport.mutate(exp)}
                        disabled={runExport.isPending}
                        title="Run now"
                      >
                        {runExport.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Schedule</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{exp.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteExport.mutate(exp.id)}
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
  );
}
