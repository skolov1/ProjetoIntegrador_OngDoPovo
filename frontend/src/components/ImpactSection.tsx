import { Activity, CalendarDays, Glasses, Users } from "lucide-react";

const impactStats = [
  { value: "450+", label: "Crianças atendidas", icon: Users },
  { value: "1.2k+", label: "Exames realizados", icon: Glasses },
  { value: "50+", label: "Voluntários ativos", icon: Activity },
  { value: "15+", label: "Eventos por ano", icon: CalendarDays },
];

export default function ImpactSection() {
  return (
    <section id="impacto" className="bg-[#0F523A] py-20 text-white sm:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-extrabold uppercase tracking-[0.18em] text-[#F59E0B]">
            Nosso impacto
          </span>
          <h2 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
            Cada número representa uma história
          </h2>
          <p className="mt-5 text-lg leading-8 text-[#D9F4DE]">
            Quando a comunidade se une, o cuidado vira oportunidade e a oportunidade transforma
            futuros.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {impactStats.map(({ value, label, icon: Icon }) => (
            <article key={label} className="rounded-2xl bg-[#EBF5ED] p-6 text-[#0F523A]">
              <span className="grid size-11 place-items-center rounded-xl bg-white/80">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <p className="mt-8 text-5xl font-extrabold tracking-tight text-[#F59E0B]">{value}</p>
              <p className="mt-2 font-bold">{label}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
