import { ArrowUp, Image, Mail, MessageCircle } from "lucide-react";

const footerLinks = [
  { label: "Quem somos", href: "#quem-somos" },
  { label: "Atividades", href: "#atividades" },
  { label: "Impacto", href: "#impacto" },
  { label: "Contato", href: "#contato" },
];

export default function Footer() {
  return (
    <footer className="bg-[#0F523A] text-white">
      <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1fr_auto_auto] md:items-start">
          <div className="max-w-sm">
            <a href="#inicio" className="flex items-center gap-3" aria-label="Voltar ao início">
              <img
                src="/logo-ong-do-povo.png"
                alt="Logo da ONG do Povo"
                className="size-10 object-contain"
              />
              <span className="text-lg font-extrabold">ONG do Povo</span>
            </a>
            <p className="mt-5 leading-7 text-[#D9F4DE]">
              Esporte, cultura e cuidado para transformar vidas em Caieiras.
            </p>
          </div>

          <nav aria-label="Links rápidos">
            <h2 className="font-extrabold">Links rápidos</h2>
            <div className="mt-4 flex flex-col gap-3 text-sm text-[#D9F4DE]">
              {footerLinks.map(({ label, href }) => (
                <a key={label} href={href} className="transition hover:text-white">
                  {label}
                </a>
              ))}
            </div>
          </nav>

          <div>
            <h2 className="font-extrabold">Fale com a gente</h2>
            <div className="mt-4 flex gap-3">
              <a
                href="https://wa.me/5513988066437"
                aria-label="WhatsApp"
                className="grid size-10 place-items-center rounded-xl bg-white/10 transition hover:bg-[#F59E0B] hover:text-[#0F523A]"
              >
                <MessageCircle className="size-5" aria-hidden="true" />
              </a>
              <a
                href="mailto:contato@ongdopovo.org.br"
                aria-label="E-mail"
                className="grid size-10 place-items-center rounded-xl bg-white/10 transition hover:bg-[#F59E0B] hover:text-[#0F523A]"
              >
                <Mail className="size-5" aria-hidden="true" />
              </a>
              <a
                href="https://instagram.com/ongdopovo_"
                aria-label="Instagram"
                className="grid size-10 place-items-center rounded-xl bg-white/10 transition hover:bg-[#F59E0B] hover:text-[#0F523A]"
              >
                <Image className="size-5" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/15 pt-6 text-sm text-[#D9F4DE] sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 ONG do Povo. Todos os direitos reservados.</p>
          <a href="#inicio" className="inline-flex items-center gap-2 font-bold text-white hover:text-[#F59E0B]">
            Voltar ao topo
            <ArrowUp className="size-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </footer>
  );
}
