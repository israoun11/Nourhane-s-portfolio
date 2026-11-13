import Hero from '../sections/Hero.jsx';
import LogoMarquee from '../sections/LogoMarquee.jsx';
import Journey from '../sections/Journey.jsx';
import SelectedWork from '../sections/SelectedWork.jsx';
import Method from '../sections/Method.jsx';
import Expertise from '../sections/Expertise.jsx';
import Tools from '../sections/Tools.jsx';
import CodaStudio from '../sections/CodaStudio.jsx';
import Learning from '../sections/Learning.jsx';
import Personality from '../sections/Personality.jsx';
import Products from '../sections/Products.jsx';
import Contact from '../sections/Contact.jsx';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import { useMeta } from '../hooks/motion.js';
import { useContent } from '../content/ContentProvider.jsx';

export default function Home() {
  const { site } = useContent();
  useMeta(site.seoTitle || `${site.name} — ${site.role}`, site.seoDescription);
  return (
    <>
      <Header />
      <main id="main">
        {/* Same order as the menu: Home · My Story · Expertise · Work · Insights · Contact */}
        <Hero />
        <LogoMarquee />
        <Journey />
        <Expertise />
        <Tools />
        <SelectedWork />
        <Method />
        <CodaStudio />
        <Learning />
        <Personality />
        <Products />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
