/**
 * Mapeamento dos ícones usados na landing.
 *
 * lucide-react tem milhares de ícones genéricos, mas a identidade da ONG pede
 * ícones que representem as modalidades reais. Mantemos um mapa `nomeDoIcone`
 * (vindo do content em data.ts) para componente React, assim o conteúdo
 * continua sendo dado puro e serializável — e poderia vir da API no futuro
 * sem mudar nada aqui.
 */
import {
  Award,
  BookOpen,
  CalendarCheck,
  Droplets,
  Dumbbell,
  Eye,
  Glasses,
  Goal,
  Guitar,
  HandFist,
  HandHeart,
  Heart,
  HeartHandshake,
  HeartPulse,
  PartyPopper,
  ShieldCheck,
  Shirt,
  Sparkles,
  Sprout,
  Star,
  Trophy,
  Users,
  Volleyball,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const MAPA: Record<string, LucideIcon> = {
  users: Users,
  run: Award,
  heart: Heart,
  hands: HandHeart,
  star: Star,

  shield: ShieldCheck,
  sprout: Sprout,
  heartPulse: HeartPulse,
  punho: HandFist,
  jazz: Guitar,
  funcional: Dumbbell,

  ballet: Sparkles,
  // lucide-react não tem ícone de basquete nesta versão. `Goal` (o aro) é o mais
  // próximo; se a lib atualizar com um ícone próprio, é só trocar a linha.
  basquete: Goal,
  futsal: Volleyball,
  olhos: Eye,
  capacitacao: BookOpen,
  festa: PartyPopper,
}

export function icone(nome: string): LucideIcon {
  return MAPA[nome] ?? Sparkles
}

/** Cores da paleta da marca por nome (usado em data.ts). */
const CORES: Record<string, { bg: string; text: string; ring: string }> = {
  verde: { bg: 'bg-verde', text: 'text-verde', ring: 'ring-verde/20' },
  amarelo: { bg: 'bg-amarelo', text: 'text-verde-escuro', ring: 'ring-amarelo/30' },
  laranja: { bg: 'bg-laranja', text: 'text-laranja', ring: 'ring-laranja/20' },
  vermelho: { bg: 'bg-vermelho', text: 'text-vermelho', ring: 'ring-vermelho/20' },
  roxo: { bg: 'bg-roxo', text: 'text-roxo', ring: 'ring-roxo/20' },
  azul: { bg: 'bg-azul', text: 'text-azul', ring: 'ring-azul/20' },
  grafite: { bg: 'bg-grafite', text: 'text-grafite', ring: 'ring-grafite/20' },
}

export function cor(nome: string) {
  return CORES[nome] ?? CORES.verde
}

/* Reexportados para não espalhar imports de lucide pelos componentes. */
export {
  CalendarCheck,
  Droplets,
  Glasses,
  Goal,
  HeartHandshake,
  Shirt,
  Trophy,
}
