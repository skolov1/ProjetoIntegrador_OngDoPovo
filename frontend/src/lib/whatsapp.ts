/**
 * Todo contato com a ONG passa pelo WhatsApp. Esta função monta o link já com a
 * mensagem escrita, para o visitante só precisar apertar "enviar".
 */
import { ONG } from '@/features/home/data'

export function linkWhatsapp(mensagem: string): string {
  return `${ONG.whatsapp}?text=${encodeURIComponent(mensagem)}`
}
