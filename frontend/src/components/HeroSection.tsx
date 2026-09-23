import { ArrowRight, HeartHandshake, MapPin, Play } from "lucide-react";
import Header from "./header";

const quickStats = [
  { value: "450+", label: "Crianças" },
  { value: "1.2k+", label: "Exames" },
  { value: "50+", label: "Voluntários" },
  { value: "15+", label: "Eventos/Ano" },
];

export default function HeroSection() {
  return (
    <section id="inicio" className="overflow-hidden bg-[#0F523A] text-white">
      <Header />

      <div className="mx-auto grid max-w-7xl gap-14 px-6 pb-16 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8 lg:pb-20 lg:pt-20">
        <div>
          <div className="mb-7 flex flex-wrap gap-3 text-xs font-bold uppercase tracking-[0.18em]">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[#D9F4DE]">
              <MapPin className="size-3.5" aria-hidden="true" />
              Praia Grande, Caieiras - SP
            </span>
            <span className="rounded-full bg-[#EBF5ED] px-4 py-2 text-[#0F523A]">ONG gratuita</span>
          </div>

          <h1 className="max-w-3xl text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            Mudando vidas através do esporte e da cultura
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-[#D9F4DE]">
            Criamos oportunidades para crianças, jovens e famílias de Caieiras por meio de
            atividades que promovem saúde, educação, pertencimento e transformação social.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a
              href="#atividades"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#F59E0B] px-6 py-3.5 font-bold text-[#0F523A] transition hover:bg-amber-300"
            >
              Conhecer projetos
              <ArrowRight className="size-4" aria-hidden="true" />
            </a>
            <a
              href="#voluntariado"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/50 px-6 py-3.5 font-bold text-white transition hover:border-white hover:bg-white/10"
            >
              <HeartHandshake className="size-4" aria-hidden="true" />
              Quero ser voluntário
            </a>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-lg lg:ml-auto">
          <div className="absolute -inset-4 rounded-[2rem] bg-[#F59E0B]/20 blur-2xl" aria-hidden="true" />
          <div className="relative overflow-hidden rounded-[2rem] border border-white/20 bg-[#175E44] p-3 shadow-2xl">
            <img
              src="https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1000&q=85"
              alt="Crianças jogando basquete em uma quadra"
              className="h-[390px] w-full rounded-2xl object-cover sm:h-[470px]"
            />
            <div className="absolute bottom-7 left-7 right-7 flex items-center justify-between rounded-2xl bg-white p-4 text-[#0F523A] shadow-xl">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Nosso jeito</p>
                <p className="mt-1 font-extrabold">Acolher, incluir e transformar</p>
              </div>
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#EBF5ED]">
                <Play className="ml-0.5 size-5 fill-[#F59E0B] text-[#F59E0B]" aria-hidden="true" />
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/15">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-white/15 px-6 py-7 sm:grid-cols-4 lg:px-8">
          {quickStats.map((stat) => (
            <div key={stat.label} className="px-4 text-center first:pl-0 last:pr-0 sm:px-6">
              <p className="text-2xl font-extrabold text-[#F59E0B] sm:text-3xl">{stat.value}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-[#D9F4DE] sm:text-sm">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
