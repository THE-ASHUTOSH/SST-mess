"use client";

import React, { useState, useEffect, useCallback } from "react";
import axiosInstance from "@/lib/axiosInstance";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, Trash2, UserPlus } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { ALLOWED_EMAIL_DOMAINS_LABEL, isAllowedEmailDomain } from "@/lib/email-domains";

interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  roll: string | null;
  batch: string | null;
}

// The only roles this panel may assign, on create OR on change. 'student' is absent on purpose —
// students come from the roster, so nobody can be created as one or demoted into one here.
// Mirrors ASSIGNABLE_ROLES in the API, which is the real boundary.
const ASSIGNABLE_ROLES = ["admin", "superAdmin", "vendor"] as const;

const emptyDraft = { email: "", name: "", role: "admin" as string };

const roleBadgeClass = (role: string) => {
  switch (role) {
    case "superAdmin":
      return "bg-purple-500/15 text-purple-600 dark:text-purple-300";
    case "admin":
      return "bg-blue-500/15 text-blue-600 dark:text-blue-300";
    case "vendor":
      return "bg-amber-500/15 text-amber-600 dark:text-amber-300";
    default:
      return "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300";
  }
};

// Prefer the API's own message (domain rule, duplicate email, attached history) over a generic one.
const errorMessage = (err: unknown, fallback: string): string => {
  const msg =
    typeof err === "object" && err !== null && "response" in err
      ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
      : undefined;
  return msg || fallback;
};

const UserManagement = () => {
  const { user: currentUser } = useUser();
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [draft, setDraft] = useState(emptyDraft);
  const [isCreating, setIsCreating] = useState(false);

  const [pendingDelete, setPendingDelete] = useState<ManagedUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadUsers = useCallback(async (query: string) => {
    setIsLoading(true);
    try {
      const params = query.trim() ? { search: query.trim() } : undefined;
      const res = await axiosInstance.get(`/api/admin/users`, { params });
      if (Array.isArray(res.data.users)) setUsers(res.data.users);
    } catch {
      toast.error("Failed to load users.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers("");
  }, [loadUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers(search);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAllowedEmailDomain(draft.email)) {
      toast.error(`Email must be an ${ALLOWED_EMAIL_DOMAINS_LABEL} address`);
      return;
    }
    setIsCreating(true);
    try {
      const res = await axiosInstance.post(`/api/admin/users`, {
        email: draft.email.trim().toLowerCase(),
        name: draft.name.trim(),
        role: draft.role,
      });
      const created = res.data.user as ManagedUser;
      toast.success(`${created.name} added as ${created.role}.`);
      setDraft(emptyDraft);
      await loadUsers(search);
    } catch (err: unknown) {
      toast.error(errorMessage(err, "Failed to create user."));
    } finally {
      setIsCreating(false);
    }
  };

  const handleRoleChange = async (target: ManagedUser, newRole: string) => {
    if (newRole === target.role) return;
    setUpdatingId(target.id);
    try {
      const res = await axiosInstance.patch(`/api/admin/users?id=${target.id}`, { role: newRole });
      const updated = res.data.user as ManagedUser;
      setUsers(prev => prev.map(u => (u.id === updated.id ? { ...u, role: updated.role } : u)));
      toast.success(`${updated.name || updated.email} is now ${updated.role}.`);
    } catch (err: unknown) {
      toast.error(errorMessage(err, "Failed to update role."));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      const res = await axiosInstance.delete(`/api/admin/users?id=${pendingDelete.id}`);
      toast.success(res.data.message || "User removed.");
      setPendingDelete(null);
      await loadUsers(search);
    } catch (err: unknown) {
      toast.error(errorMessage(err, "Failed to remove user."));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card className="w-full max-w-2xl border-border bg-card shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-primary">User Management</CardTitle>
          <CardDescription>
            Add or remove staff accounts and change roles. Sign-in requires an account here —
            nothing is created automatically. Students come from the roster and are not managed here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleCreate} className="space-y-3 rounded-xl border border-border p-4">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium text-foreground">Add an account</h3>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="new-user-email">Email</Label>
                <Input
                  id="new-user-email"
                  type="email"
                  value={draft.email}
                  onChange={e => setDraft(prev => ({ ...prev, email: e.target.value }))}
                  placeholder={`name${ALLOWED_EMAIL_DOMAINS_LABEL.split(" or ")[0]}`}
                  disabled={isCreating}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-user-name">Name</Label>
                <Input
                  id="new-user-name"
                  value={draft.name}
                  onChange={e => setDraft(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Full name"
                  disabled={isCreating}
                  required
                />
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="new-user-role">Role</Label>
                <Select
                  value={draft.role}
                  onValueChange={value => setDraft(prev => ({ ...prev, role: value }))}
                  disabled={isCreating}
                >
                  <SelectTrigger id="new-user-role" className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSIGNABLE_ROLES.map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? "Adding…" : "Add user"}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Must be an {ALLOWED_EMAIL_DOMAINS_LABEL} address — anything else could never sign in.
              A vendor account created here becomes selectable under Manage Vendors.
            </p>
          </form>

          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email…"
            />
            <Button type="submit" variant="outline" disabled={isLoading}>
              <Search className="h-4 w-4" />
              Search
            </Button>
          </form>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : users.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No users found.</p>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {users.map(u => {
                const isSelf = u.id === currentUser?.id;
                const isStudent = u.role === "student";
                return (
                  <li key={u.id} className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-foreground">{u.name || "—"}</span>
                        <Badge className={roleBadgeClass(u.role)}>{u.role}</Badge>
                        {isSelf && <span className="text-xs text-muted-foreground">(you)</span>}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {isStudent ? (
                        // 'student' isn't assignable, so a student row has no valid option to
                        // show — and promoting one out of the roster isn't this panel's job.
                        <span className="w-[140px] shrink-0 text-right text-xs italic text-muted-foreground">
                          Managed by roster
                        </span>
                      ) : (
                        <Select
                          value={u.role}
                          onValueChange={value => handleRoleChange(u, value)}
                          disabled={isSelf || updatingId === u.id}
                        >
                          <SelectTrigger className="w-[140px] shrink-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ASSIGNABLE_ROLES.map(r => (
                              <SelectItem key={r} value={r}>{r}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${u.name || u.email}`}
                        // Self-removal is a lockout; students belong to the roster.
                        disabled={isSelf || isStudent}
                        onClick={() => setPendingDelete(u)}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!pendingDelete} onOpenChange={open => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove this account?</DialogTitle>
            <DialogDescription>
              {pendingDelete?.name || pendingDelete?.email} will lose access immediately and will
              need to be added again to sign in. Accounts with meal history, feedback or vendor
              selections can&apos;t be removed — change their role instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserManagement;
