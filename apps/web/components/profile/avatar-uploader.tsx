'use client';

import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, Loader2, Trash2, UploadCloud } from 'lucide-react';
import { useAuth } from '../../lib/auth/use-auth';
import { uploadAvatarApi, deleteAvatarApi } from '../../lib/api/profile';
import { getInitials } from '../../lib/utils/formatters';

export function AvatarUploader() {
  const { user, accessToken, updateCurrentUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);

    // Validation taille (2 Mo max)
    if (file.size > 2 * 1024 * 1024) {
      setError(`Le fichier est trop volumineux (${Math.round(file.size / 1024)} Ko). La taille maximale est de 2 Mo.`);
      return;
    }

    // Validation type MIME
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setError('Format non supporté. Veuillez choisir une image PNG, JPEG, WebP ou GIF.');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleUpload = async () => {
    if (!selectedFile || !accessToken) return;

    setIsUploading(true);
    setError(null);
    setSuccess(null);

    const res = await uploadAvatarApi(accessToken, selectedFile);
    setIsUploading(false);

    if (res.success && res.avatarUrl) {
      updateCurrentUser({ avatarUrl: res.avatarUrl });
      setSelectedFile(null);
      setPreviewUrl(null);
      setSuccess('Photo de profil mise à jour avec succès !');
    } else {
      setError(res.error?.detail || 'Échec de la mise à jour de la photo de profil.');
    }
  };

  const handleCancelPreview = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteAvatar = async () => {
    if (!accessToken || !user?.avatarUrl) return;

    if (!window.confirm('Voulez-vous vraiment supprimer votre photo de profil ?')) {
      return;
    }

    setIsDeleting(true);
    setError(null);
    setSuccess(null);

    const res = await deleteAvatarApi(accessToken);
    setIsDeleting(false);

    if (res.success) {
      updateCurrentUser({ avatarUrl: null });
      setPreviewUrl(null);
      setSelectedFile(null);
      setSuccess('Photo de profil supprimée.');
    } else {
      setError(res.error?.detail || 'Impossible de supprimer la photo de profil.');
    }
  };

  const currentAvatar = previewUrl || user?.avatarUrl;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
        {/* Avatar Display */}
        <div className="relative group">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-slate-700 bg-slate-800 flex items-center justify-center shadow-lg shadow-black/40">
            {currentAvatar ? (
              <img
                src={currentAvatar}
                alt={user?.displayName || 'Avatar'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-sky-600/30 to-blue-700/30 text-sky-400 font-extrabold text-3xl flex items-center justify-center">
                {getInitials(user?.displayName)}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white shadow-md shadow-sky-500/30 transition-transform active:scale-95 cursor-pointer"
            title="Changer la photo"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>

        {/* Info & Actions */}
        <div className="flex-1 space-y-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-sky-400" />
              Photo de profil
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Formats acceptés : PNG, JPEG, WebP, GIF. Taille maximale : 2 Mo.
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Sélectionner une photo de profil"
          />

          <div className="flex flex-wrap items-center gap-2.5">
            {selectedFile ? (
              <>
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-white shadow-md shadow-sky-500/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isUploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <UploadCloud className="w-3.5 h-3.5" />
                  )}
                  <span>Enregistrer la photo</span>
                </button>

                <button
                  type="button"
                  onClick={handleCancelPreview}
                  disabled={isUploading}
                  className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                >
                  Annuler
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-sky-400" />
                <span>Importer une image</span>
              </button>
            )}

            {user?.avatarUrl && !selectedFile && (
              <button
                type="button"
                onClick={handleDeleteAvatar}
                disabled={isDeleting}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Supprimer</span>
              </button>
            )}
          </div>

          {error && (
            <p className="text-xs font-medium text-rose-400 animate-in fade-in">
              {error}
            </p>
          )}

          {success && (
            <p className="text-xs font-medium text-emerald-400 animate-in fade-in">
              {success}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
