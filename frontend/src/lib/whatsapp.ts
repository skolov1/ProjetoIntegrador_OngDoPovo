/**
 * Todo contato com a ONG passa pelo WhatsApp. Esta função monta o link já com a
 * mensagem escrita, para o visitante só precisar apertar "enviar".
 */
import { ONG } from '@/features/home/data'

/**
 * Primeira linha da mensagem: o tópico em negrito e caixa alta (no WhatsApp o
 * negrito é *texto*), para a equipe bater o olho e saber do que se trata.
 */
export function topicoEmNegrito(topico: string): string {
  return `*${topico.trim().toUpperCase()}*`
}

export function linkWhatsapp(mensagem: string): string {
  return `${ONG.whatsapp}?text=${encodeURIComponent(mensagem)}`
}
