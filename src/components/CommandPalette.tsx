import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Shield,
  FileText,
  Settings,
  Users,
  Webhook,
  Code,
  LogOut,
  Home,
  Lock,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useUserRoles";

interface CommandItemDef {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
  group: "navigation" | "actions" | "settings";
}

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { hasRole: isAdmin } = useIsAdmin();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleNavigation = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
    navigate("/auth");
  };

  const navigationItems: CommandItemDef[] = [
    {
      id: "home",
      label: "Home",
      icon: <Home className="mr-2 h-4 w-4" />,
      action: () => handleNavigation("/"),
      keywords: ["home", "index", "main", "landing"],
      group: "navigation",
    },
    {
      id: "dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="mr-2 h-4 w-4" />,
      action: () => handleNavigation("/dashboard"),
      keywords: ["dashboard", "analytics", "metrics", "overview"],
      group: "navigation",
    },
    {
      id: "privacy-audit",
      label: "Privacy Audit",
      icon: <Shield className="mr-2 h-4 w-4" />,
      action: () => handleNavigation("/privacy-audit"),
      keywords: ["privacy", "audit", "compliance", "gdpr"],
      group: "navigation",
    },
    {
      id: "audit-trail",
      label: "Audit Trail",
      icon: <FileText className="mr-2 h-4 w-4" />,
      action: () => handleNavigation("/audit-trail"),
      keywords: ["audit", "trail", "logs", "history", "activity"],
      group: "navigation",
    },
    {
      id: "api-docs",
      label: "API Documentation",
      icon: <Code className="mr-2 h-4 w-4" />,
      action: () => handleNavigation("/api-docs"),
      keywords: ["api", "docs", "documentation", "endpoints", "reference"],
      group: "navigation",
    },
    {
      id: "webhooks",
      label: "Webhooks",
      icon: <Webhook className="mr-2 h-4 w-4" />,
      action: () => handleNavigation("/webhooks"),
      keywords: ["webhooks", "integrations", "hooks", "events"],
      group: "navigation",
    },
    {
      id: "settings",
      label: "Settings",
      icon: <Settings className="mr-2 h-4 w-4" />,
      action: () => handleNavigation("/settings"),
      keywords: ["settings", "preferences", "configuration", "profile"],
      group: "navigation",
    },
  ];

  const adminItems: CommandItemDef[] = isAdmin
    ? [
        {
          id: "admin-roles",
          label: "Role Management",
          icon: <Users className="mr-2 h-4 w-4" />,
          action: () => handleNavigation("/admin/roles"),
          keywords: ["admin", "roles", "users", "permissions", "management"],
          group: "settings",
        },
      ]
    : [];

  const actionItems: CommandItemDef[] = user
    ? [
        {
          id: "sign-out",
          label: "Sign Out",
          icon: <LogOut className="mr-2 h-4 w-4" />,
          action: handleSignOut,
          keywords: ["sign out", "logout", "exit", "leave"],
          group: "actions",
        },
      ]
    : [
        {
          id: "sign-in",
          label: "Sign In",
          icon: <Lock className="mr-2 h-4 w-4" />,
          action: () => handleNavigation("/auth"),
          keywords: ["sign in", "login", "authenticate"],
          group: "actions",
        },
      ];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Navigation">
          {navigationItems.map((item) => (
            <CommandItem
              key={item.id}
              value={item.label + " " + (item.keywords?.join(" ") || "")}
              onSelect={item.action}
              className="cursor-pointer"
            >
              {item.icon}
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        {adminItems.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Administration">
              {adminItems.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.label + " " + (item.keywords?.join(" ") || "")}
                  onSelect={item.action}
                  className="cursor-pointer"
                >
                  {item.icon}
                  <span>{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Actions">
          {actionItems.map((item) => (
            <CommandItem
              key={item.id}
              value={item.label + " " + (item.keywords?.join(" ") || "")}
              onSelect={item.action}
              className="cursor-pointer"
            >
              {item.icon}
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
