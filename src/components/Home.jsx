import Header from './sections/Header.jsx';
import Hero from './sections/Hero.jsx';
import Stats from './sections/Stats.jsx';
import Demonstration from './sections/Demonstration.jsx';
import HowItWorks from './sections/HowItWorks.jsx';
import Coverage from './sections/Coverage.jsx';
import Standards from './sections/Standards.jsx';
import Lifecycle from './sections/Lifecycle.jsx';
import Horizon from './sections/Horizon.jsx';
import AccountAbstraction from './sections/AccountAbstraction.jsx';
import Developers from './sections/Developers.jsx';
import Trust from './sections/Trust.jsx';
import Ask from './sections/Ask.jsx';
import Footer from './sections/Footer.jsx';

/**
 * Homepage. Section order follows Marketing Plan §20 website architecture.
 *
 * Renders to static HTML at build time — no client:* directive is applied in
 * index.astro, so this ships zero JavaScript and cannot render blank.
 */
export default function Home() {
  return (
    <>
      <Header />

      <main>
        <Hero />
        <Stats />
        <Demonstration />
        <HowItWorks />
        <Lifecycle />
        <Coverage />
        <Standards />
        <AccountAbstraction />
        <Developers />
        <Horizon />
        <Trust />
        <Ask />
      </main>

      <Footer />
    </>
  );
}
