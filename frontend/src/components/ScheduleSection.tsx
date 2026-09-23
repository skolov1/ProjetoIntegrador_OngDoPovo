import { CalendarDays, Clock3, MapPin } from "lucide-react";

const schedule = [
  {
    day: "Segunda e quarta",
    activity: "Escola de Basquete",
    time: "18h às 20h",
    status: "Ativo",
    statusClass: "bg-[#DCFCE7] text-[#166534]",
  },
  {
    day: "Terça e quinta",
    activity: "Treino de Futsal",
    time: "18h às 20h",
    status: "Ativo",
    statusClass: "bg-[#DCFCE7] text-[#166534]",
  },
  {
    day: "Próximo sábado",
    activity: "Ação Social & Saúde",
    time: "9h às 13h",
    status: "Aberto",
    statusClass: "bg-[#DBEAFE] text-[#1D4ED8]",
  },
];

export default function ScheduleSection() {
  return (
    <section id="agenda" className="bg-[#EBF5ED] py-20 text-[#1E293B] sm:py-28">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-[0.7fr_1.3fr] lg:items-center lg:px-8">
        <div>
          <span className="text-sm font-extrabold uppercase tracking-[0.18em] text-[#F59E0B]">
            Agenda da sede
          </span>
          <h2 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-[#0F523A] sm:text-5xl">
            Tem sempre um lugar para você
          </h2>
          <p className="mt-6 max-w-md text-lg leading-8 text-[#64748B]">
            Confira os próximos horários e venha participar das atividades da ONG do Povo.
          </p>
          <div className="mt-8 flex items-center gap-3 text-sm font-semibold text-[#0F523A]">
            <span className="grid size-10 place-items-center rounded-xl bg-white">
              <MapPin className="size-5" aria-hidden="true" />
            </span>
            Sede Caieiras, SP
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#0F523A]/10">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
            <span className="grid size-10 place-items-center rounded-xl bg-[#EBF5ED] text-[#0F523A]">
              <CalendarDays className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-extrabold text-[#0F523A]">Horários desta semana</h3>
              <p className="text-sm text-[#64748B]">Programação regular da sede</p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {schedule.map(({ day, activity, time, status, statusClass }) => (
              <div key={day} className="grid gap-3 px-5 py-5 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:px-6">
                <div>
                  <p className="font-extrabold capitalize text-[#0F523A]">{day}</p>
                  <p className="mt-1 text-sm text-[#64748B]">{activity}</p>
                </div>
                <div className="flex items-center gap-2 text-sm font-semibold text-[#64748B]">
                  <Clock3 className="size-4" aria-hidden="true" />
                  {time}
                </div>
                <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${statusClass}`}>
                  {status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
