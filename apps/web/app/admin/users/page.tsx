'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../lib/auth/use-auth';
import { adminApi, type AdminUserItem } from '../../../lib/api/admin-api';
import { AdminUsersHeader } from '../../../components/admin/admin-users-header';
import { AdminUsersFilters } from '../../../components/admin/admin-users-filters';
import { AdminUsersTable } from '../../../components/admin/admin-users-table';
import { AdminPagination } from '../../../components/admin/admin-pagination';
import { CreateUserDialog } from '../../../components/admin/create-user-dialog';
import { EditUserDialog } from '../../../components/admin/edit-user-dialog';
import { ResetPasswordDialog } from '../../../components/admin/reset-password-dialog';
import { ToggleStatusDialog } from '../../../components/admin/toggle-status-dialog';

export default function AdminUsersPage() {
  const { accessToken, user } = useAuth();

  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserItem | null>(null);
  const [resettingUser, setResettingUser] = useState<AdminUserItem | null>(null);
  const [togglingUser, setTogglingUser] = useState<AdminUserItem | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    const res = await adminApi.listUsers(accessToken, {
      page,
      limit,
      search: search || undefined,
      role: roleFilter || undefined,
      status: statusFilter || undefined,
    });

    if (res.data) {
      setUsers(res.data.items);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    }
    setIsLoading(false);
  }, [accessToken, page, limit, search, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleResetFilters = () => {
    setSearch('');
    setRoleFilter('');
    setStatusFilter('');
    setPage(1);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <AdminUsersHeader
        users={users}
        total={total}
        onOpenCreate={() => setIsCreateOpen(true)}
      />

      <AdminUsersFilters
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        roleFilter={roleFilter}
        onRoleFilterChange={(v) => {
          setRoleFilter(v);
          setPage(1);
        }}
        statusFilter={statusFilter}
        onStatusFilterChange={(v) => {
          setStatusFilter(v);
          setPage(1);
        }}
        onReset={handleResetFilters}
      />

      <AdminUsersTable
        users={users}
        isLoading={isLoading}
        currentAdminId={user?.id}
        onEdit={(u) => setEditingUser(u)}
        onResetPassword={(u) => setResettingUser(u)}
        onToggleStatus={(u) => setTogglingUser(u)}
      />

      {!isLoading && total > 0 && (
        <AdminPagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={(p) => setPage(p)}
          onLimitChange={(l) => {
            setLimit(l);
            setPage(1);
          }}
        />
      )}

      {/* Modales d'actions */}
      <CreateUserDialog
        isOpen={isCreateOpen}
        accessToken={accessToken}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={fetchUsers}
      />

      <EditUserDialog
        isOpen={Boolean(editingUser)}
        user={editingUser}
        currentAdminId={user?.id}
        accessToken={accessToken}
        onClose={() => setEditingUser(null)}
        onSuccess={fetchUsers}
      />

      <ResetPasswordDialog
        isOpen={Boolean(resettingUser)}
        user={resettingUser}
        accessToken={accessToken}
        onClose={() => setResettingUser(null)}
        onSuccess={fetchUsers}
      />

      <ToggleStatusDialog
        isOpen={Boolean(togglingUser)}
        user={togglingUser}
        currentAdminId={user?.id}
        accessToken={accessToken}
        onClose={() => setTogglingUser(null)}
        onSuccess={fetchUsers}
      />
    </div>
  );
}
