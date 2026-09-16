import type { SVGProps } from "react";

/**
 * Iconos propios, dibujados sobre una rejilla de 24x24 con trazo de 2px. Heredan
 * el color del texto (`currentColor`), asi que se tiñen con clases de Tailwind.
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number; title?: string };

function Svg({ size = 20, title, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      {...rest}
    >
      {title && <title>{title}</title>}
      {children}
    </svg>
  );
}

// --- Interfaz -----------------------------------------------------------------

export const LockIcon = (p: IconProps) => (
  <Svg {...p}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Svg>
);
export const DiceIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <circle cx="9" cy="9" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="15" cy="15" r="1.2" fill="currentColor" stroke="none" />
  </Svg>
);
export const CheckIcon = (p: IconProps) => <Svg {...p}><path d="M5 12l4 4 10-10" /></Svg>;
export const CloseIcon = (p: IconProps) => <Svg {...p}><path d="M6 6l12 12M18 6L6 18" /></Svg>;
export const TrophyIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 4h8v5a4 4 0 0 1-8 0z" /><path d="M8 6H5a3 3 0 0 0 3 4" /><path d="M16 6h3a3 3 0 0 1-3 4" />
    <path d="M12 13v4" /><path d="M8 21h8" /><path d="M9 17h6v4H9z" />
  </Svg>
);
export const BotIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="5" y="8" width="14" height="11" rx="3" /><path d="M12 4v4" /><circle cx="12" cy="3.5" r="1" />
    <circle cx="9.5" cy="13" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="14.5" cy="13" r="1.1" fill="currentColor" stroke="none" /><path d="M10 16.5h4" />
  </Svg>
);
export const UserIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></Svg>
);
export const SearchIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5" /></Svg>
);
export const ArrowRightIcon = (p: IconProps) => <Svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Svg>;
export const ArrowLeftIcon = (p: IconProps) => <Svg {...p}><path d="M19 12H5M11 6l-6 6 6 6" /></Svg>;
export const ChevronUpIcon = (p: IconProps) => <Svg {...p}><path d="M6 15l6-6 6 6" /></Svg>;
export const ChevronDownIcon = (p: IconProps) => <Svg {...p}><path d="M6 9l6 6 6-6" /></Svg>;
export const EyeIcon = (p: IconProps) => (
  <Svg {...p}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></Svg>
);
export const PlayIcon = (p: IconProps) => <Svg {...p}><path d="M7 4l13 8-13 8z" /></Svg>;
export const SparkleIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" /></Svg>
);
export const SwordsIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14.5 17.5L3 6V3h3l11.5 11.5" /><path d="M13 19l6-6" /><path d="M16 16l4 4" />
    <path d="M9.5 17.5L21 6V3h-3L6.5 14.5" /><path d="M11 19l-6-6" /><path d="M8 16l-4 4" />
  </Svg>
);
export const BracketIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 5h5v6H3" /><path d="M3 13h5v6H3" /><path d="M8 8h3v8H8" /><path d="M11 12h4" />
    <path d="M15 9h6v6h-6z" />
  </Svg>
);
export const ListIcon = (p: IconProps) => (
  <Svg {...p}><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1" /><circle cx="4.5" cy="12" r="1" /><circle cx="4.5" cy="18" r="1" /></Svg>
);

/** Poke Ball de linea, para iconos pequeños. */
export const BallIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h6M15 12h6" /><circle cx="12" cy="12" r="3" /></Svg>
);

/** Poke Ball rellena, para decoracion y el spinner. */
export function BallMark({ size = 24, className, closed = true }: { size?: number; className?: string; closed?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M2.5 12a9.5 9.5 0 0 1 19 0h-6.2a3.3 3.3 0 0 0-6.6 0z" fill="var(--color-dex-500)" />
      <path d="M2.5 12a9.5 9.5 0 0 0 19 0h-6.2a3.3 3.3 0 0 1-6.6 0z" fill="#f4f1ea" />
      <circle cx="12" cy="12" r="9.5" fill="none" stroke="#1b1d26" strokeWidth="1.6" />
      <path d="M2.5 12h6.2M15.3 12h6.2" stroke="#1b1d26" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="3.3" fill="#f4f1ea" stroke="#1b1d26" strokeWidth="1.6" />
      {closed && <circle cx="12" cy="12" r="1.4" fill="none" stroke="#1b1d26" strokeWidth="1" />}
    </svg>
  );
}

// --- Categorias ---------------------------------------------------------------

export const CrownIcon = (p: IconProps) => <Svg {...p}><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" /></Svg>;
export const StarIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z" /></Svg>
);
export const EggIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 3c-4 0-7 6-7 11a7 7 0 0 0 14 0c0-5-3-11-7-11z" /><path d="M7.5 13l2 2 2.5-2 2.5 2 2-2" /></Svg>
);
export const BladeIcon = (p: IconProps) => (
  <Svg {...p}><path d="M20 3l1 1-11 11-2-2z" /><path d="M5 12l7 7" /><path d="M7 17l-4 4" /></Svg>
);
export const FeatherIcon = (p: IconProps) => (
  <Svg {...p}><path d="M20 4c-9 0-14 6-14 14" /><path d="M20 4c0 8-6 14-14 14" /><path d="M4 20l7-7" /></Svg>
);
export const PawIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="6.5" cy="10.5" r="1.7" /><circle cx="10" cy="6.5" r="1.7" /><circle cx="14" cy="6.5" r="1.7" />
    <circle cx="17.5" cy="10.5" r="1.7" />
    <path d="M12 12.5c-3 0-5 3-5 5 0 1.6 1.3 2.4 2.8 2.1 1-.2 1.5-.6 2.2-.6s1.2.4 2.2.6c1.5.3 2.8-.5 2.8-2.1 0-2-2-5-5-5z" />
  </Svg>
);
export const GolemIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="7" y="3" width="10" height="9" rx="2" />
    <circle cx="9.5" cy="7.5" r=".9" fill="currentColor" stroke="none" />
    <circle cx="12" cy="7.5" r=".9" fill="currentColor" stroke="none" />
    <circle cx="14.5" cy="7.5" r=".9" fill="currentColor" stroke="none" />
    <path d="M5 21v-4a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v4" />
  </Svg>
);
export const EarsIcon = (p: IconProps) => (
  <Svg {...p}><path d="M4 3l6 7-3 2z" /><path d="M20 3l-6 7 3 2z" /><ellipse cx="12" cy="15" rx="6" ry="5" /></Svg>
);
export const PortalIcon = (p: IconProps) => (
  <Svg {...p}><ellipse cx="12" cy="12" rx="9" ry="4.5" /><ellipse cx="12" cy="12" rx="4.5" ry="2" /><path d="M12 3v2M12 19v2" /></Svg>
);
export const HourglassIcon = (p: IconProps) => (
  <Svg {...p}><path d="M6 3h12M6 21h12" /><path d="M7 3c0 5 10 5 10 9s-10 4-10 9" /><path d="M17 3c0 5-10 5-10 9s10 4 10 9" /></Svg>
);
export const GemIcon = (p: IconProps) => (
  <Svg {...p}><path d="M6 3h12l4 6-10 12L2 9z" /><path d="M2 9h20" /><path d="M12 21L8 9l4-6 4 6z" /></Svg>
);
export const GrowIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 21V5" /><path d="M6 11l6-6 6 6" /><path d="M5 21h14" /><path d="M3 16h4M17 16h4" /></Svg>
);
export const MapIcon = (p: IconProps) => (
  <Svg {...p}><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z" /><path d="M9 4v14M15 6v14" /></Svg>
);
export const WindIcon = (p: IconProps) => (
  <Svg {...p}><path d="M3 8h11a3 3 0 1 0-3-3" /><path d="M3 12h16a3 3 0 1 1-3 3" /><path d="M3 16h7" /></Svg>
);
export const ShieldIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /></Svg>
);
export const FistIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 11V7a2 2 0 0 1 4 0v4" /><path d="M11 10V6a2 2 0 0 1 4 0v4" />
    <path d="M15 10V7a2 2 0 0 1 4 0v6a8 8 0 0 1-8 8h-1a6 6 0 0 1-6-6v-2a2 2 0 0 1 3-1.7" />
  </Svg>
);
export const OrbIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M5 19l2-2" />
  </Svg>
);
export const MonoIcon = (p: IconProps) => (
  <Svg {...p}><rect x="5" y="5" width="14" height="14" rx="3" /><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" /></Svg>
);
export const CartridgeIcon = (p: IconProps) => (
  <Svg {...p}><path d="M6 3h9l3 3v15H6z" /><rect x="9" y="12" width="6" height="5" rx="1" /><path d="M9 6h4" /></Svg>
);

export const HatchIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 14a7 7 0 0 0 14 0" /><path d="M5 14l2.5-2 2.5 2 2-2 2 2 2.5-2 2.5 2" />
    <path d="M12 2l1 2.5 2.5 1-2.5 1L12 9l-1-2.5-2.5-1 2.5-1z" />
  </Svg>
);
export const CoverIcon = (p: IconProps) => (
  <Svg {...p}><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M5 7h14" /><path d="M9 16l3-6 3 6" /></Svg>
);
export const WaveIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2 8c2-2 4-2 5 0s3 2 5 0 3-2 5 0 3 2 5 0" /><path d="M2 13c2-2 4-2 5 0s3 2 5 0 3-2 5 0 3 2 5 0" />
    <path d="M2 18c2-2 4-2 5 0s3 2 5 0 3-2 5 0 3 2 5 0" />
  </Svg>
);
export const CloudIcon = (p: IconProps) => (
  <Svg {...p}><path d="M7 17a4 4 0 0 1-.5-8A5.5 5.5 0 0 1 17 8a4.5 4.5 0 0 1 0 9z" /><path d="M10 17l-1.5 4M14 17l-1.5 4" /></Svg>
);
export const TotemIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 4h12v9a6 6 0 0 1-12 0z" /><path d="M9 9h2M13 9h2" /><path d="M10 14h4" />
    <path d="M3 7l3 2M21 7l-3 2" />
  </Svg>
);
export const UrnIcon = (p: IconProps) => (
  <Svg {...p}><path d="M9 3h6" /><path d="M10 3v3c-3 1-5 4-5 7a7 7 0 0 0 14 0c0-3-2-6-5-7V3" /><path d="M8 13h8" /><path d="M9 21h6" /></Svg>
);
export const BottleIcon = (p: IconProps) => (
  <Svg {...p}><path d="M10 2h4v3h-4z" /><path d="M9 5h6l1 3v12a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V8z" /><path d="M8 12h8M8 16h8" /></Svg>
);
export const FossilIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 12a1.5 1.5 0 1 1 1.5-1.5 3.5 3.5 0 1 1-3.5-3.5 5.5 5.5 0 1 1-5.5 5.5" /><path d="M4.5 12.5L3 20h8" /></Svg>
);
export const MouseIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 3l3 6M15 3l-3 6" /><circle cx="10" cy="14" r="5" />
    <circle cx="8.2" cy="13.5" r=".8" fill="currentColor" stroke="none" /><circle cx="11.8" cy="13.5" r=".8" fill="currentColor" stroke="none" />
    <path d="M15 16l3-2-1 3 4-2" />
  </Svg>
);

// --- Tipos elementales --------------------------------------------------------

const TYPE_PATHS: Record<string, React.ReactNode> = {
  normal: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /></>,
  fire: <path d="M12 3c1 4 5 6 5 11a5 5 0 0 1-10 0c0-3 2-4 2-7 1.5 1 2.5 2 3 4 1-3 0-6 0-8z" />,
  water: <path d="M12 3c3 4.5 6 8 6 11.5a6 6 0 0 1-12 0C6 11 9 7.5 12 3z" />,
  grass: <><path d="M5 19c0-8 5-14 15-15-1 10-7 15-15 15z" /><path d="M5 19l9-9" /></>,
  electric: <path d="M13 2L4 14h7l-1 8 9-12h-7z" />,
  ice: <><path d="M12 2v20M3.5 7l17 10M20.5 7l-17 10" /><path d="M9 3.5l3 2 3-2M9 20.5l3-2 3 2" /></>,
  fighting: <><path d="M7 11V7a2 2 0 0 1 4 0v4" /><path d="M11 10V6a2 2 0 0 1 4 0v4" /><path d="M15 10V7a2 2 0 0 1 4 0v6a8 8 0 0 1-8 8h-1a6 6 0 0 1-6-6v-2a2 2 0 0 1 3-1.7" /></>,
  poison: <><circle cx="9" cy="14" r="5" /><circle cx="16" cy="7.5" r="3" /><circle cx="18" cy="16.5" r="1.5" /></>,
  ground: <><path d="M2 20h20" /><path d="M4 20l5-9 3 4 3-6 5 11" /></>,
  flying: <><path d="M3 17c4 0 8-2 11-6 2-3 4-6 7-7-1 5-3 9-6 11-3 2-7 3-12 2z" /><path d="M8 15l4-3M11 14l4-4" /></>,
  psychic: <path d="M12 12a1 1 0 1 0 2 0 3 3 0 1 0-6 0 5 5 0 1 0 10 0 7 7 0 1 0-14 0" />,
  bug: <><ellipse cx="12" cy="14.5" rx="5" ry="6" /><circle cx="12" cy="6" r="2.5" /><path d="M12 8.5v12M10 4L8 2M14 4l2-2M7 12H4M7 16H4M17 12h3M17 16h3" /></>,
  rock: <><path d="M4 18l3-9 5-4 6 3 2 8-4 4H8z" /><path d="M7 9l5 3 6-4M12 12v8" /></>,
  ghost: <><path d="M6 20v-9a6 6 0 0 1 12 0v9l-2-2-2 2-2-2-2 2-2-2z" /><circle cx="10" cy="11" r="1" fill="currentColor" stroke="none" /><circle cx="14" cy="11" r="1" fill="currentColor" stroke="none" /></>,
  dragon: <><path d="M4 20c2-8 6-14 16-16-3 3-4 6-4 9 0 4-4 7-12 7z" /><path d="M9 15l3-3" /></>,
  dark: <path d="M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10z" />,
  steel: <><path d="M12 2l8.7 5v10L12 22l-8.7-5V7z" /><circle cx="12" cy="12" r="3" /></>,
  fairy: <path d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z" />,
};

export function TypeIcon({ type, ...p }: IconProps & { type: string }) {
  return <Svg {...p}>{TYPE_PATHS[type] ?? TYPE_PATHS.normal}</Svg>;
}

// --- Icono por categoria --------------------------------------------------------

const CATEGORY_ICONS: Record<string, (p: IconProps) => React.ReactElement> = {
  "favorito-absoluto": StarIcon,
  inicial: EggIcon,
  legendario: CrownIcon,
  "legendario-especial": SparkleIcon,
  mitico: StarIcon,
  pseudolegendario: BladeIcon,
  "trio-aves": FeatherIcon,
  "trio-bestias": PawIcon,
  "trio-regis": GolemIcon,
  eeveelucion: EarsIcon,
  ultraente: PortalIcon,
  paradoja: HourglassIcon,
  mega: GemIcon,
  gigamax: GrowIcon,
  regional: MapIcon,
  veloz: WindIcon,
  muro: ShieldIcon,
  "atacante-fisico": FistIcon,
  "atacante-especial": OrbIcon,
  monotipo: MonoIcon,
  "inicial-final": HatchIcon,
  "legendario-portada": CoverIcon,
  "trio-lagos": WaveIcon,
  "espadas-justicia": BladeIcon,
  "fuerzas-naturaleza": CloudIcon,
  "guardianes-alola": TotemIcon,
  "tesoros-funestos": UrnIcon,
  bebe: BottleIcon,
  fosil: FossilIcon,
  pikaclon: MouseIcon,
};

/** Iniciales por tipo: se dibujan con el icono del tipo. */
const STARTER_TYPES: Record<string, string> = {
  "inicial-planta": "grass", "inicial-fuego": "fire", "inicial-agua": "water",
};

/** Icono de una categoria. Tipos y generaciones se derivan del slug. */
export function CategoryIcon({ slug, ...p }: IconProps & { slug: string }) {
  if (slug.startsWith("tipo-")) return <TypeIcon type={slug.slice(5)} {...p} />;
  if (slug.startsWith("gen-")) return <CartridgeIcon {...p} />;
  if (STARTER_TYPES[slug]) return <TypeIcon type={STARTER_TYPES[slug]} {...p} />;
  const Icon = CATEGORY_ICONS[slug] ?? BallIcon;
  return <Icon {...p} />;
}
