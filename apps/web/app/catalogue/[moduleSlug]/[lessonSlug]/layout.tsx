/**
 * Layout dédié aux pages de leçon.
 * Import du CSS KaTeX ici — unique point d'entrée — pour éviter de charger
 * ~30 kB sur l'ensemble de l'application (hors pages leçon).
 * Voir blueprint §17.1 (react-markdown + rehype/remark + Shiki).
 */
import 'katex/dist/katex.min.css';

export default function LessonLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
