import { useCallback, useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import PageCard from "@/components/PageCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { createUser, listUsers, updateUser } from "@/lib/api";
import { cn } from "@/lib/utils";

const ROLE_LABELS = {
  SUDO: "Sudo",
  ADMIN: "Admin",
  USER: "User",
};

const EMPTY_USER = {
  username: "",
  password: "",
  role: "USER",
  enabled: true,
};

function Users() {
  const { logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [userForm, setUserForm] = useState(EMPTY_USER);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState(null);

  const handleUnauthorized = useCallback(() => {
    logout();
  }, [logout]);

  const loadUsers = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      setUsers(await listUsers(handleUnauthorized));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar usuarios");
    } finally {
      setIsLoading(false);
    }
  }, [handleUnauthorized]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const resetForm = () => {
    setUserForm(EMPTY_USER);
    setFormError(null);
    setShowForm(false);
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      await createUser(userForm, handleUnauthorized);
      resetForm();
      await loadUsers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error al crear usuario");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async (user, patch) => {
    const payload = {
      role: patch.role ?? user.role,
      enabled: patch.enabled ?? user.enabled,
      password: "",
    };

    setUpdatingUserId(user.id);
    setError(null);
    setUsers((currentUsers) =>
      currentUsers.map((currentUser) =>
        currentUser.id === user.id ? { ...currentUser, ...patch } : currentUser
      )
    );

    try {
      await updateUser(user.id, payload, handleUnauthorized);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar usuario");
      await loadUsers();
    } finally {
      setUpdatingUserId(null);
    }
  };

  const renderEnabledSwitch = (user) => (
    <button
      type="button"
      role="switch"
      aria-checked={user.enabled}
      aria-label={`${user.enabled ? "Desactivar" : "Activar"} a ${user.username}`}
      disabled={updatingUserId === user.id}
      className={cn(
        "inline-flex h-7 w-12 shrink-0 items-center rounded-full border p-0.5 transition-colors disabled:opacity-50",
        user.enabled
          ? "border-emerald-500/30 bg-emerald-500/20"
          : "border-border bg-muted/50"
      )}
      onClick={() => handleUpdateUser(user, { enabled: !user.enabled })}
    >
      <span
        className={cn(
          "size-5 rounded-full bg-foreground shadow-sm transition-transform",
          user.enabled ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );

  return (
    <div className="flex flex-col gap-4">
      <PageCard
        title="Usuarios"
        description="Administra accesos, roles y estado de los usuarios."
      >
        {error && (
          <p className="mb-4 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <div className="space-y-4">
          <div className="flex justify-end">
            <Button className="w-full sm:w-auto" onClick={() => setShowForm(true)}>
              <UserPlus />
              Nuevo usuario
            </Button>
          </div>

          <Sheet
            open={showForm}
            onOpenChange={(open) => {
              if (!open) {
                resetForm();
              } else {
                setShowForm(true);
              }
            }}
          >
            <SheetContent className="w-full overflow-y-auto sm:max-w-md">
              <SheetHeader className="border-b pr-12">
                <SheetTitle>Nuevo usuario</SheetTitle>
                <SheetDescription>
                  Crea una cuenta y asigna su rol dentro del sistema.
                </SheetDescription>
              </SheetHeader>
              <form onSubmit={handleCreateUser} className="grid gap-4 px-4 pb-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Usuario</Label>
                  <Input
                    id="username"
                    value={userForm.username}
                    onChange={(event) =>
                      setUserForm({ ...userForm, username: event.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    value={userForm.password}
                    onChange={(event) =>
                      setUserForm({ ...userForm, password: event.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Rol</Label>
                  <select
                    id="role"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
                    value={userForm.role}
                    onChange={(event) => setUserForm({ ...userForm, role: event.target.value })}
                  >
                    <option value="USER">User</option>
                    <option value="ADMIN">Admin</option>
                    <option value="SUDO">Sudo</option>
                  </select>
                </div>
                {formError && <p className="text-sm text-destructive">{formError}</p>}
                <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Guardando..." : "Guardar"}
                  </Button>
                </div>
              </form>
            </SheetContent>
          </Sheet>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : users.length ? (
            <div className="overflow-hidden rounded-xl border">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="grid gap-2 border-b px-4 py-3 last:border-b-0 md:min-h-14 md:grid-cols-[minmax(0,1fr)_8rem_8rem_auto] md:items-center md:gap-4"
                >
                  <div className="min-w-0">
                    <h3 className="font-semibold">{user.username}</h3>
                    <p className="text-sm text-muted-foreground">
                      {user.enabled ? "Activo" : "Inactivo"}
                    </p>
                  </div>
                  <Badge variant="outline" className="w-fit">
                    {ROLE_LABELS[user.role] ?? user.role}
                  </Badge>
                  {renderEnabledSwitch(user)}
                  <select
                    className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
                    value={user.role}
                    disabled={updatingUserId === user.id}
                    onChange={(event) => handleUpdateUser(user, { role: event.target.value })}
                  >
                    <option value="USER">User</option>
                    <option value="ADMIN">Admin</option>
                    <option value="SUDO">Sudo</option>
                  </select>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No hay usuarios registrados.</p>
          )}
        </div>
      </PageCard>
    </div>
  );
}

export default Users;
