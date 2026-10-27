import Hero from '../sections/Hero.jsx';
import Band from '../sections/Band.jsx';
import Mind from '../sections/Mind.jsx';
import Journey from '../sections/Journey.jsx';
import SelectedWork from '../sections/SelectedWork.jsx';
import Method from '../sections/Method.jsx';
import Expertise from '../sections/Expertise.jsx';
import CodaStudio from '../sections/CodaStudio.jsx';
import Learning from '../sections/Learning.jsx';
import Personality from '../sections/Personality.jsx';
import Products from '../sections/Products.jsx';
import Testimonials from '../sections/Testimonials.jsx';
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
        <Hero />
        <Band />
        <Mind />
        <Journey />
        <SelectedWork />
        <Method />
        <Expertise />
        <CodaStudio />
        <Learning />
        <Personality />
        <Products />
        <Testimonials />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
