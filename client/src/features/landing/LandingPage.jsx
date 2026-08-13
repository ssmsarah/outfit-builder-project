import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import ExclusiveOffers from "./components/ExclusiveOffers";
import VisitStores from "./components/VisitStores";
import CategorySection from "./components/CategorySection";

const LandingPage = () => {
  return (
    <>
      <Navbar />
      <Hero/>
      <ExclusiveOffers/>
      <VisitStores/>
      <CategorySection/>

      <main
        style={{
          minHeight: "100vh",
          background: "#ffffff",
        }}
      >
        {/* Hero section goes here */}
      </main>
    </>
  );
};

export default LandingPage;

