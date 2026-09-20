import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Heart,
  ShoppingBag,
  LogOut,
  Search,
  Store,
  Package,
  PackageSearch,
} from "lucide-react";

import logo from "../../../assets/shopea.png";
import { useCart } from "../../../context/CartContext";
import { useWishlist } from "../../../context/WishlistContext";
import "./Navbar.css";

const Navbar = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const token = localStorage.getItem("token");

  const user = JSON.parse(
    localStorage.getItem("user") || "null"
  );

  const isLoggedIn = !!token;

  const firstName =
    user?.name?.split(" ")[0] || "Sarah";

  const cart = useCart();
  const wishlist = useWishlist();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    cart?.refresh();
    wishlist?.refresh();

    navigate("/");
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();

    if (searchTerm.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  return (
    <>
      {/* ================= TOP BAR ================= */}
      <div className="top-bar">

        <Link
          to="/seller"
          className="top-link top-link-outline"
        >
          <Store size={13} strokeWidth={2} />
          Sell on Shoppea
        </Link>

        <Link
          to="/seller/register"
          className="top-link top-link-solid"
        >
          <PackageSearch size={13} strokeWidth={2} />
          Become a Seller
        </Link>

      </div>

      {/* ================= HEADER ================= */}
      <div className="sticky-header">

        <header className="navbar">

          {/* LOGO */}
          <div className="logo-section">

            <img
              src={logo}
              alt="Shoppea"
              className="logo"
            />

            <div>
              <h1>SHOPEA</h1>

              <p>
                Everything You Love. All in One Place.
              </p>
            </div>

          </div>

          {/* SEARCH */}
          <form className="search-box" onSubmit={handleSearchSubmit}>
            <input
              type="text"
              placeholder="Search Products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button type="submit" className="search-submit-btn" aria-label="Search">
              <Search size={16} strokeWidth={2} />
            </button>
          </form>

          {/* ================= CUSTOMER ACTIONS ================= */}

          {!isLoggedIn ? (

            <Link
              to="/login"
              className="signup-btn"
            >
              Sign Up
            </Link>

          ) : (

            <div className="customer-actions">

              {/* Hello Sarah */}
              <span className="hello-user">
                Hello, {firstName}
              </span>

              {/* My Orders */}
              <button
                type="button"
                className="customer-icon-btn"
                onClick={() => navigate("/my-orders")}
                title="My Orders"
                aria-label="My Orders"
              >
                <Package size={19} strokeWidth={1.9} />
              </button>

              {/* Wishlist */}
              <button
                type="button"
                className="customer-icon-btn"
                onClick={() => navigate("/wishlist")}
                title="Wishlist"
                aria-label="Wishlist"
              >
                <Heart size={19} strokeWidth={1.9} />
                {wishlist?.items?.length > 0 && (
                  <span className="icon-badge">
                    {wishlist.items.length}
                  </span>
                )}
              </button>

              {/* Cart */}
              <button
                type="button"
                className="customer-icon-btn"
                onClick={() => navigate("/cart")}
                title="Cart"
                aria-label="Shopping Cart"
              >
                <ShoppingBag size={19} strokeWidth={1.9} />
                {cart?.count > 0 && (
                  <span className="icon-badge">{cart.count}</span>
                )}
              </button>

              {/* Logout */}
              <button
                type="button"
                className="customer-logout-btn"
                onClick={handleLogout}
              >
                <LogOut size={14} strokeWidth={1.8} />
                <span>Logout</span>
              </button>

            </div>

          )}

        </header>

        {/* ================= NAVIGATION ================= */}

        <nav className="menu-bar">

          <NavLink
            to={isLoggedIn ? "/home" : "/"}
            end
          >
            Home
          </NavLink>

          <NavLink to="/stores">
            Stores
          </NavLink>

          <NavLink to="/categories">
            Category
          </NavLink>

          <NavLink to="/new-arrivals">
            New Arrivals
          </NavLink>

          <NavLink to="/outfit-builder">
            Outfit Builder
          </NavLink>

        </nav>

      </div>
    </>
  );
};

export default Navbar;