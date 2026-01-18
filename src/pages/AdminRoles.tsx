import { useState, useEffect } from "react";
import { SystemHeader } from "@/components/SystemHeader";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin, AppRole } from "@/hooks/useUserRoles";
import { useAllUsersWithRoles, useAssignRole, useRemoveRole, UserWithRoles } from "@/hooks/useAdminRoles";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { ShieldCheck, Plus, Trash2, Loader2, Users, Shield, Eye } from "lucide-react";
import { format } from "date-fns";

const ROLE_COLORS: Record<AppRole, string> = {
  admin: "bg-destructive/20 text-destructive border-destructive/30",
  analyst: "bg-primary/20 text-primary border-primary/30",
  viewer: "bg-muted text-muted-foreground border-border",
};

const ROLE_ICONS: Record<AppRole, typeof ShieldCheck> = {
  admin: ShieldCheck,
  analyst: Shield,
  viewer: Eye,
};

export default function AdminRoles() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { hasRole: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { data: users, isLoading: usersLoading } = useAllUsersWithRoles();
  const assignRole = useAssignRole();
  const removeRole = useRemoveRole();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [newRole, setNewRole] = useState<AppRole>("viewer");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newUserId, setNewUserId] = useState("");

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    } else if (!adminLoading && !isAdmin) {
      navigate("/");
    }
  }, [user, authLoading, isAdmin, adminLoading, navigate]);

  const filteredUsers = users?.filter(
    (u) =>
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.user_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAssignRole = () => {
    if (selectedUser) {
      assignRole.mutate(
        { userId: selectedUser.user_id, role: newRole },
        {
          onSuccess: () => {
            setSelectedUser(null);
            setDialogOpen(false);
          },
        }
      );
    }
  };

  const handleAssignNewUser = () => {
    if (newUserId.trim()) {
      assignRole.mutate(
        { userId: newUserId.trim(), role: newRole },
        {
          onSuccess: () => {
            setNewUserId("");
            setDialogOpen(false);
          },
        }
      );
    }
  };

  const handleRemoveRole = (userId: string, role: AppRole) => {
    removeRole.mutate({ userId, role });
  };

  if (authLoading || adminLoading || usersLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

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
          <Link
            to="/settings"
            className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Settings
          </Link>
          <span className="text-border">|</span>
          <span className="font-mono text-xs text-primary">Role Management</span>
        </nav>

        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-mono text-xl font-semibold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Role Management
            </h1>
            <p className="font-mono text-sm text-muted-foreground mt-1">
              Assign and manage user roles across the system
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="font-mono text-sm gap-2">
                <Plus className="h-4 w-4" />
                Assign Role
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="font-mono text-sm">Assign New Role</DialogTitle>
                <DialogDescription className="font-mono text-xs">
                  Add a role to an existing user by entering their User ID
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="font-mono text-xs">User ID</Label>
                  <Input
                    value={newUserId}
                    onChange={(e) => setNewUserId(e.target.value)}
                    placeholder="Enter user UUID..."
                    className="font-mono text-sm bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-mono text-xs">Role</Label>
                  <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                    <SelectTrigger className="font-mono text-sm bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin" className="font-mono text-sm">
                        Admin
                      </SelectItem>
                      <SelectItem value="analyst" className="font-mono text-sm">
                        Analyst
                      </SelectItem>
                      <SelectItem value="viewer" className="font-mono text-sm">
                        Viewer
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleAssignNewUser}
                  disabled={!newUserId.trim() || assignRole.isPending}
                  className="font-mono text-sm"
                >
                  {assignRole.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Assign Role
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border bg-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">Total Users</p>
                  <p className="font-mono text-2xl font-bold text-foreground">
                    {users?.length || 0}
                  </p>
                </div>
                <div className="h-10 w-10 rounded bg-primary/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">Admins</p>
                  <p className="font-mono text-2xl font-bold text-foreground">
                    {users?.filter((u) => u.roles.includes("admin")).length || 0}
                  </p>
                </div>
                <div className="h-10 w-10 rounded bg-destructive/20 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">Analysts</p>
                  <p className="font-mono text-2xl font-bold text-foreground">
                    {users?.filter((u) => u.roles.includes("analyst")).length || 0}
                  </p>
                </div>
                <div className="h-10 w-10 rounded bg-accent/20 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-mono text-sm">Users & Roles</CardTitle>
                <CardDescription className="font-mono text-xs">
                  Manage role assignments for all system users
                </CardDescription>
              </div>
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="font-mono text-sm bg-background w-64"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="font-mono text-xs">User</TableHead>
                    <TableHead className="font-mono text-xs">User ID</TableHead>
                    <TableHead className="font-mono text-xs">Roles</TableHead>
                    <TableHead className="font-mono text-xs">Joined</TableHead>
                    <TableHead className="font-mono text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <p className="font-mono text-sm text-muted-foreground">
                          No users found
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers?.map((u) => (
                      <TableRow key={u.user_id} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-sm">{u.email}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {u.user_id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            {u.roles.length === 0 ? (
                              <Badge
                                variant="outline"
                                className="font-mono text-[10px] bg-muted/50"
                              >
                                No roles
                              </Badge>
                            ) : (
                              u.roles.map((role) => {
                                const Icon = ROLE_ICONS[role];
                                return (
                                  <Badge
                                    key={role}
                                    variant="outline"
                                    className={`font-mono text-[10px] ${ROLE_COLORS[role]} gap-1`}
                                  >
                                    <Icon className="h-3 w-3" />
                                    {role}
                                  </Badge>
                                );
                              })
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {format(new Date(u.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="font-mono text-xs h-7"
                                  onClick={() => setSelectedUser(u)}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add Role
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="bg-card border-border">
                                <DialogHeader>
                                  <DialogTitle className="font-mono text-sm">
                                    Add Role to User
                                  </DialogTitle>
                                  <DialogDescription className="font-mono text-xs">
                                    Adding role to: {u.email}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <Label className="font-mono text-xs">Select Role</Label>
                                    <Select
                                      value={newRole}
                                      onValueChange={(v) => setNewRole(v as AppRole)}
                                    >
                                      <SelectTrigger className="font-mono text-sm bg-background">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {(["admin", "analyst", "viewer"] as AppRole[])
                                          .filter((r) => !u.roles.includes(r))
                                          .map((role) => (
                                            <SelectItem
                                              key={role}
                                              value={role}
                                              className="font-mono text-sm"
                                            >
                                              {role.charAt(0).toUpperCase() + role.slice(1)}
                                            </SelectItem>
                                          ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button
                                    onClick={handleAssignRole}
                                    disabled={assignRole.isPending}
                                    className="font-mono text-sm"
                                  >
                                    {assignRole.isPending && (
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    )}
                                    Assign Role
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>

                            {u.roles.length > 0 && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="font-mono text-xs h-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-card border-border">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="font-mono text-sm">
                                      Remove Role
                                    </AlertDialogTitle>
                                    <AlertDialogDescription className="font-mono text-xs">
                                      Select a role to remove from {u.email}:
                                      <div className="flex flex-wrap gap-2 mt-4">
                                        {u.roles.map((role) => (
                                          <Button
                                            key={role}
                                            variant="outline"
                                            size="sm"
                                            className={`font-mono text-xs ${ROLE_COLORS[role]}`}
                                            onClick={() => handleRemoveRole(u.user_id, role)}
                                            disabled={removeRole.isPending}
                                          >
                                            {removeRole.isPending && (
                                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                            )}
                                            Remove {role}
                                          </Button>
                                        ))}
                                      </div>
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="font-mono text-xs">
                                      Cancel
                                    </AlertDialogCancel>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Role Descriptions */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="font-mono text-sm">Role Descriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="h-4 w-4 text-destructive" />
                  <span className="font-mono text-sm font-semibold text-destructive">Admin</span>
                </div>
                <p className="font-mono text-xs text-muted-foreground">
                  Full system access. Can manage users, roles, and view all audit logs.
                </p>
              </div>
              <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="font-mono text-sm font-semibold text-primary">Analyst</span>
                </div>
                <p className="font-mono text-xs text-muted-foreground">
                  Can query and analyze data. Access to strategic analysis and dashboards.
                </p>
              </div>
              <div className="p-4 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-sm font-semibold text-foreground">Viewer</span>
                </div>
                <p className="font-mono text-xs text-muted-foreground">
                  Read-only access to dashboards and public data.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <footer className="border-t border-border pt-6">
          <p className="font-mono text-[10px] text-muted-foreground">
            ROLE MANAGEMENT · ADMIN ACCESS REQUIRED
          </p>
        </footer>
      </main>
    </div>
  );
}
