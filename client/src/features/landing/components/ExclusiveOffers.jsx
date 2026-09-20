import { useEffect, useState } from "react";
import api from "../../../api/axios";
import ProductCard from "../../../components/ProductCard";
import "./ExclusiveOffers.css";

const ExclusiveOffers = () => {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const fetchDiscounted = async () => {
      try {
        const { data } = await api.get("/products", {
          params: { discounted: true },
        });
        setProducts(data);
      } catch (error) {
        console.error("Exclusive offers error:", error);
      }
    };

    fetchDiscounted();
  }, []);

  if (products.length === 0) return null;

  return (
    <section className="exclusive-offers">

      <div className="section-title">
        <h2>Exclusive Offers</h2>
      </div>

      <div className="product-grid">
        {products.map((product) => (
          <ProductCard product={product} key={product._id} />
        ))}
      </div>

    </section>
  );
};

export default ExclusiveOffers;
