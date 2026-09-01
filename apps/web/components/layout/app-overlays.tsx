'use client';

import dynamic from 'next/dynamic';

// Chargés en différé (ssr:false) : la grosse chaîne IA (mentor, conversations,
// réglages) et la modal de changement de mot de passe ne sont plus téléchargées
// ni exécutées au premier rendu de chaque page. Elles sont chargées à la demande
// uniquement si l'utilisateur les ouvre (amélioration du bundle initial).
const MentorChatDrawer = dynamic(
  () => import('../ai/mentor-chat-drawer').then((m) => m.MentorChatDrawer),
  { ssr: false, loading: () => null },
);

const ForcePasswordChangeModal = dynamic(
  () => import('../auth/force-password-change-modal').then((m) => m.ForcePasswordChangeModal),
  { ssr: false, loading: () => null },
);

/**
 * Surcouches applicatives montées une seule fois dans le layout racine.
 * Sont volontairement exclues du rendu serveur (composants purement clients).
 */
export function AppOverlays() {
  return (
    <>
      <ForcePasswordChangeModal />
      <MentorChatDrawer />
    </>
  );
}