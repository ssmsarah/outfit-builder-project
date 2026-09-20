import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import api from "../../../api/axios";
import ProductCard from "../../../components/ProductCard";
import "./ExclusiveOffers.css";

const filters = ["All", "Dresses", "Tops", "Bottoms", "Formals", "Shoes", "Accessories"];

const NewArrivals = () => {
  const [products, setProducts] = useState([]);
  const [activeFilter, setActiveFilter] = useState("All");

  useEffect(() => {
    const fetchNewArrivals = async () => {
      try {
        const { data } = await api.get("/products/new-arrivals");
        setProducts(data);
      } catch (error) {
        console.error("New arrivals error:", error);
      }
    };

    fetchNewArrivals();
  }, []);

  if (products.length === 0) return null;

  const visibleProducts =
    activeFilter === "All"
      ? products
      : products.filter(
          (p) => p.category?.toLowerCase() === activeFilter.toLowerCase()
        );

  return (
    <section className="exclusive-offers">

      <div className="section-header-row">
        <div className="section-title-text">
          <h2>New Arrivals</h2>
          <p>The newest pieces, just added to Shoppea.</p>
        </div>

        <Link to="/new-arrivals" className="section-view-all">
          View All
          <ArrowRight size={15} />
        </Link>
      </div>

      <div className="filter-tabs">
        {filters.map((filter) => (
          <button
            key={filter}
            className={`filter-tab ${activeFilter === filter ? "active" : ""}`}
            onClick={() => setActiveFilter(filter)}
          >
            {filter}
          </button>
        ))}
      </div>

      {visibleProducts.length === 0 ? (
        <p className="no-products">No products in this category yet.</p>
      ) : (
        <div className="product-grid">
          {visibleProducts.map((product) => (
            <ProductCard product={product} key={product._id} />
          ))}
        </div>
      )}

    </section>
  );
};

export default NewArrivals;
