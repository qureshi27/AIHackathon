import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { HowItWorks } from './components/HowItWorks';
import { LiveDemo } from './components/LiveDemo';
import { AlphabetGrid } from './components/AlphabetGrid';
import { ModelInfo } from './components/ModelInfo';
import { Footer } from './components/Footer';

export default function App() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <div className="glow-divider" />
        <HowItWorks />
        <LiveDemo />
        <AlphabetGrid />
        <ModelInfo />
      </main>
      <Footer />
    </>
  );
}
