import { Aurora } from './(marketing)/_components/aurora';
import { TopBar, MemberHint } from './(marketing)/_components/top-bar';
import { Hero } from './(marketing)/_components/hero';
import { MarqueeTicker } from './(marketing)/_components/marquee-ticker';
import { TrustStrip } from './(marketing)/_components/trust-strip';
import { LoopDiagram } from './(marketing)/_components/loop-diagram';
import { BenefitCards } from './(marketing)/_components/benefit-cards';
import { RoiCalculator } from './(marketing)/_components/roi-calculator';
import { MemberExperience } from './(marketing)/_components/member-experience';
import { ComparisonTable } from './(marketing)/_components/comparison-table';
import { Faq } from './(marketing)/_components/faq';
import { FinalCta } from './(marketing)/_components/final-cta';
import { Footer } from './(marketing)/_components/footer';

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <Aurora />
      <MemberHint />
      <TopBar />
      <Hero />
      <MarqueeTicker />
      <TrustStrip />
      <LoopDiagram />
      <BenefitCards />
      <RoiCalculator />
      <MemberExperience />
      <ComparisonTable />
      <Faq />
      <FinalCta />
      <Footer />
    </main>
  );
}
