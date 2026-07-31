import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function DeleteConfirmationDialog({
  open,
  title,
  description,
  error,
  isSubmitting,
  onCancel,
  onConfirm,
}) {
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (open) {
      setPassword("");
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        className="grid w-full max-w-sm gap-4 rounded-xl border bg-popover p-4 text-popover-foreground shadow-lg"
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm(password);
        }}
      >
        <div className="space-y-1">
          <h2 className="font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="deleteConfirmationPassword">Contraseña</Label>
          <Input
            id="deleteConfirmationPassword"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoFocus
            required
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="destructive" disabled={isSubmitting}>
            {isSubmitting ? "Eliminando..." : "Eliminar"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default DeleteConfirmationDialog;
