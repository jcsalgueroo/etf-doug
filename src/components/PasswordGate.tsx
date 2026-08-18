import { useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";


import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { verifySitePassword } from "@/lib/gate.functions";

const MAX_ATTEMPTS = 5;

export function PasswordGate({ children }: { children: ReactNode }) {
  // Held in memory only — a reload always requires the password again.
  const [unlocked, setUnlocked] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const verify = useServerFn(verifySitePassword);
  const navigate = useNavigate({ from: "/" });
  const lockedOut = attempts >= MAX_ATTEMPTS;

  if (unlocked) return <>{children}</>;


  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (lockedOut || pending) return;
    setPending(true);
    try {
      const { ok } = await verify({ data: { password } });
      if (ok) {
        setUnlocked(true);
        return;
      }
      const next = attempts + 1;
      setAttempts(next);
      setPassword("");
      setError(
        next >= MAX_ATTEMPTS
          ? "Too many failed attempts. Reload the page to try again."
          : `Incorrect password. ${MAX_ATTEMPTS - next} attempt${
              MAX_ATTEMPTS - next === 1 ? "" : "s"
            } remaining.`,
      );
    } catch {
      setError("Unable to verify the password. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Doug</CardTitle>
          <CardDescription>
            Internal tool. Enter the access password to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-3">
            <Input
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={lockedOut || pending}
              autoFocus
            />
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={lockedOut || pending}>
              {pending ? "Checking…" : "Enter"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
