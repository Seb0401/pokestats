import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", display: "swap" });
const fredoka = Fredoka({ subsets: ["latin"], variable: "--font-fredoka", display: "swap" });

export const metadata: Metadata = {
  title: "PokéStats — Torneo de favoritos",
  description:
    "Llena tu cuadro de Pokémon favoritos por categoría y compite en un torneo por llaves. " +
    "Gana el equipo más efectivo del VGC 2024.",
};

export const viewport: Viewport = {
  themeColor: "#b81d34",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${nunito.variable} ${fredoka.variable}`}>
      <body>{children}</body>
    </html>
  );
}
