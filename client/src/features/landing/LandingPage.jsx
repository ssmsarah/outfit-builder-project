import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import TrustBadges from "./components/TrustBadges";
import ExclusiveOffers from "./components/ExclusiveOffers";
import VisitStores from "./components/VisitStores";
import CategorySection from "./components/CategorySection";
import NewArrivals from "./components/NewArrivals";
import Footer from "./components/Footer";
import "./LandingPage.css";
import ProductSection from "./components/ProductSection";

const LandingPage = () => {
  return (
    <div className="landing-page">

      <Navbar />

      <main className="landing-content">
        <Hero />
        <TrustBadges />
        <ExclusiveOffers />
        <VisitStores />
        <CategorySection />
        <NewArrivals />
        <ProductSection />
      </main>

      <Footer />

    </div>
  );
};

export default LandingPage;