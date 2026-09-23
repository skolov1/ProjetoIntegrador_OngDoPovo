import AboutSection from "./components/AboutSection";
import CatalogSection from "./components/CatalogSection";
import ContactSection from "./components/ContactSection";
import DonationsSection from "./components/DonationsSection";
import Footer from "./components/Footer";
import HeroSection from "./components/HeroSection";
import ImpactSection from "./components/ImpactSection";
import ScheduleSection from "./components/ScheduleSection";

export function App() {
  return (
    <main className="min-h-screen bg-white">
      <HeroSection />
      <AboutSection />
      <CatalogSection />
      <ImpactSection />
      <ScheduleSection />
      <DonationsSection />
      <ContactSection />
      <Footer />
    </main>
  );
}

export default App;
