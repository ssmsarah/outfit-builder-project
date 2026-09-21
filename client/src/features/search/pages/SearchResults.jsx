import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../../api/axios";
import ProductCard from "../../../components/ProductCard";
import "../../stores/pages/Stores.css";

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/products", {
          params: query ? { search: query } : {},
        });
        setProducts(data);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  return (
    <div className="stores-page">

      <div className="stores-header">
        <h1>{query ? "Search Results" : "All Products"}</h1>
        <p>
          {query
            ? `Showing results for "${query}"`
            : "Browse everything available on Shoppea right now."}
        </p>
      </div>

      {loading ? (
        <p className="stores-status">Loading...</p>
      ) : products.length === 0 ? (
        <p className="stores-status">
          {query ? "No products matched your search." : "No products available yet."}
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

export default SearchResults;
