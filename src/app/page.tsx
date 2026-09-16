"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, setPlayerToken } from "@/lib/client";
import { DexShell, Screen } from "@/components/Dex";
import { Alert } from "@/components/ui";
import {
  ArrowRightIcon, BallMark, BotIcon, BracketIcon, DiceIcon, ListIcon, SwordsIcon, TrophyIcon,
} from "@/components/icons";

const STEPS = [
  { icon: ListIcon, title: "Llena tu cuadro", text: "El anfitrión abre cada categoría y eliges a tu favorito. Si no eliges a tiempo, se sortea uno." },
  { icon: BracketIcon, title: "Se arman las llaves", text: "Torneo por eliminación. Si faltan entrenadores para llegar a 2, 4, 8, 16… entran bots." },
  { icon: SwordsIcon, title: "Duelos 6 vs 6", text: "En cada duelo se sortean 6 de tus Pokémon. Gana el equipo más efectivo del VGC 2024." },
  { icon: TrophyIcon, title: "Corona al campeón", text: "El anfitrión revela duelo por duelo hasta la final." },
];

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await api.join(code, nickname);
      setPlayerToken(code, res.playerToken);
      router.push(`/play/${code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo entrar.");
      setBusy(false);
    }
  }

  return (
    <main>
      <DexShell
        title={<>Poké<span className="text-volt-400">Stats</span></>}
        subtitle="Torneo de Pokémon favoritos"
        right={
          // Placa grabada: Universidad La Salle - Sebastián Barreda.
          <span
            className="block rounded-md border border-black/30 bg-gradient-to-b from-[#e9e6df] to-[#b9b4aa] px-2.5 py-1 font-display text-xs font-bold tracking-[0.2em] text-[#3a3530] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_0_rgba(0,0,0,0.35)] sm:px-3 sm:text-sm"
            title="Universidad La Salle"
          >
            ULS - SB
          </span>
        }
      >
        <div className="grid gap-4 md:grid-cols-[1.1fr_1fr]">
          <Screen>
            <form onSubmit={join} className="grid gap-3">
              <p className="eyebrow">Entrar a una sala</p>
              <h2 className="font-display text-2xl font-bold text-ink-100">¿Listo para el torneo?</h2>
              <p className="text-sm text-ink-300">Pide el código de 6 dígitos a quien dirige la partida.</p>
              <input
                className="field text-center font-display text-4xl font-bold tracking-[0.4em] tabular-nums text-volt-400"
                inputMode="numeric"
                autoComplete="off"
                placeholder="000000"
                maxLength={6}
                aria-label="Código de sala"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
              <input
                className="field"
                placeholder="Tu nombre de entrenador"
                maxLength={20}
                aria-label="Apodo"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
              {error && <Alert>{error}</Alert>}
              <button className="btn btn-primary" disabled={busy || code.length !== 6 || !nickname.trim()}>
                {busy ? "Entrando…" : <>Entrar <ArrowRightIcon size={18} /></>}
              </button>
            </form>
          </Screen>

          <Screen inner="flex flex-col">
            <div className="relative flex flex-1 flex-col gap-3 overflow-hidden">
              <div className="pointer-events-none absolute -right-16 -top-16 opacity-10" aria-hidden>
                <BallMark size={200} />
              </div>
              <p className="eyebrow">Dirigir una partida</p>
              <h2 className="font-display text-2xl font-bold text-ink-100">Sé el anfitrión</h2>
              <p className="text-sm text-ink-300">
                Elige las categorías, marca el ritmo y revela cada duelo en la pantalla grande.
              </p>
              <ul className="grid gap-2 text-sm text-ink-200">
                <li className="flex items-center gap-2"><ListIcon size={16} className="text-volt-400" /> 47 categorías para combinar</li>
                <li className="flex items-center gap-2"><BotIcon size={16} className="text-volt-400" /> Bots que completan las llaves</li>
                <li className="flex items-center gap-2"><DiceIcon size={16} className="text-volt-400" /> 1303 formas, con Megas y Gigamax</li>
              </ul>
              <Link href="/crear" className="btn btn-lens mt-auto">
                Crear sala <ArrowRightIcon size={18} />
              </Link>
            </div>
          </Screen>
        </div>

        <Screen>
          <p className="eyebrow mb-3">Cómo se juega</p>
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="panel grid content-start gap-2 p-3">
                <span className="flex items-center gap-2">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-dex-500 text-ink-100 shadow-[inset_0_-3px_0_rgba(0,0,0,0.25)]">
                    <s.icon size={18} />
                  </span>
                  <span className="font-display text-xs font-semibold text-screen-300">Paso {i + 1}</span>
                </span>
                <h3 className="font-display text-base font-bold text-ink-100">{s.title}</h3>
                <p className="text-xs leading-relaxed text-ink-300">{s.text}</p>
              </li>
            ))}
          </ol>
        </Screen>

        <Screen>
          <p className="eyebrow mb-2">¿Qué equipo gana?</p>
          <div className="grid gap-2 text-sm leading-relaxed text-ink-300">
            <p>
              Cada Pokémon tiene un <strong className="text-ink-100">puntaje competitivo secreto</strong> calculado
              sobre datos reales: 55 % su uso en el VGC 2024 (Smogon y Worlds) y 45 % sus estadísticas base. Gana el
              duelo el equipo de 6 con mejor promedio.
            </p>
            <p>
              El modelo sigue el informe de Estadística Aplicada: el poder total es el mejor predictor del uso
              (V de Cramér = .516) y los míticos, excluidos por el reglamento, pagan una penalización. Los puntajes
              no se muestran durante el juego.
            </p>
          </div>
        </Screen>
      </DexShell>
    </main>
  );
}
