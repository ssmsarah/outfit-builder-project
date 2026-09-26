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
import Layout from "./components/Layout";
import Stores from "./features/stores/pages/Stores";
import StoreDetail from "./features/stores/pages/StoreDetail";
import CategoryList from "./features/category/pages/CategoryList";
import CategoryProducts from "./features/category/pages/CategoryProducts";
import NewArrivalsPage from "./features/landing/pages/NewArrivalsPage";
import SearchResults from "./features/search/pages/SearchResults";
import Cart from "./features/cart/pages/Cart";
import Wishlist from "./features/wishlist/pages/Wishlist";
import Checkout from "./features/checkout/pages/Checkout";
import OrderConfirmation from "./features/orders/pages/OrderConfirmation";
import MyOrders from "./features/orders/pages/MyOrders";
import OutfitBuilder from "./features/outfitBuilder/pages/OutfitBuilder";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/signup" element={<AuthPage />} />
      <Route path="/home" element={<Home />} />

      <Route element={<Layout />}>
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/stores" element={<Stores />} />
        <Route path="/stores/:sellerId" element={<StoreDetail />} />
        <Route path="/categories" element={<CategoryList />} />
        <Route path="/category/:category" element={<CategoryProducts />} />
        <Route path="/new-arrivals" element={<NewArrivalsPage />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route
          path="/order-confirmation/:orderId"
          element={<OrderConfirmation />}
        />
        <Route path="/my-orders" element={<MyOrders />} />
      </Route>

      <Route path="/seller" element={<SellerLogin />} />
      <Route path="/seller/register" element={<SellerRegister />} />
      <Route path="/seller/dashboard" element={<SellerDashboard />} />

      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route element={<Layout />}>
  <Route path="/product/:id" element={<ProductDetails />} />
  <Route path="/stores" element={<Stores />} />
  <Route path="/stores/:sellerId" element={<StoreDetail />} />
  <Route path="/categories" element={<CategoryList />} />
  <Route path="/category/:category" element={<CategoryProducts />} />
  <Route path="/new-arrivals" element={<NewArrivalsPage />} />
  <Route path="/search" element={<SearchResults />} />
  <Route path="/cart" element={<Cart />} />
  <Route path="/wishlist" element={<Wishlist />} />
  <Route path="/checkout" element={<Checkout />} />
  <Route
    path="/order-confirmation/:orderId"
    element={<OrderConfirmation />}
  />
  <Route path="/my-orders" element={<MyOrders />} />

  {/* Outfit Builder */}
  <Route path="/outfit-builder" element={<OutfitBuilder />} />
</Route>

    </Routes>
  );
}

export default App;