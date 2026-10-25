/** Regras de cadastro de aluno no painel (idade, CPF e telefone). */

export function soDigitos(valor: string): string {
  return valor.replace(/\D/g, '')
}

/** Idade em anos completos a partir de "AAAA-MM-DD". Sem data válida, `null`. */
export function calcularIdade(nascimento: string, hoje: Date = new Date()): number | null {
  const [ano, mes, dia] = nascimento.split('-').map(Number)
  if (!ano || !mes || !dia) return null
  let idade = hoje.getFullYear() - ano
  if (hoje.getMonth() + 1 < mes || (hoje.getMonth() + 1 === mes && hoje.getDate() < dia)) idade -= 1
  return idade >= 0 ? idade : null
}

export function ehMenor(nascimento: string, hoje?: Date): boolean {
  const idade = calcularIdade(nascimento, hoje)
  return idade !== null && idade < 18
}

/** Confere os dois dígitos verificadores; recusa sequências como 111.111.111-11. */
export function cpfValido(valor: string): boolean {
  const cpf = soDigitos(valor)
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
  for (const tamanho of [9, 10]) {
    let soma = 0
    for (let i = 0; i < tamanho; i++) soma += Number(cpf[i]) * (tamanho + 1 - i)
    if (((soma * 10) % 11) % 10 !== Number(cpf[tamanho])) return false
  }
  return true
}

/** DDD + 8 ou 9 dígitos. O DDD não começa com 0. */
export function telefoneValido(valor: string): boolean {
  const numero = soDigitos(valor)
  return (numero.length === 10 || numero.length === 11) && numero[0] !== '0'
}

/** Máscara de exibição: 123.***.***-00. */
export function mascararCpf(valor: string): string {
  const cpf = soDigitos(valor)
  return cpf.length === 11 ? `${cpf.slice(0, 3)}.***.***-${cpf.slice(9)}` : '***'
}

/** Valor por turma. O servidor é quem calcula de verdade; aqui é só a prévia no formulário. */
export const MENSALIDADE_POR_TURMA = 20

export function calcularMensalidade(qtdTurmas: number): number {
  return MENSALIDADE_POR_TURMA * qtdTurmas
}
