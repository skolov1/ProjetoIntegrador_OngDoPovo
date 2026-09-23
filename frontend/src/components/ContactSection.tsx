import { Image, Mail, MapPin, MessageCircle, Send } from "lucide-react";

export default function ContactSection() {
  return (
    <section id="contato" className="bg-[#EBF5ED] py-20 text-[#1E293B] sm:py-28">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
        <div>
          <span className="text-sm font-extrabold uppercase tracking-[0.18em] text-[#F59E0B]">
            Fale conosco
          </span>
          <h2 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-[#0F523A] sm:text-5xl">
            Vamos construir essa mudança juntos
          </h2>
          <p className="mt-6 max-w-md text-lg leading-8 text-[#64748B]">
            Quer saber mais sobre os projetos, fazer uma parceria ou participar como voluntário?
            Nossa equipe está pronta para conversar.
          </p>

          <div className="mt-9 space-y-5">
            <div className="flex items-start gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-[#0F523A]">
                <MapPin className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-extrabold text-[#0F523A]">Nossa sede</p>
                <p className="mt-1 text-sm leading-6 text-[#64748B]">Bairro Caieiras, Caieiras - SP</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-[#0F523A]">
                <MessageCircle className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-extrabold text-[#0F523A]">WhatsApp</p>
                <a href="https://wa.me/5511999999999" className="mt-1 block text-sm text-[#64748B] hover:text-[#0F523A]">
                  (11) 99999-9999
                </a>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-[#0F523A]">
                <Mail className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-extrabold text-[#0F523A]">E-mail</p>
                <a href="mailto:contato@ongdopovo.org.br" className="mt-1 block text-sm text-[#64748B] hover:text-[#0F523A]">
                  contato@ongdopovo.org.br
                </a>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-[#0F523A]">
                <Image className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-extrabold text-[#0F523A]">Instagram</p>
                <a href="https://instagram.com/ongdopovo" className="mt-1 block text-sm text-[#64748B] hover:text-[#0F523A]">
                  @ongdopovo
                </a>
              </div>
            </div>
          </div>
        </div>

        <form className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[#0F523A]/10 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-2xl font-extrabold text-[#0F523A]">Mande uma mensagem</h3>
              <p className="mt-2 text-sm text-[#64748B]">Retornaremos assim que possível.</p>
            </div>
            <span className="hidden size-12 place-items-center rounded-2xl bg-[#EBF5ED] text-[#0F523A] sm:grid">
              <Send className="size-5" aria-hidden="true" />
            </span>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-bold text-[#0F523A]">
              Nome
              <input
                type="text"
                name="name"
                required
                placeholder="Seu nome"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal text-[#1E293B] outline-none transition placeholder:text-slate-400 focus:border-[#0F523A] focus:ring-2 focus:ring-[#0F523A]/10"
              />
            </label>
            <label className="text-sm font-bold text-[#0F523A]">
              E-mail ou telefone
              <input
                type="text"
                name="contact"
                required
                placeholder="Como podemos falar com você?"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal text-[#1E293B] outline-none transition placeholder:text-slate-400 focus:border-[#0F523A] focus:ring-2 focus:ring-[#0F523A]/10"
              />
            </label>
            <label className="text-sm font-bold text-[#0F523A] sm:col-span-2">
              Assunto
              <input
                type="text"
                name="subject"
                required
                placeholder="Como podemos ajudar?"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal text-[#1E293B] outline-none transition placeholder:text-slate-400 focus:border-[#0F523A] focus:ring-2 focus:ring-[#0F523A]/10"
              />
            </label>
            <label className="text-sm font-bold text-[#0F523A] sm:col-span-2">
              Mensagem
              <textarea
                name="message"
                rows={4}
                required
                placeholder="Escreva sua mensagem..."
                className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 font-normal text-[#1E293B] outline-none transition placeholder:text-slate-400 focus:border-[#0F523A] focus:ring-2 focus:ring-[#0F523A]/10"
              />
            </label>
          </div>

          <button
            type="submit"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#F59E0B] px-5 py-3.5 font-bold text-[#0F523A] transition hover:bg-amber-300"
          >
            Enviar mensagem
            <Send className="size-4" aria-hidden="true" />
          </button>
        </form>
      </div>
    </section>
  );
}
