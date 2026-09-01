import React from 'react';
import { Metadata } from 'next';
import { Lock, FileWarning, EyeOff, FileText, Database } from 'lucide-react';
import { LegalFooter } from '../../components/layout/legal-footer';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Politique de Confidentialité | OpenSIO',
  description: 'Politique de confidentialité RGPD de la plateforme OpenSIO',
};

export default function ConfidentialitePage() {
  return (
    <main className="min-h-screen p-4 py-12 relative bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white flex flex-col items-center">
      {/* Dynamic background accents */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-sky-600/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-4xl z-10 space-y-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">Politique de Confidentialité</h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">Conformité RGPD et protection de vos données</p>
        </div>

        <div className="glass-panel p-8 md:p-10 rounded-3xl shadow-xl dark:shadow-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl space-y-12">
          
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Database className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">1. Responsable de traitement</h2>
            </div>
            <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">
              <p>
                Le responsable du traitement des données à caractère personnel collectées sur OpenSIO est <strong>[Prénom Nom de l'éditeur]</strong>.
                Pour toute question relative à vos données, vous pouvez le contacter à : <strong>[email de contact]</strong>.
              </p>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <FileText className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">2. Données collectées, finalités et base légale</h2>
            </div>
            <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">
              <p>OpenSIO collecte le minimum de données nécessaires au bon fonctionnement de l'application pédagogique :</p>
              <div className="overflow-x-auto mt-4">
                <table className="min-w-full text-sm text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Données</th>
                      <th className="px-4 py-3 font-semibold">Finalité</th>
                      <th className="px-4 py-3 font-semibold">Base Légale</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                    <tr>
                      <td className="px-4 py-3">Email, Nom d'affichage, Mot de passe (haché), Avatar (optionnel)</td>
                      <td className="px-4 py-3">Gestion de votre compte et accès sécurisé</td>
                      <td className="px-4 py-3">Exécution du service</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">Progression pédagogique (quiz, labs, leçons lues)</td>
                      <td className="px-4 py-3">Suivi de vos révisions et délivrance de recommandations</td>
                      <td className="px-4 py-3">Exécution du service</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">Conversations avec l'assistant IA</td>
                      <td className="px-4 py-3">Fonctionnement du chatbot pédagogique contextuel</td>
                      <td className="px-4 py-3">Exécution du service</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <EyeOff className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">3. Destinataires et Hébergement des données</h2>
            </div>
            <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">
              <p>
                <strong>Aucun tiers :</strong> Les données sont strictement confinées à la plateforme OpenSIO.
                Nous ne partageons, ne vendons et ne transférons aucune donnée à des partenaires commerciaux ou publicitaires.
              </p>
              <p>
                <strong>Auto-hébergement :</strong> La base de données et l'application sont hébergées sur l'infrastructure personnelle du responsable de traitement.
              </p>
              <p>
                <strong>Assistant IA :</strong> Les conversations échangées avec le chatbot pédagogique sont traitées localement par un modèle Ollama hébergé sur la même infrastructure.
              </p>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">4. Cookies et Traceurs</h2>
            </div>
            <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">
              <p>
                OpenSIO utilise <strong>uniquement des cookies techniques strictement nécessaires</strong> au fonctionnement de la session (maintien de la connexion, jeton JWT).
              </p>
              <p>
                Conformément aux directives de la CNIL, ces cookies fonctionnels sont exemptés du recueil de consentement préalable. C'est pourquoi cette application n'affiche pas de bandeau d'acceptation des cookies. Aucun cookie de pistage, de mesure d'audience tierce ou de publicité n'est utilisé.
              </p>
            </div>
          </section>
          
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <FileWarning className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">5. Vos droits (Accès, Rectification, Effacement)</h2>
            </div>
            <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 space-y-4">
              <p>
                Conformément au RGPD, vous disposez des droits suivants sur vos données : accès, rectification, effacement, opposition et portabilité.
              </p>
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Exercer votre droit à l'effacement</h3>
                <p className="text-sm mb-3">Vous pouvez à tout moment et en toute autonomie supprimer définitivement votre compte et l'intégralité de vos données de progression.</p>
                <p className="text-sm">Rendez-vous sur la page <Link href="/profile" className="text-emerald-600 dark:text-emerald-400 font-semibold underline underline-offset-4">Profil</Link>, puis descendez jusqu'à la section "Zone de danger". La suppression nécessite de confirmer en tapant le mot "SUPPRIMER".</p>
              </div>
              <p>
                Pour l'exercice de vos autres droits, vous pouvez contacter le responsable de traitement par e-mail. Si vous estimez, après nous avoir contactés, que vos droits ne sont pas respectés, vous pouvez adresser une réclamation à la CNIL (<a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 font-semibold underline underline-offset-4">www.cnil.fr</a>).
              </p>
              <p>
                <strong>Sécurité :</strong> Les communications sont chiffrées en HTTPS et les mots de passe sont hachés de manière sécurisée (Argon2id) dans notre base de données.
              </p>
            </div>
          </section>

        </div>
        <LegalFooter />
      </div>
    </main>
  );
}
