export default function Header() {
  return (
    <header className="relative z-10 border-b border-white/10">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8">
        <a href="#inicio" className="flex items-center gap-3" aria-label="ONG do Povo - início">
          <span className="grid size-10 place-items-center rounded-2xl bg-[#F59E0B] text-lg font-extrabold text-[#0F523A]">
            OP
          </span>
          <span className="text-lg font-extrabold tracking-tight text-white">ONG do Povo</span>
        </a>

        <nav className="hidden items-center gap-8 text-sm font-semibold text-white/80 md:flex" aria-label="Navegação principal">
          <a className="transition hover:text-white" href="#quem-somos">Quem somos</a>
          <a className="transition hover:text-white" href="#atividades">Atividades</a>
          <a className="transition hover:text-white" href="#impacto">Impacto</a>
          <a className="transition hover:text-white" href="#contato">Contato</a>
        </nav>

        <a
          href="#apoie"
          className="rounded-2xl border border-white/40 px-4 py-2.5 text-sm font-bold text-white transition hover:border-white hover:bg-white/10"
        >
          Apoie a ONG
        </a>
      </div>
    </header>
  );
}
