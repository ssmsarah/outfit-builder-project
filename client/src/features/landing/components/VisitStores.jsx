import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Store as StoreIcon } from "lucide-react";
import api from "../../../api/axios";
import "./VisitStores.css";

const VisitStores = () => {
  const navigate = useNavigate();
  const [stores, setStores] = useState([]);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const { data } = await api.get("/stores");
        setStores(data);
      } catch (error) {
        console.error("Visit stores error:", error);
      }
    };

    fetchStores();
  }, []);

  const storesPerPage = 4;
  const totalPages = Math.ceil(stores.length / storesPerPage);

  const start = page * storesPerPage;
  const visibleStores = stores.slice(start, start + storesPerPage);

  const nextPage = () => {
    if (page < totalPages - 1) {
      setPage(page + 1);
    }
  };

  const prevPage = () => {
    if (page > 0) {
      setPage(page - 1);
    }
  };

  if (stores.length === 0) return null;

  return (
    <section className="visit-stores">

      <h2 className="section-title">Visit Stores</h2>

      <div className="brand-wrapper">

        <button
          className="arrow-btn"
          onClick={prevPage}
          disabled={page === 0}
        >
          &#10094;
        </button>

        <div className="brand-slider">
          {visibleStores.map((store) => (
            <div
              className="brand-card"
              key={store.id}
              onClick={() => navigate(`/stores/${store.id}`)}
              style={{ cursor: "pointer" }}
            >
              <div className="brand-circle">
                <StoreIcon size={40} strokeWidth={1.5} color="#d95d81" />
              </div>

              <p>{store.storeName}</p>
            </div>
          ))}
        </div>

        <button
          className="arrow-btn"
          onClick={nextPage}
          disabled={page >= totalPages - 1}
        >
          &#10095;
        </button>

      </div>

      <div className="view-all-container">
        <Link to="/stores" className="view-all-btn">
          View All Stores →
        </Link>
      </div>

    </section>
  );
};

export default VisitStores;
