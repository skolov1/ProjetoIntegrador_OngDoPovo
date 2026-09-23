import { ArrowUpRight, BookOpen, Eye, Footprints, Goal, HandHeart, Palette } from "lucide-react";

const activities = [
  {
    title: "Ballet para Crianças",
    category: "Dança & Cultura",
    image:
      "https://images.unsplash.com/photo-1504609813442-a8924e83f76e?auto=format&fit=crop&w=900&q=85",
    icon: Palette,
  },
  {
    title: "Escola de Basquete",
    category: "Esporte Coletivo",
    image:
      "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=900&q=85",
    icon: Goal,
  },
  {
    title: "Treino de Futsal",
    category: "Esporte Coletivo",
    image:
      "https://images.unsplash.com/photo-1553778263-73a83bab9b0c?auto=format&fit=crop&w=900&q=85",
    icon: Footprints,
  },
  {
    title: "Exames de Vista & Óculos",
    category: "Ação Social & Saúde",
    image:
      "https://images.unsplash.com/photo-1574258495973-f010dfbb5371?auto=format&fit=crop&w=900&q=85",
    icon: Eye,
  },
  {
    title: "Cursos Livres",
    category: "Capacitação",
    image:
      "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=900&q=85",
    icon: BookOpen,
  },
  {
    title: "Eventos Comunitários",
    category: "Integração",
    image:
      "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=900&q=85",
    icon: HandHeart,
  },
];

export default function CatalogSection() {
  return (
    <section id="atividades" className="bg-white py-20 text-[#1E293B] sm:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <span className="text-sm font-extrabold uppercase tracking-[0.18em] text-[#F59E0B]">
              Nossos projetos
            </span>
            <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-[#0F523A] sm:text-5xl">
              Atividades para descobrir novos caminhos
            </h2>
          </div>
          <p className="max-w-sm text-base leading-7 text-[#64748B]">
            Conheça as ações gratuitas que movimentam a nossa comunidade durante todo o ano.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {activities.map(({ title, category, image, icon: Icon }) => (
            <article
              key={title}
              className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="relative h-56 overflow-hidden">
                <img
                  src={image}
                  alt={title}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <span className="absolute left-4 top-4 rounded-full bg-[#EBF5ED] px-3 py-1.5 text-xs font-bold text-[#0F523A]">
                  {category}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 p-5">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#EBF5ED] text-[#0F523A]">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="font-extrabold text-[#0F523A]">{title}</h3>
                </div>
                <span className="grid size-9 shrink-0 place-items-center rounded-full border border-slate-200 text-[#0F523A] transition group-hover:border-[#F59E0B] group-hover:bg-[#F59E0B]">
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
