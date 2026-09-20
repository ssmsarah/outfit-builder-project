import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Heart,
  ShoppingBag,
  LogOut,
} from "lucide-react";

import logo from "../../../assets/shopea.png";
import "./Navbar.css";

const Navbar = () => {
  const navigate = useNavigate();

  const token = localStorage.getItem("token");

  const user = JSON.parse(
    localStorage.getItem("user") || "null"
  );

  const isLoggedIn = !!token;

  const firstName =
    user?.name?.split(" ")[0] || "Sarah";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/");
  };

  return (
    <>
      {/* ================= TOP BAR ================= */}
      <div className="top-bar">

        <Link
          to="/seller"
          className="top-link"
        >
          Sell on Shoppea
        </Link>

        <Link
          to="/seller/register"
          className="top-link"
        >
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
          <div className="search-box">
            <input
              type="text"
              placeholder="Search Products..."
            />
          </div>

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

              {/* Wishlist */}
              <button
                type="button"
                className="customer-icon-btn"
                onClick={() => navigate("/wishlist")}
                title="Wishlist"
                aria-label="Wishlist"
              >
                <Heart size={17} strokeWidth={1.8} />
              </button>

              {/* Cart */}
              <button
                type="button"
                className="customer-icon-btn"
                onClick={() => navigate("/cart")}
                title="Cart"
                aria-label="Shopping Cart"
              >
                <ShoppingBag size={17} strokeWidth={1.8} />
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