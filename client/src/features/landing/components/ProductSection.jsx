import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import api from "../../../api/axios";
import ProductCard from "../../../components/ProductCard";
import "./ExclusiveOffers.css";

const ProductSection = () => {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data } = await api.get("/products");
        setProducts(data);
      } catch (error) {
        console.error("Products error:", error);
      }
    };

    fetchProducts();
  }, []);

  return (
    <section className="exclusive-offers">

      <div className="section-header-row">
        <div className="section-title-text">
          <h2>Latest Products</h2>
          <p>Freshly listed pieces from stores across Shoppea.</p>
        </div>

        <Link to="/search" className="section-view-all">
          View All
          <ArrowRight size={15} />
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="no-products">
          No products available yet.
        </p>
      ) : (
        <div className="product-grid">
          {products.map((product) => (
            <ProductCard product={product} key={product._id} />
          ))}
        </div>
      )}

    </section>
  );
};

export default ProductSection;
