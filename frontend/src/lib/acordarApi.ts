/**
 * A API gratuita do Render dorme depois de uns 15 minutos sem visitas e leva de 30 a
 * 60 s para acordar. Este "toque" sai assim que a página abre, em paralelo com as
 * consultas da grade, para a API começar a acordar o quanto antes. Falha em silêncio:
 * quem mostra o erro (ou o "carregando") são as próprias consultas.
 */
export function acordarApi(): void {
  const base = import.meta.env.VITE_API_URL?.trim()
  if (!base) return
  // no-cors: não importa a resposta, só que o pedido chegue ao servidor.
  fetch(`${base.replace(/\/$/, '')}/ping/`, { mode: 'no-cors', cache: 'no-store' }).catch(() => {})
}
