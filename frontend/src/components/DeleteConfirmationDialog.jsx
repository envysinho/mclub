import { Button } from "@/components/ui/button";

function DeleteConfirmationDialog({
  open,
  title,
  description,
  error,
  isSubmitting,
  onCancel,
  onConfirm,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        className="grid w-full max-w-sm gap-4 rounded-xl border bg-popover p-4 text-popover-foreground shadow-lg"
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm();
        }}
      >
        <div className="space-y-1">
          <h2 className="font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
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
