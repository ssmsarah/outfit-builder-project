import { useNavigate } from "react-router-dom";
import { Star, ArrowRight } from "lucide-react";
import heroImage from "../../../assets/dress.jpg";
import "./Hero.css";

const Hero = () => {
  const navigate = useNavigate();

  return (
    <section className="hero">

      <div className="hero-text">

        <span className="hero-tag">NEW SEASON ARRIVALS</span>

        <h1>
          Own Your <span>Signature Style.</span>
        </h1>

        <p>
          Discover unique collections from your favorite stores and
          explore new arrivals, all in one place.
        </p>

        <div className="hero-actions">
          <button
            className="hero-btn"
            onClick={() => navigate("/new-arrivals")}
          >
            Explore Collections
            <ArrowRight size={17} />
          </button>

          <button
            className="hero-btn-outline"
            onClick={() => navigate("/stores")}
          >
            Visit Stores
          </button>
        </div>

        <div className="hero-stats">
          <div className="hero-avatars">
            <span>S</span>
            <span>A</span>
            <span>R</span>
            <span>+</span>
          </div>

          <div className="hero-stats-text">
            <div className="hero-rating">
              <Star size={13} fill="#f5b942" color="#f5b942" />
              <Star size={13} fill="#f5b942" color="#f5b942" />
              <Star size={13} fill="#f5b942" color="#f5b942" />
              <Star size={13} fill="#f5b942" color="#f5b942" />
              <Star size={13} fill="#f5b942" color="#f5b942" />
              <strong>4.8</strong>
            </div>
            <span>Loved by shoppers across Shoppea</span>
          </div>
        </div>

      </div>

      <div className="hero-visual">

        <div className="hero-circle"></div>

        <img src={heroImage} alt="Featured style" className="hero-image" />

        <div className="hero-float-card">
          <div className="hero-float-icon">✦</div>
          <div>
            <strong>Handpicked Styles</strong>
            <span>Curated from real stores</span>
          </div>
        </div>

      </div>

    </section>
  );
};

export default Hero;
