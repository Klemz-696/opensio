export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <div className="max-w-2xl space-y-4 rounded-xl border border-slate-800 bg-slate-950/60 p-8 shadow-2xl backdrop-blur">
        <div className="inline-flex items-center rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-400">
          Lot 0 — Socle Monorepo
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          OpenSIO
        </h1>
        <p className="text-base text-slate-400">
          Plateforme auto-hébergée de formation et de révision pratique pour le BTS SIO SISR.
        </p>
        <div className="pt-4 text-xs text-slate-500">
          Next.js 15 &bull; NestJS 11 &bull; PostgreSQL &bull; Monorepo Turborepo
        </div>
      </div>
    </main>
  );
}
