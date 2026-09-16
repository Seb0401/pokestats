import Link from "next/link";
import { ArrowLeftIcon, BallMark } from "./icons";

/** Cruceta decorativa. */
export function DPad({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 60" className={className} aria-hidden>
      <path
        d="M22 4h16a2 2 0 0 1 2 2v16h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H40v16a2 2 0 0 1-2 2H22a2 2 0 0 1-2-2V38H4a2 2 0 0 1-2-2V24a2 2 0 0 1 2-2h16V6a2 2 0 0 1 2-2z"
        fill="#1b1d26"
      />
      <circle cx="30" cy="30" r="5" fill="#2b2f3b" />
      <path d="M30 9l4 5h-8zM30 51l4-5h-8zM9 30l5-4v8zM51 30l-5-4v8z" fill="#3a3f4f" />
    </svg>
  );
}

export function Grill({ lines = 4, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`grill ${className}`} aria-hidden>
      {Array.from({ length: lines }, (_, i) => <i key={i} />)}
    </div>
  );
}

/** Poke Ball gigante y translúcida detrás del contenido. */
export function BallWatermark({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute opacity-[0.06] ${className}`} aria-hidden>
      <BallMark size={420} />
    </div>
  );
}

/**
 * Carcasa roja de la Pokédex: lente, luces, título y la muesca característica de
 * la tapa. Todo lo que va dentro se monta sobre `Screen`.
 */
export function DexShell({
  title, subtitle, right, children, back, footer = true,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  back?: string;
  footer?: boolean;
}) {
  return (
    <div className="relative mx-auto w-full max-w-5xl px-3 py-5 sm:px-5 sm:py-8">
      <BallWatermark className="-right-40 -top-24 hidden lg:block" />
      <section className="dex relative pb-4 sm:pb-6">
        {/* Cabecera con lente y luces */}
        <header className="relative flex items-center gap-3 px-4 pt-4 sm:gap-5 sm:px-6 sm:pt-5">
          <div className="lens size-12 shrink-0 sm:size-16" aria-hidden />
          <div className="flex gap-1.5 self-start pt-1" aria-hidden>
            <span className="led led-red led-blink" />
            <span className="led led-yellow" />
            <span className="led led-green" />
          </div>
          <div className="min-w-0 flex-1">
            {back && (
              <Link
                href={back}
                className="inline-flex items-center gap-1 text-xs font-bold text-white/70 hover:text-white"
              >
                <ArrowLeftIcon size={14} /> Volver
              </Link>
            )}
            <h1 className="truncate font-display text-2xl font-bold text-ink-100 drop-shadow-[0_2px_0_rgba(0,0,0,0.35)] sm:text-3xl">
              {title}
            </h1>
            {subtitle && <p className="truncate text-sm font-semibold text-white/75">{subtitle}</p>}
          </div>
          {right && <div className="shrink-0">{right}</div>}
        </header>

        {/* Muesca de la tapa */}
        <svg viewBox="0 0 400 24" preserveAspectRatio="none" className="mt-3 block h-5 w-full" aria-hidden>
          <path d="M0 18 H170 L196 4 H400" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="3" />
          <path d="M0 20 H171 L197 6 H400" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
        </svg>

        <div className="grid gap-4 px-3 pt-2 sm:px-6">{children}</div>

        {footer && (
          <div className="mt-5 hidden items-center justify-between px-6 sm:flex" aria-hidden>
            <DPad className="size-14" />
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-12 rounded-full bg-black/35 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]" />
              <span className="h-2.5 w-12 rounded-full bg-black/35 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]" />
            </div>
            <Grill lines={4} className="w-16" />
          </div>
        )}
      </section>
    </div>
  );
}

/** Pantalla con bisel oscuro. */
export function Screen({
  children, className = "", inner = "",
}: {
  children: React.ReactNode;
  className?: string;
  inner?: string;
}) {
  return (
    <div className={`bezel ${className}`}>
      <div className={`screen p-3 sm:p-5 ${inner}`}>{children}</div>
    </div>
  );
}

/** Código de sala con aspecto de placa. */
export function CodePlate({ code }: { code: string }) {
  return (
    <span className="rounded-lg bg-black/30 px-2.5 py-1 font-display text-sm font-bold tracking-[0.25em] text-volt-400 tabular-nums shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]">
      {code}
    </span>
  );
}
