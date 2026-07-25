"use client";

import React, { useState, useEffect, useCallback } from "react";
import axiosInstance from "@/lib/axiosInstance";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { useUser } from "@/context/UserContext";

interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  roll: string | null;
  batch: string | null;
}

// "vendor" is intentionally NOT assignable here — a vendor account is defined by its login email
// under Manage Vendors, not by hand-assigning the role. Existing vendor rows render read-only below.
const ROLE_OPTIONS = ["student", "admin", "superAdmin"] as const;

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

const UserManagement = () => {
  const { user: currentUser } = useUser();
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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

  const handleRoleChange = async (target: ManagedUser, newRole: string) => {
    if (newRole === target.role) return;
    setUpdatingId(target.id);
    try {
      const res = await axiosInstance.patch(`/api/admin/users?id=${target.id}`, { role: newRole });
      const updated = res.data.user as ManagedUser;
      setUsers(prev => prev.map(u => (u.id === updated.id ? { ...u, role: updated.role } : u)));
      toast.success(`${updated.name || updated.email} is now ${updated.role}.`);
    } catch (err: unknown) {
      const message =
        typeof err === "object" && err !== null && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(message || "Failed to update role.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <Card className="w-full max-w-2xl border-border bg-card shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-primary">User Management</CardTitle>
        <CardDescription>
          Search any user and change their role. Showing current admins, vendors, and superAdmins by default.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
                  {u.role === "vendor" ? (
                    <span className="shrink-0 text-xs italic text-muted-foreground">Managed in Manage Vendors</span>
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
                        {ROLE_OPTIONS.map(r => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default UserManagement;
