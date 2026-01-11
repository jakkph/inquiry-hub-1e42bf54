import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";

export function OperatorHeader() {
  const { user, signOut } = useAuth();

  if (!user) {
    return (
      <Link to="/auth">
        <Button variant="outline" size="sm" className="font-mono text-xs gap-2">
          <User className="h-3 w-3" />
          Authenticate
        </Button>
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-signal-nominal animate-pulse" />
        <span className="font-mono text-xs text-muted-foreground">
          {user.email?.split("@")[0].toUpperCase() || "OPERATOR"}
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={signOut}
        className="font-mono text-xs text-muted-foreground hover:text-foreground gap-2"
      >
        <LogOut className="h-3 w-3" />
        Exit
      </Button>
    </div>
  );
}
