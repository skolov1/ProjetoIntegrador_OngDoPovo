import { describe, expect, it } from 'vitest'

import { deveRepetir } from './queryClient'

const erroHttp = (status: number) => ({ response: { status } })

describe('deveRepetir', () => {
  it('repete quando não houve resposta (API acordando ou timeout)', () => {
    expect(deveRepetir(0, new Error('Network Error'))).toBe(true)
  })
  it('repete erro 5xx', () => {
    expect(deveRepetir(1, erroHttp(503))).toBe(true)
  })
  it('não repete erro 4xx', () => {
    expect(deveRepetir(0, erroHttp(401))).toBe(false)
    expect(deveRepetir(0, erroHttp(404))).toBe(false)
  })
  it('para depois de 4 repetições', () => {
    expect(deveRepetir(4, new Error('Network Error'))).toBe(false)
  })
})
