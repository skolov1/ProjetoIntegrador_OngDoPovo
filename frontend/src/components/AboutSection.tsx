import { HeartPulse, Palette, ShieldCheck } from "lucide-react";

const pillars = [
  {
    title: "Esporte & Saúde",
    description: "Movimento, disciplina e cuidado para crescer com mais qualidade de vida.",
    icon: HeartPulse,
  },
  {
    title: "Cidadania Ativa",
    description: "Construímos vínculos e oportunidades para cada pessoa ocupar seu espaço.",
    icon: ShieldCheck,
  },
  {
    title: "Arte & Cultura",
    description: "Expressão e criatividade como caminhos para descobrir novos talentos.",
    icon: Palette,
  },
];

export default function AboutSection() {
  return (
    <section id="quem-somos" className="bg-[#EBF5ED] py-20 text-[#1E293B] sm:py-28">
      <div className="mx-auto grid max-w-7xl gap-14 px-6 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:px-8">
        <div className="grid min-h-[520px] grid-cols-2 grid-rows-2 gap-4 sm:min-h-[580px]">
          <img
            src="https://images.unsplash.com/photo-1504159506876-f8338247a14a?auto=format&fit=crop&w=800&q=85"
            alt="Crianças participando de uma atividade ao ar livre"
            className="h-full w-full rounded-2xl object-cover"
          />
          <img
            src="https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=800&q=85"
            alt="Criança sorrindo durante uma atividade"
            className="row-span-2 h-full w-full rounded-2xl object-cover"
          />
          <img
            src="https://images.unsplash.com/photo-1526976668912-1a811878dd37?auto=format&fit=crop&w=800&q=85"
            alt="Jovens reunidos em uma oficina"
            className="h-full w-full rounded-2xl object-cover"
          />
        </div>

        <div>
          <span className="text-sm font-extrabold uppercase tracking-[0.18em] text-[#F59E0B]">
            Quem somos
          </span>
          <h2 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-[#0F523A] sm:text-5xl">
            Apoio Real, de Povo para Povo
          </h2>
          <p className="mt-6 text-lg leading-8 text-[#64748B]">
            A ONG do Povo nasceu em Caieiras para aproximar pessoas e oportunidades. Atuamos
            lado a lado com a comunidade, oferecendo atividades gratuitas que fortalecem o
            desenvolvimento integral e tornam o futuro mais possível.
          </p>

          <div className="mt-9 space-y-4">
            {pillars.map(({ title, description, icon: Icon }) => (
              <article key={title} className="flex gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#0F523A]/5">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#EBF5ED] text-[#0F523A]">
                  <Icon className="size-6" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-extrabold text-[#0F523A]">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-[#64748B]">{description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
