import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { z } from "zod";

const authSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  operatorAlias: z.string().optional(),
});

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [operatorAlias, setOperatorAlias] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input
    const validation = authSchema.safeParse({ email, password, operatorAlias });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }
    
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("Authentication failed. Verify credentials.");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("System access granted.");
          navigate("/");
        }
      } else {
        const { error } = await signUp(email, password, operatorAlias || undefined);
        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("Identifier already exists in system.");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("Operator profile created. Access granted.");
          navigate("/");
        }
      }
    } catch (error) {
      toast.error("System error. Retry.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* System Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              STRATUM
            </span>
          </div>
          <h1 className="font-mono text-lg text-foreground mb-1">
            {isLogin ? "OPERATOR AUTHENTICATION" : "OPERATOR REGISTRATION"}
          </h1>
          <p className="font-mono text-xs text-muted-foreground">
            {isLogin ? "System access requires valid credentials" : "Initialize new operator profile"}
          </p>
        </div>

        {/* Auth Form */}
        <div className="border border-border bg-card rounded-md p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-mono text-xs uppercase text-muted-foreground">
                Identifier
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@domain.tld"
                className="font-mono text-sm bg-secondary/50 border-border"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="font-mono text-xs uppercase text-muted-foreground">
                Access Key
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="font-mono text-sm bg-secondary/50 border-border"
                required
              />
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="operatorAlias" className="font-mono text-xs uppercase text-muted-foreground">
                  Operator Alias <span className="text-muted-foreground/50">(optional)</span>
                </Label>
                <Input
                  id="operatorAlias"
                  type="text"
                  value={operatorAlias}
                  onChange={(e) => setOperatorAlias(e.target.value)}
                  placeholder="OPERATOR_001"
                  className="font-mono text-sm bg-secondary/50 border-border"
                />
              </div>
            )}

            <Button
              type="submit"
              className="w-full font-mono text-xs uppercase tracking-wider"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary-foreground animate-pulse" />
                  Processing...
                </span>
              ) : isLogin ? (
                "Authenticate"
              ) : (
                "Initialize Profile"
              )}
            </Button>
          </form>

          {/* Toggle */}
          <div className="mt-6 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="w-full text-center font-mono text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin ? "New operator? Initialize profile →" : "Existing operator? Authenticate →"}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center font-mono text-[10px] text-muted-foreground/50 mt-6">
          STRATUM v1.0.0 · SECURE CHANNEL
        </p>
      </div>
    </div>
  );
}
