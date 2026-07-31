import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";

function Login() {
  const { login, error: authError } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login({ username, password });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al iniciar sesión";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = error ?? authError;
  const hasError = Boolean(displayError);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-center">Gym Manager</CardTitle>
          <CardDescription className="text-center text-sm text-muted-foreground">
            Acceso al panel de administración del gimnasio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                type="text"
                autoComplete="username"
                placeholder="Ingrese su usuario"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                aria-invalid={hasError}
                disabled={isSubmitting}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Ingrese su contraseña"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={hasError}
                disabled={isSubmitting}
              />
            </div>

            {displayError && (
              <p className="text-sm text-destructive" role="alert">
                {displayError}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Ingresando..." : "Ingresar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default Login;
