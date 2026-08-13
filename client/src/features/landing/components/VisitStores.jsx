import { useState } from "react";
import { Link } from "react-router-dom";
import "./VisitStores.css";

import zara from "../../../assets/zara.jpg";
import nike from "../../../assets/nike.jpg";
import hm from "../../../assets/hm.jpg";
import adidas from "../../../assets/adidas.jpg";
import gucci from "../../../assets/gucci.jpg";
import lv from "../../../assets/lv.jpg";

const stores = [
  { id: 1, name: "Zara", logo: zara },
  { id: 2, name: "Nike", logo: nike },
  { id: 3, name: "H&M", logo: hm },
  { id: 4, name: "Adidas", logo: adidas },
  { id: 5, name: "Gucci", logo: gucci },
  { id: 6, name: "Louis Vuitton", logo: lv },
];

const VisitStores = () => {
  const [page, setPage] = useState(0);

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
            <div className="brand-card" key={store.id}>
              <div className="brand-circle">
                <img src={store.logo} alt={store.name} />
              </div>

              <p>{store.name}</p>
            </div>
          ))}
        </div>

        <button
          className="arrow-btn"
          onClick={nextPage}
          disabled={page === totalPages - 1}
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