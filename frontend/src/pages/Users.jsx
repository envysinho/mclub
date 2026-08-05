import { useCallback, useEffect, useState } from "react";
import { LogIn, Pencil, Trash2, UserPlus } from "lucide-react";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
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
import { createUser, deleteUser, impersonateUser, listUsers, updateUser } from "@/lib/api";
import { getRoleLabel } from "@/lib/roles";
import { cn } from "@/lib/utils";

const EMPTY_USER = {
  username: "",
  name: "",
  password: "",
  role: "USER",
  enabled: true,
};

function displayUserName(user) {
  return user?.name?.trim() || user?.username || "Usuario";
}

function Users() {
  const { beginImpersonation, logout, user: currentUser, updateCurrentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState(EMPTY_USER);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [impersonatingUserId, setImpersonatingUserId] = useState(null);
  const canManageAllUsers = currentUser?.role === "SUDO";
  const canCreateUsers = currentUser?.role === "SUDO" || currentUser?.role === "ADMIN";
  const canDeleteUsers = currentUser?.role === "SUDO" || currentUser?.role === "ADMIN";
  const canEditUser = (user) => canManageAllUsers || currentUser?.id === user.id;
  const canImpersonateUser = (user) =>
    canManageAllUsers && currentUser?.id !== user.id && user.enabled;

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
    setEditingUser(null);
    setFormError(null);
    setShowForm(false);
  };

  const openCreateForm = () => {
    setUserForm({
      ...EMPTY_USER,
      role: "USER",
      enabled: true,
    });
    setEditingUser(null);
    setFormError(null);
    setShowForm(true);
  };

  const openEditForm = (user) => {
    setUserForm({
      username: user.username,
      name: user.name?.trim() || user.username || "",
      password: "",
      role: user.role,
      enabled: user.enabled,
    });
    setEditingUser(user);
    setFormError(null);
    setShowForm(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      if (editingUser) {
        const result = await updateUser(
          editingUser.id,
          {
            username: userForm.username,
            name: userForm.name,
            role: canManageAllUsers ? userForm.role : editingUser.role,
            enabled: canManageAllUsers ? userForm.enabled : editingUser.enabled,
            password: userForm.password,
          },
          handleUnauthorized
        );
        const updatedUser = result.user ?? result;
        if (currentUser?.id === updatedUser.id) {
          updateCurrentUser(updatedUser, result.token);
        }
      } else {
        await createUser(
          {
            ...userForm,
            role: canManageAllUsers ? userForm.role : "USER",
          },
          handleUnauthorized
        );
      }
      resetForm();
      await loadUsers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error al guardar usuario");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickUpdate = async (user, patch) => {
    const payload = {
      username: user.username,
      name: user.name?.trim() || user.username,
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
      const result = await updateUser(user.id, payload, handleUnauthorized);
      const updatedUser = result.user ?? result;
      if (currentUser?.id === updatedUser.id) {
        updateCurrentUser(updatedUser, result.token);
      }
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar usuario");
      await loadUsers();
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteUser(deleteTarget.id, handleUnauthorized);
      setDeleteTarget(null);
      await loadUsers();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Error al eliminar usuario");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleImpersonateUser = async (user) => {
    setError(null);
    setImpersonatingUserId(user.id);
    try {
      const session = await impersonateUser(user.id, handleUnauthorized);
      beginImpersonation(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al entrar como usuario");
    } finally {
      setImpersonatingUserId(null);
    }
  };

  const renderEnabledSwitch = (user) =>
    canManageAllUsers ? (
      <button
        type="button"
        role="switch"
        aria-checked={user.enabled}
        aria-label={`${user.enabled ? "Desactivar" : "Activar"} a ${displayUserName(user)}`}
        disabled={updatingUserId === user.id}
        className={cn(
          "inline-flex h-7 w-12 shrink-0 items-center rounded-full border p-0.5 transition-colors disabled:opacity-50",
          user.enabled
            ? "border-emerald-500/30 bg-emerald-500/20"
            : "border-border bg-muted/50"
        )}
        onClick={() => handleQuickUpdate(user, { enabled: !user.enabled })}
      >
        <span
          className={cn(
            "size-5 rounded-full bg-foreground shadow-sm transition-transform",
            user.enabled ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    ) : (
      <Badge variant={user.enabled ? "secondary" : "outline"} className="w-fit">
        {user.enabled ? "Activo" : "Inactivo"}
      </Badge>
    );

  return (
    <div className="flex flex-col gap-4">
      <PageCard>
        {error && (
          <p className="mb-4 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <div className="space-y-4">
          <div className="flex justify-end">
            <Button className="w-full sm:w-auto" onClick={openCreateForm} disabled={!canCreateUsers}>
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
                <SheetTitle>
                  {editingUser ? `Editar ${displayUserName(editingUser)}` : "Nuevo usuario"}
                </SheetTitle>
                <SheetDescription>
                  {editingUser
                    ? "Actualiza sus datos de acceso."
                    : "Crea una cuenta de usuario para ventas."}
                </SheetDescription>
              </SheetHeader>
              <form onSubmit={handleSubmit} className="grid gap-4 px-4 pb-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    value={userForm.name}
                    onChange={(event) =>
                      setUserForm({ ...userForm, name: event.target.value })
                    }
                    required
                  />
                </div>
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
                  <Label htmlFor="password">
                    {editingUser ? "Nueva contraseña" : "Contraseña"}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={userForm.password}
                    onChange={(event) =>
                      setUserForm({ ...userForm, password: event.target.value })
                    }
                    required={!editingUser}
                    placeholder={editingUser ? "Dejar vacío para mantenerla" : undefined}
                  />
                </div>
                {canManageAllUsers ? (
                  <div className="space-y-2">
                    <Label htmlFor="role">Rol</Label>
                    <select
                      id="role"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
                      value={userForm.role}
                      onChange={(event) => setUserForm({ ...userForm, role: event.target.value })}
                    >
                      <option value="USER">user</option>
                      <option value="ADMIN">admin</option>
                      <option value="SUDO">sudo</option>
                    </select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Rol</Label>
                    <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                      {editingUser ? getRoleLabel(editingUser.role) : "user"}
                    </div>
                  </div>
                )}
                {canManageAllUsers && (
                  <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-3">
                    <div>
                      <Label htmlFor="userEnabled">Estado</Label>
                      <p className="text-sm text-muted-foreground">
                        {userForm.enabled ? "Activo" : "Inactivo"}
                      </p>
                    </div>
                    <button
                      id="userEnabled"
                      type="button"
                      role="switch"
                      aria-checked={userForm.enabled}
                      className={cn(
                        "inline-flex h-7 w-12 items-center rounded-full border p-0.5 transition-colors",
                        userForm.enabled
                          ? "border-emerald-500/30 bg-emerald-500/20"
                          : "border-border bg-muted/50"
                      )}
                      onClick={() => setUserForm({ ...userForm, enabled: !userForm.enabled })}
                    >
                      <span
                        className={cn(
                          "size-5 rounded-full bg-foreground shadow-sm transition-transform",
                          userForm.enabled ? "translate-x-5" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>
                )}
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
                  className="grid gap-3 border-b px-4 py-3 last:border-b-0 md:min-h-14 md:grid-cols-[minmax(14rem,1fr)_8rem_7rem_auto] md:items-center md:gap-4"
                >
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">{displayUserName(user)}</h3>
                    <p className="truncate text-sm text-muted-foreground">{user.username}</p>
                  </div>
                  <Badge variant="outline" className="w-fit">
                    {getRoleLabel(user.role)}
                  </Badge>
                  <div className="flex items-center gap-2">
                    {renderEnabledSwitch(user)}
                    {canManageAllUsers && (
                      <span className="text-sm text-muted-foreground">
                        {user.enabled ? "Activo" : "Inactivo"}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 md:justify-end">
                    {canImpersonateUser(user) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleImpersonateUser(user)}
                        disabled={impersonatingUserId === user.id}
                      >
                        <LogIn className="size-4" />
                        {impersonatingUserId === user.id ? "Entrando..." : "Entrar como"}
                      </Button>
                    )}
                    {canEditUser(user) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openEditForm(user)}
                      >
                        <Pencil className="size-4" />
                        Editar
                      </Button>
                    )}
                    {canDeleteUsers && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          setDeleteTarget(user);
                          setDeleteError(null);
                        }}
                      >
                        <Trash2 className="size-4" />
                        Eliminar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No hay usuarios registrados.</p>
          )}
        </div>
      </PageCard>

      <DeleteConfirmationDialog
        open={Boolean(deleteTarget)}
        title="Eliminar usuario"
        description={`Esta acción eliminará a ${
          deleteTarget ? displayUserName(deleteTarget) : "este usuario"
        }.`}
        error={deleteError}
        isSubmitting={isDeleting}
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteError(null);
        }}
        onConfirm={handleDeleteUser}
      />
    </div>
  );
}

export default Users;
