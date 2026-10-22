/**
 * Landing page da ONG do Povo.
 *
 * Ordem das seções segue a referência visual em `refs/`. Cada seção é uma peça
 * independente, com o conteúdo vindo de `features/home/data.ts` — na Fase 3 os
 * mesmos arrays passam a vir de `useQuery` sobre a API do Django.
 */
import { Footer } from '@/components/layout/Footer'
import { AboutSection } from '@/features/home/AboutSection'
import { ContactSection } from '@/features/home/ContactSection'
import { DonationSection } from '@/features/home/DonationSection'
import { HeroSection } from '@/features/home/HeroSection'
import { ImpactSection } from '@/features/home/ImpactSection'
import { PreRegisterSection } from '@/features/home/PreRegisterSection'
import { ProgramsSection } from '@/features/home/ProgramsSection'
import { SpaceSection } from '@/features/home/SpaceSection'
import { ValuesStrip } from '@/features/home/ValuesStrip'
import { VolunteerSection } from '@/features/home/VolunteerSection'

export function App() {
  return (
    <>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-100 focus:rounded-full focus:bg-verde focus:px-5 focus:py-3 focus:text-sm focus:font-bold focus:text-white"
      >
        Pular para o conteúdo
      </a>

      <div id="conteudo">
        <HeroSection />
        <AboutSection />
        <ImpactSection />
        <ProgramsSection />
        <SpaceSection />
        <PreRegisterSection />
        <ValuesStrip />
        <VolunteerSection />
        <DonationSection />
        <ContactSection />

        <Footer />
      </div>
    </>
  )
}

export default App