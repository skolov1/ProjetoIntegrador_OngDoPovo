import { Copy, Heart, PackageCheck, QrCode, Truck } from "lucide-react";

export default function DonationsSection() {
  return (
    <section id="apoie" className="bg-white py-20 text-[#1E293B] sm:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-extrabold uppercase tracking-[0.18em] text-[#F59E0B]">
            Como apoiar financeiramente
          </span>
          <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-[#0F523A] sm:text-5xl">
            Seu apoio vira oportunidade
          </h2>
          <p className="mt-5 text-lg leading-8 text-[#64748B]">
            Escolha a melhor forma de contribuir para manter nossas atividades gratuitas para a
            comunidade.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl bg-[#0F523A] p-7 text-white sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <span className="grid size-12 place-items-center rounded-2xl bg-[#F59E0B] text-[#0F523A]">
                <QrCode className="size-6" aria-hidden="true" />
              </span>
              <Heart className="size-6 text-[#F59E0B]" aria-hidden="true" />
            </div>
            <h3 className="mt-8 text-2xl font-extrabold">Doe via PIX</h3>
            <p className="mt-3 max-w-md leading-7 text-[#D9F4DE]">
              Uma contribuição rápida e segura para apoiar esporte, cultura e saúde em Caieiras.
            </p>
            <div className="mt-7 rounded-2xl bg-white p-4 text-[#0F523A]">
              <p className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Chave CNPJ</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <code className="text-sm font-extrabold sm:text-base">12.345.678/0001-99</code>
                <button
                  type="button"
                  aria-label="Copiar chave PIX"
                  className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#EBF5ED] transition hover:bg-[#F59E0B]"
                  onClick={() => navigator.clipboard?.writeText("12.345.678/0001-99")}
                >
                  <Copy className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </article>

          <article className="rounded-2xl bg-[#EBF5ED] p-7 text-[#0F523A] sm:p-8">
            <span className="grid size-12 place-items-center rounded-2xl bg-white">
              <PackageCheck className="size-6" aria-hidden="true" />
            </span>
            <h3 className="mt-8 text-2xl font-extrabold">Equipamentos e alimentos</h3>
            <p className="mt-3 max-w-md leading-7 text-[#64748B]">
              Doe materiais esportivos, itens para nossas oficinas ou alimentos para as ações
              comunitárias.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#contato"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#F59E0B] px-5 py-3 font-bold text-[#0F523A] transition hover:bg-amber-300"
              >
                <Truck className="size-4" aria-hidden="true" />
                Agendar entrega
              </a>
              <a
                href="#contato"
                className="inline-flex items-center justify-center rounded-2xl border border-[#0F523A]/20 px-5 py-3 font-bold transition hover:bg-white"
              >
                Falar com a equipe
              </a>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
