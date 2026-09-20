import { Outlet } from "react-router-dom";
import Navbar from "../features/landing/components/Navbar";
import Footer from "../features/landing/components/Footer";

const Layout = () => {
  return (
    <div className="landing-page">
      <Navbar />

      <main className="landing-content">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
};

export default Layout;
