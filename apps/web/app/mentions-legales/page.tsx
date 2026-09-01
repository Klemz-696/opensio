import React from 'react';
import { Metadata } from 'next';
import { Shield, BookOpen, Server, Scale } from 'lucide-react';
import { LegalFooter } from '../../components/layout/legal-footer';

export const metadata: Metadata = {
  title: 'Mentions Légales | OpenSIO',
  description: 'Mentions légales de la plateforme OpenSIO',
};

export default function MentionsLegalesPage() {
  return (
    <main className="min-h-screen p-4 py-12 relative bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white flex flex-col items-center">
      {/* Dynamic background accents */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sky-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-4xl z-10 space-y-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">Mentions Légales</h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">En vigueur au 1er Septembre 2026</p>
        </div>

        <div className="glass-panel p-8 md:p-10 rounded-3xl shadow-xl dark:shadow-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl space-y-12">
          
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <Shield className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">1. Éditeur du site</h2>
            </div>
            <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">
              <p>Le site OpenSIO est édité à titre personnel.</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Nom de l'éditeur :</strong> Klemz</li>
                <li><strong>Contact email :</strong> <a href="mailto:klemz.support@gmail.com" className="text-sky-600 dark:text-sky-400 hover:underline">klemz.support@gmail.com</a></li>
                <li><strong>Directeur de la publication :</strong> Klemz</li>
              </ul>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <Server className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">2. Hébergement</h2>
            </div>
            <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">
              <p>
                Ce site est auto-hébergé sur l'infrastructure (Homelab) de l'éditeur.
                Aucun sous-traitant tiers n'est impliqué dans l'hébergement physique des données.
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Hébergeur :</strong> Klemz</li>
                <li><strong>Localisation des serveurs :</strong> France</li>
              </ul>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <BookOpen className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">3. Propriété intellectuelle</h2>
            </div>
            <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">
              <p>
                L'ensemble du contenu pédagogique (textes, leçons, quiz, scénarios de lab) présent sur la plateforme OpenSIO est protégé par le droit d'auteur. Sauf mention contraire, sa reproduction partielle ou totale est soumise à l'autorisation écrite de l'éditeur.
              </p>
            </div>
          </section>
          
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <Scale className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">4. Limitation de responsabilité et Crédits</h2>
            </div>
            <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 space-y-4">
              <p>
                L'éditeur s'efforce de fournir des informations pédagogiques aussi précises que possible. Toutefois, il ne pourra être tenu responsable des omissions, des inexactitudes et des carences dans la mise à jour, qu'elles soient de son fait ou du fait des tiers partenaires qui lui fournissent ces informations.
              </p>
              <p>
                La plateforme OpenSIO a été construite avec des technologies open source. L'éditeur remercie les communautés des projets suivants :
              </p>
              <ul className="list-disc pl-5">
                <li>Next.js, React et Tailwind CSS pour l'interface utilisateur.</li>
                <li>NestJS et PostgreSQL pour l'infrastructure backend.</li>
                <li>Lucide Icons pour l'iconographie.</li>
              </ul>
              <p>
                Le présent site est soumis au droit français. En cas de litige, les tribunaux français seront seuls compétents.
              </p>
            </div>
          </section>

        </div>
        
        <LegalFooter />
      </div>
    </main>
  );
}
