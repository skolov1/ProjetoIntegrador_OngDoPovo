import { useEffect, useState } from 'react'

/** Devolve `valor` só depois de ficar `atrasoMs` parado (evita uma busca por tecla digitada). */
export function useDebounce<T>(valor: T, atrasoMs = 300): T {
  const [atrasado, setAtrasado] = useState(valor)

  useEffect(() => {
    const id = setTimeout(() => setAtrasado(valor), atrasoMs)
    return () => clearTimeout(id)
  }, [valor, atrasoMs])

  return atrasado
}
