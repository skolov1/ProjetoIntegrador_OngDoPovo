/**
 * Patrocinadores — faixa contínua de logos entre "Doe" e "Contato".
 *
 * Cada logo fica num cartão de tamanho fixo, todos num cinza médio: as marcas misturam
 * texto branco (Batidão), bege (Ana Paula) e azul-marinho/preto (Veraneio, Tico Tico), e
 * esse tom dá contraste razoável com os dois extremos. Direto no verde-escuro da seção
 * várias sumiriam. A lista vem de `PATROCINADORES` (data.ts).
 * O movimento é CSS puro (ver `.faixa-patrocinadores` em index.css): pausa com o mouse e,
 * com "reduzir movimento" ligado, vira uma grade parada.
 */
import { Eyebrow, Section, SectionTitle } from '@/components/ui/Section'
import { Reveal } from '@/components/ui/Reveal'
import { PATROCINADORES } from '@/features/home/data'

export function SponsorsSection() {
  return (
    <Section
      id="patrocinadores"
      tom="verde"
      tamanho="compacto"
      className="border-t border-white/10"
    >
      <Reveal>
        <div className="text-center">
          <Eyebrow tom="escuro">Quem apoia a ONG</Eyebrow>
          <SectionTitle tom="escuro">Patrocinadores</SectionTitle>
        </div>
      </Reveal>

      <div className="faixa-patrocinadores mt-10">
        <ul aria-label="Empresas patrocinadoras" className="faixa-trilho">
          {/* Segunda cópia só fecha o loop da animação: fica escondida dos leitores de tela. */}
          {[false, true].flatMap((copia) =>
            PATROCINADORES.map((p) => (
              <li
                key={`${copia ? 'copia' : 'original'}-${p.nome}`}
                aria-hidden={copia || undefined}
                data-copia={copia || undefined}
                className="shrink-0 pr-5 sm:pr-6"
              >
                <div className="flex h-20 w-44 items-center justify-center rounded-2xl bg-[#7f8895] p-3 shadow-sm sm:h-24 sm:w-56 sm:p-4">
                  <img
                    src={p.logo}
                    alt={copia ? '' : p.nome}
                    width={p.width}
                    height={p.height}
                    loading="lazy"
                    decoding="async"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              </li>
            )),
          )}
        </ul>
      </div>
    </Section>
  )
}
