import { LeadCaptureProvider } from "../components/LeadCaptureContext";
import { Header } from "../components/Header";
import { Hero } from "../components/Hero";
import { WhySection } from "../components/WhySection";
import { PlatformSection } from "../components/PlatformSection";
import { CoachesSection } from "../components/CoachesSection";
import { TrialStepsSection } from "../components/TrialStepsSection";
import { SignupSection } from "../components/SignupSection";
import { FaqSection } from "../components/FaqSection";
import { Footer } from "../components/Footer";

export default function LandingPage() {
  return (
    <LeadCaptureProvider>
      <div style={{ position: "relative", minHeight: "100vh" }}>
        <Header />
        <main id="top" className="container">
          <Hero />
          <WhySection />
          <PlatformSection />
          <CoachesSection />
          <TrialStepsSection />
          <SignupSection />
          <FaqSection />
        </main>
        <Footer />
      </div>
    </LeadCaptureProvider>
  );
}
