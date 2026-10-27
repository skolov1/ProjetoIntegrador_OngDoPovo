/**
 * Footer — identidade, navegação, contato e créditos.
 * Inclui navegação por teclado ao topo e links legais.
 */
import { ArrowUp, Mail, MessageCircle } from "lucide-react";

import { FacebookIcon, InstagramIcon } from "@/components/ui/BrandIcons";

import { LinkBotao } from "@/components/ui/Button";
import { Sunburst } from "@/components/ui/Sunburst";
import { NAVEGACAO, ONG } from "@/features/home/data";

const REDES = [
  { Icon: InstagramIcon, rotulo: "Instagram", href: ONG.instagramUrl },
  { Icon: FacebookIcon, rotulo: "Facebook", href: ONG.facebook },
  { Icon: MessageCircle, rotulo: "WhatsApp", href: ONG.whatsapp },
  { Icon: Mail, rotulo: "E-mail", href: `mailto:${ONG.email}` },
] as const;

interface FooterProps {
  /** Ajusta as âncoras da landing quando o rodapé é reutilizado em outra página. */
  onPrivacyPage?: boolean;
}

export function Footer({ onPrivacyPage = false }: FooterProps) {
  const ano = new Date().getFullYear();
  const homePrefix = onPrivacyPage ? "/" : "";

  return (
    <footer className="relative overflow-hidden bg-verde-900 text-white">
      <Sunburst
        tone="white"
        size={520}
        rays={26}
        fill={0.04}
        spin={false}
        className="pointer-events-none absolute -left-40 -bottom-40 text-white opacity-25 select-none"
      />

      <div className="relative mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
          {/* Identidade */}
          <div>
            <div className="flex items-center gap-3">
              <picture>
                <source srcSet="/logo-icone.webp" type="image/webp" />
                <img
                  src="/logo-icone.png"
                  alt=""
                  width={48}
                  height={48}
                  className="size-12 object-contain"
                />
              </picture>
              <span className="flex flex-col leading-none">
                <span className="text-xl font-extrabold tracking-tight">
                  {ONG.nome}
                </span>
                <span className="mt-1 text-[0.7rem] font-bold uppercase tracking-[0.15em] text-mist-200">
                  {ONG.areas.join(" · ")}
                </span>
              </span>
            </div>

            <p className="mt-5 max-w-sm text-sm leading-relaxed text-mist-200">
              {ONG.slogan}
            </p>

            <ul className="mt-6 flex gap-2">
              {REDES.map(({ Icon, rotulo, href }) => (
                <li key={rotulo}>
                  <a
                    href={`${homePrefix}${href}`}
                    aria-label={rotulo}
                    {...(href.startsWith("http")
                      ? { target: "_blank", rel: "noreferrer noopener" }
                      : {})}
                    className="grid size-10 place-items-center rounded-full bg-white/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-verde hover:text-white"
                  >
                    <Icon className="size-4" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Navegação */}
          <nav aria-label="Links do rodapé">
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-amarelo">
              Navegação
            </h2>
            <ul className="mt-5 flex flex-col gap-2.5">
              {NAVEGACAO.map(({ label, href }) => (
                <li key={href}>
                  <a
                    href={href}
                    className="text-sm text-mist-200 transition-colors hover:text-white"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Endereço */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-amarelo">
              Onde estamos
            </h2>
            <address className="mt-5 text-sm not-italic leading-relaxed text-mist-200">
              <a
                href={ONG.linkMaps}
                target="_blank"
                rel="noreferrer noopener"
                className="transition-colors hover:text-white"
              >
                {ONG.endereco}
              </a>
              <br />
              <a
                href={ONG.whatsapp}
                className="transition-colors hover:text-white"
              >
                {ONG.telefone}
              </a>
              {" · "}
              <a
                href={`mailto:${ONG.email}`}
                className="transition-colors hover:text-white"
              >
                {ONG.email}
              </a>
            </address>

            <LinkBotao
              href="#doe"
              variante="secundaria"
              tamanho="md"
              className="mt-6"
            >
              Fazer uma doação
            </LinkBotao>
          </div>
        </div>

        {/* Barra inferior */}
        <div className="mt-14 flex flex-col items-center justify-between gap-5 border-t border-white/10 pt-7 sm:flex-row">
          <p className="text-center text-xs text-mist-200/70 sm:text-left">
            © {ano} {ONG.nome} — {ONG.cidade}. Todos os direitos reservados.
          </p>

          <div className="flex items-center gap-5">
            <a
              href="/privacidade.html"
              className="text-xs text-mist-200/70 transition-colors hover:text-white"
            >
              Política de Privacidade
            </a>
            <a
              href={onPrivacyPage ? "/#inicio" : "#inicio"}
              className="grid size-9 place-items-center rounded-full bg-white/10 transition-all duration-300 hover:bg-verde hover:text-white"
              aria-label="Voltar ao topo"
            >
              <ArrowUp className="size-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
