import { Link, NavLink } from "react-router-dom";
import logo from "../../../assets/shopea.png";
import "./Navbar.css";

const Navbar = () => {
  return (
    <>
      {/* Top Bar */}
      <div className="top-bar">
        <Link to="/seller" className="top-link">
          Sell on Shoppea
        </Link>

        <Link to="/seller/register" className="top-link">
          Become a Seller
        </Link>
      </div>

      {/* Sticky Header */}
      <div className="sticky-header">

        <header className="navbar">
          <div className="logo-section">
            <img src={logo} alt="Shoppea" className="logo" />

            <div>
              <h1>SHOPEA</h1>
              <p>Everything You Love. All in One Place.</p>
            </div>
          </div>

          <div className="search-box">
            <input
              type="text"
              placeholder="Search Products..."
            />
          </div>

          <Link to="/login" className="signup-btn">
  Sign Up
</Link>
        </header>

        <nav className="menu-bar">
          <NavLink to="/" end>
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