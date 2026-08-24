/**
 * Formate une durée en minutes en chaîne lisible.
 */
export function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return 'Non spécifié';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return `${hours} h`;
  return `${hours}h ${remainingMinutes}min`;
}

/**
 * Formate un niveau de difficulté numérique (1–5) en libellé textuel.
 */
export function formatDifficulty(level: number): { label: string; color: string } {
  switch (level) {
    case 1:
      return { label: 'Débutant', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' };
    case 2:
      return { label: 'Intermédiaire', color: 'text-sky-400 border-sky-500/30 bg-sky-500/10' };
    case 3:
      return { label: 'Avancé', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' };
    case 4:
    case 5:
      return { label: 'Expert', color: 'text-rose-400 border-rose-500/30 bg-rose-500/10' };
    default:
      return { label: 'Niveau 1', color: 'text-slate-400 border-slate-500/30 bg-slate-500/10' };
  }
}

/**
 * Formate le niveau de lab pour l'affichage.
 */
export function formatLabLevel(level: string): { label: string; badge: string } {
  switch (level) {
    case '1_theory':
    case 'LEVEL_1_THEORY':
      return { label: 'Lab théorique guidé', badge: 'Niveau 1 (Théorie)' };
    case '2_files':
    case 'LEVEL_2_FILES':
      return { label: 'Lab sur fichiers de configuration', badge: 'Niveau 2 (Fichiers)' };
    case '3_container':
    case 'LEVEL_3_CONTAINER':
      return { label: 'Lab conteneurisé interactif', badge: 'Niveau 3 (Conteneur)' };
    case '4_vm':
    case 'LEVEL_4_VM':
      return { label: 'Lab machine virtuelle Proxmox', badge: 'Niveau 4 (VM)' };
    default:
      return { label: 'Lab pratique', badge: 'Pratique' };
  }
}
