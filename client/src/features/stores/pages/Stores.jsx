import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Store as StoreIcon } from "lucide-react";
import api from "../../../api/axios";
import "./Stores.css";

const Stores = () => {
  const navigate = useNavigate();

  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const { data } = await api.get("/stores");
        setStores(data);
      } catch (error) {
        console.error("Stores error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStores();
  }, []);

  return (
    <div className="stores-page">

      <div className="stores-header">
        <h1>Our Stores</h1>

        <p>
          Explore collections from registered sellers
          and discover new styles.
        </p>
      </div>

      {loading ? (
        <p className="stores-status">Loading stores...</p>
      ) : stores.length === 0 ? (
        <p className="stores-status">
          No stores are registered yet. Check back soon!
        </p>
      ) : (
        <div className="stores-grid">
          {stores.map((store) => (
            <div className="store-page-card" key={store.id}>

              <div className="store-page-logo">
                <StoreIcon size={42} strokeWidth={1.5} color="#d95d81" />
              </div>

              <h2>{store.storeName}</h2>

              <p>
                {store.address || "Shoppea Seller"} ·{" "}
                {store.productCount}{" "}
                {store.productCount === 1 ? "product" : "products"}
              </p>

              <button onClick={() => navigate(`/stores/${store.id}`)}>
                Explore Store →
              </button>

            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default Stores;
