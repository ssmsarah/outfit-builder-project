import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../../api/axios";
import ProductCard from "../../../components/ProductCard";
import "../../stores/pages/Stores.css";

const CategoryProducts = () => {
  const { category } = useParams();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(
          `/products/category/${category.toLowerCase()}`
        );
        setProducts(data);
      } catch (error) {
        console.error("Category products error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [category]);

  return (
    <div className="stores-page">

      <div className="stores-header">
        <h1 style={{ textTransform: "capitalize" }}>{category}</h1>
        <p>Everything in {category} available on Shoppea right now.</p>
      </div>

      {loading ? (
        <p className="stores-status">Loading products...</p>
      ) : products.length === 0 ? (
        <p className="stores-status">
          No products found in this category yet.
        </p>
      ) : (
        <div className="product-grid">
          {products.map((product) => (
            <ProductCard product={product} key={product._id} />
          ))}
        </div>
      )}

    </div>
  );
};

export default CategoryProducts;
