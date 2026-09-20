import { Routes, Route } from "react-router-dom";

import LandingPage from "./features/landing/LandingPage";
import AuthPage from "./features/auth/pages/AuthPage";
import SellerLogin from "./features/auth/pages/SellerLogin";
import SellerRegister from "./features/auth/pages/SellerRegister";
import Home from "./features/Home/pages/Home";
import AdminLogin from "./features/admin/pages/AdminLogin";
import AdminDashboard from "./features/admin/pages/AdminDashboard";
import SellerDashboard from "./features/seller/pages/SellerDashboard";
import ProductDetails from "./features/product/pages/ProductDetails";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/signup" element={<AuthPage />} />
      <Route path="/home" element={<Home />} />
       <Route path="/product/:id" element={<ProductDetails />} />

      <Route path="/seller" element={<SellerLogin />} />
      <Route path="/seller/register" element={<SellerRegister />} />
      <Route path="/seller/dashboard" element={<SellerDashboard />} />

      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
     
    </Routes>
  );
}

export default App;