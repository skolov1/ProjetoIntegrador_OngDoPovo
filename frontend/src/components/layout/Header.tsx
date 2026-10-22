/**
 * Header da landing.
 *
 * Três behaviours que o design exige:
 *  1. Transparente sobre o hero (claro), sólido e com blur ao rolar (escuro sobre verde)
 *  2. Menu mobile que abre/fecha
 *  3. Marca a seção visível no scroll (scroll-spy), para o usuário saber onde está
 */
import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'

import { InstagramIcon } from '@/components/ui/BrandIcons'

import { LinkBotao } from '@/components/ui/Button'
import { useScrollY } from '@/lib/useReveal'
import { NAVEGACAO, ONG } from '@/features/home/data'

export function Header() {
  const scrollY = useScrollY()
  const [menuAberto, setMenuAberto] = useState(false)
  const [secaoAtiva, setSecaoAtiva] = useState<string>('')

  // Transparente enquanto o hero ainda ocupa a tela; sólido depois.
  const rolou = scrollY > 40

  // Fecha o menu ao redimensionar para desktop, senão ele fica aberto sozinho.
  useEffect(() => {
    const aoRedimensionar = () => {
      if (window.innerWidth >= 1024) setMenuAberto(false)
    }
    window.addEventListener('resize', aoRedimensionar)
    return () => window.removeEventListener('resize', aoRedimensionar)
  }, [])

  // Trava o scroll do fundo enquanto o menu mobile estiver aberto.
  useEffect(() => {
    document.body.style.overflow = menuAberto ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuAberto])

  // Fecha o menu ao clicar em qualquer link (âncora).
  useEffect(() => {
    if (!menuAberto) return
    const aoClicar = () => setMenuAberto(false)
    window.addEventListener('click', aoClicar)
    return () => window.removeEventListener('click', aoClicar)
  }, [menuAberto])

  // Scroll-spy: marca o link da seção que está no topo da viewport.
  useEffect(() => {
    const aoRolar = () => {
      const marca = scrollY + window.innerHeight * 0.35
      let atual = ''
      for (const { href } of NAVEGACAO) {
        const secao = document.querySelector(href)
        if (secao && secao.getBoundingClientRect().top + scrollY <= marca) {
          atual = href
        }
      }
      setSecaoAtiva(atual)
    }

    aoRolar()
    window.addEventListener('scroll', aoRolar, { passive: true })
    return () => window.removeEventListener('scroll', aoRolar)
  }, [scrollY])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ease-smooth ${
        rolou || menuAberto
          ? 'bg-verde-escuro/95 text-white shadow-lg backdrop-blur-md'
          : 'bg-transparent text-verde-escuro'
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-8">
        {/* Logo */}
        <a href="#inicio" className="flex shrink-0 items-center gap-3" aria-label="ONG do Povo — início">
          <picture>
            <source srcSet="/logo-ong-do-povo.webp" type="image/webp" />
            <img
              src="/logo-ong-do-povo.png"
              alt=""
              width={44}
              height={44}
              className="size-11 object-contain"
            />
          </picture>
          <span className="hidden flex-col leading-none sm:flex">
            <span
              className={`text-lg font-extrabold tracking-tight transition-colors ${
                rolou || menuAberto ? 'text-white' : 'text-verde-escuro'
              }`}
            >
              {ONG.nome}
            </span>
            <span
              className={`mt-0.5 text-[0.6rem] font-bold uppercase tracking-[0.15em] transition-colors ${
                rolou || menuAberto ? 'text-mist-200' : 'text-verde'
              }`}
            >
              {ONG.areas.join(' · ')}
            </span>
          </span>
        </a>

        {/* Navegação desktop */}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navegação principal">
          {NAVEGACAO.map(({ label, href }) => {
            const ativo = secaoAtiva === href
            return (
              <a
                key={href}
                href={href}
                aria-current={ativo ? 'true' : undefined}
                className={`relative rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-300 ${
                  rolou || menuAberto
                    ? ativo
                      ? 'text-amarelo'
                      : 'text-white/80 hover:text-white'
                    : ativo
                      ? 'text-verde'
                      : 'text-verde-escuro/70 hover:text-verde-escuro'
                }`}
              >
                {label}
                {ativo && (
                  <span
                    aria-hidden="true"
                    className={`absolute inset-x-4 -bottom-0.5 h-0.5 rounded-full ${
                      rolou || menuAberto ? 'bg-amarelo' : 'bg-verde'
                    }`}
                  />
                )}
              </a>
            )
          })}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={ONG.instagramUrl}
            target="_blank"
            rel="noreferrer noopener"
            aria-label="Instagram da ONG do Povo"
            className={`hidden size-10 place-items-center rounded-full transition-all duration-300 hover:scale-110 sm:grid ${
              rolou || menuAberto ? 'bg-white/10 text-white' : 'bg-verde/10 text-verde'
            }`}
          >
            <InstagramIcon className="size-4" />
          </a>

          {/*<LinkBotao
            href="#doe"
            variante="secundaria"
            tamanho="md"
            seta={false}
            className="hidden sm:inline-flex"
          >
            Doar
          </LinkBotao>*/}

          {/* Botão do menu mobile */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setMenuAberto((a) => !a)
            }}
            aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuAberto}
            aria-controls="menu-mobile"
            className={`grid size-11 place-items-center rounded-full transition-colors lg:hidden ${
              rolou || menuAberto ? 'bg-white/10 text-white' : 'bg-verde/10 text-verde-escuro'
            }`}
          >
            {menuAberto ? (
              <X className="size-5" aria-hidden="true" />
            ) : (
              <Menu className="size-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Menu mobile */}
      <div
        id="menu-mobile"
        className={`overflow-hidden border-t border-white/10 transition-all duration-400 ease-smooth lg:hidden ${
          menuAberto ? 'max-h-[26rem] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <nav className="flex flex-col gap-1 px-6 py-5" aria-label="Navegação mobile">
          {NAVEGACAO.map(({ label, href }, i) => (
            <a
              key={href}
              href={href}
              onClick={(e) => e.stopPropagation()}
              style={{ transitionDelay: `${80 + i * 45}ms` }}
              className={`rounded-xl px-4 py-3 text-base font-semibold text-white transition-all duration-500 hover:bg-white/10 hover:text-amarelo ${
                menuAberto ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
              }`}
            >
              {label}
            </a>
          ))}
          <LinkBotao href="#doe" variante="secundaria" tamanho="md" className="mt-3 w-full">
            Quero doar
          </LinkBotao>
        </nav>
      </div>
    </header>
  )
}
