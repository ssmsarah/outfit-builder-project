import { Link } from "react-router-dom";
import logo from "../../../assets/shopea.png";
import "./Footer.css";

const Footer = () => {
  return (
    <footer className="footer">

      <div className="footer-main">

        {/* Brand */}
        <div className="footer-brand">
          <img src={logo} alt="Shoppea" />

          <p>
            Discover your style, explore your favorite stores,
            and make every look your own.
          </p>

          <div className="footer-socials">
            <a href="#" aria-label="Instagram">Instagram</a>
            <a href="#" aria-label="Facebook">Facebook</a>
            <a href="#" aria-label="TikTok">TikTok</a>
          </div>
        </div>

        {/* Shop */}
        <div className="footer-column">
          <h3>Shop</h3>

          <Link to="/">Home</Link>
          <Link to="/stores">Stores</Link>
          <Link to="/category">Categories</Link>
          <Link to="/new-arrivals">New Arrivals</Link>
          <Link to="/outfit-builder">Outfit Builder</Link>
        </div>

        {/* Help */}
        <div className="footer-column">
          <h3>Help</h3>

          <Link to="/contact">Contact Us</Link>
          <Link to="/faq">FAQs</Link>
          <Link to="/shipping">Shipping & Delivery</Link>
          <Link to="/returns">Returns & Refunds</Link>
        </div>

        {/* Seller */}
        <div className="footer-column">
          <h3>For Sellers</h3>

          <Link to="/seller">Seller Center</Link>
          <Link to="/seller/register">Become a Seller</Link>
          <Link to="/seller/login">Seller Login</Link>
        </div>

      </div>

      {/* Bottom */}
      <div className="footer-bottom">

        <p>© {new Date().getFullYear()} Shoppea. All rights reserved.</p>

        <div>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms & Conditions</Link>
        </div>

      </div>

    </footer>
  );
};

export default Footer;