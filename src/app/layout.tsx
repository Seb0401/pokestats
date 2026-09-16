import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap" });

export const metadata: Metadata = {
  title: "PokéStats — Favoritos a la batalla",
  description:
    "Cuadro de doble entrada de Pokémon favoritos por categoría. El anfitrión marca el ritmo, " +
    "el sorteo elige las categorías y gana quien tenga al Pokémon más efectivo en VGC 2024.",
};

export const viewport: Viewport = {
  themeColor: "#0a0b12",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${outfit.variable}`}>
      <body>{children}</body>
    </html>
  );
}
