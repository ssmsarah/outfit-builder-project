import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Store as StoreIcon, MapPin } from "lucide-react";
import api from "../../../api/axios";
import ProductCard from "../../../components/ProductCard";
import "./Stores.css";

const StoreDetail = () => {
  const { sellerId } = useParams();

  const [store, setStore] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStore = async () => {
      try {
        const { data } = await api.get(`/stores/${sellerId}`);
        setStore(data);
      } catch (err) {
        setError(
          err.response?.data?.message || "Failed to load store"
        );
      }
    };

    fetchStore();
  }, [sellerId]);

  if (error) {
    return <p className="stores-status">{error}</p>;
  }

  if (!store) {
    return <p className="stores-status">Loading store...</p>;
  }

  return (
    <div className="stores-page">

      <div className="stores-header">
        <StoreIcon size={48} strokeWidth={1.5} color="#d95d81" />

        <h1>{store.storeName}</h1>

        {store.address && (
          <p>
            <MapPin size={14} style={{ verticalAlign: "-2px" }} />{" "}
            {store.address}
          </p>
        )}
      </div>

      {store.products.length === 0 ? (
        <p className="stores-status">
          This store hasn't listed any products yet.
        </p>
      ) : (
        <div className="product-grid">
          {store.products.map((product) => (
            <ProductCard product={product} key={product._id} />
          ))}
        </div>
      )}

    </div>
  );
};

export default StoreDetail;
