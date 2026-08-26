'use client';

import React from 'react';
import {
  Edit2,
  KeyRound,
  UserX,
  UserCheck,
  Shield,
  GraduationCap,
  Clock,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import type { AdminUserItem } from '../../lib/api/admin-api';

interface AdminUsersTableProps {
  users: AdminUserItem[];
  isLoading: boolean;
  currentAdminId?: string;
  onEdit: (user: AdminUserItem) => void;
  onResetPassword: (user: AdminUserItem) => void;
  onToggleStatus: (user: AdminUserItem) => void;
}

export function AdminUsersTable({
  users,
  isLoading,
  currentAdminId,
  onEdit,
  onResetPassword,
  onToggleStatus,
}: AdminUsersTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center">
        <div className="inline-block w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm text-slate-400">Chargement des utilisateurs...</p>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
          <GraduationCap className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white">Aucun utilisateur trouvé</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Aucun compte ne correspond à vos critères de recherche actuels.
        </p>
      </div>
    );
  }

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 backdrop-blur-md overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <th className="py-3.5 px-4">Utilisateur</th>
              <th className="py-3.5 px-4">Rôle</th>
              <th className="py-3.5 px-4">Statut</th>
              <th className="py-3.5 px-4">Sécurité</th>
              <th className="py-3.5 px-4 hidden sm:table-cell">Créé le</th>
              <th className="py-3.5 px-4 hidden lg:table-cell">Dernier accès</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {users.map((u) => {
              const isSelf = Boolean(currentAdminId && u.id === currentAdminId);
              const isAdmin = u.role === 'ADMIN' || u.role === 'admin';
              const isActive = u.status === 'ACTIVE';

              return (
                <tr
                  key={u.id}
                  className="hover:bg-slate-800/40 transition-colors group"
                >
                  {/* Utilisateur */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          isAdmin
                            ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                            : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                        }`}
                      >
                        {getInitials(u.displayName)}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-white truncate max-w-[180px]">
                            {u.displayName}
                          </span>
                          {isSelf && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                              Vous
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 truncate max-w-[200px]">
                          {u.email}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Rôle */}
                  <td className="py-3.5 px-4">
                    {isAdmin ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-medium text-[11px]">
                        <Shield className="w-3 h-3 text-indigo-400" />
                        <span>Administrateur</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/15 text-sky-300 border border-sky-500/30 font-medium text-[11px]">
                        <GraduationCap className="w-3 h-3 text-sky-400" />
                        <span>Apprenant</span>
                      </span>
                    )}
                  </td>

                  {/* Statut */}
                  <td className="py-3.5 px-4">
                    {isActive ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>Actif</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 font-medium text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        <span>Désactivé</span>
                      </span>
                    )}
                  </td>

                  {/* Sécurité */}
                  <td className="py-3.5 px-4">
                    {u.mustChangePassword ? (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-semibold"
                        title="Doit changer de mot de passe à la première connexion"
                      >
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                        <span>Mot de passe temporaire</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-slate-500" />
                        <span>Défini</span>
                      </span>
                    )}
                  </td>

                  {/* Date de création */}
                  <td className="py-3.5 px-4 hidden sm:table-cell text-[11px] text-slate-400">
                    {new Date(u.createdAt).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>

                  {/* Dernier accès */}
                  <td className="py-3.5 px-4 hidden lg:table-cell text-[11px] text-slate-400">
                    {u.lastLoginAt ? (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>
                          {new Date(u.lastLoginAt).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-500 italic">Jamais connecté</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Éditer */}
                      <button
                        onClick={() => onEdit(u)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Modifier l'utilisateur"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Réinitialiser mot de passe */}
                      <button
                        onClick={() => onResetPassword(u)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors cursor-pointer"
                        title="Réinitialiser le mot de passe"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>

                      {/* Activer / Désactiver */}
                      <button
                        onClick={() => onToggleStatus(u)}
                        disabled={isSelf && isActive}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                          isActive
                            ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10'
                            : 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10'
                        }`}
                        title={
                          isSelf && isActive
                            ? 'Vous ne pouvez pas désactiver votre propre compte'
                            : isActive
                            ? 'Désactiver le compte'
                            : 'Activer le compte'
                        }
                      >
                        {isActive ? (
                          <UserX className="w-3.5 h-3.5" />
                        ) : (
                          <UserCheck className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
