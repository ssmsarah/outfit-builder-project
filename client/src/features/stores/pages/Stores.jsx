import "./Stores.css";

import zara from "../../../assets/zara.jpg";
import nike from "../../../assets/nike.jpg";
import hm from "../../../assets/hm.jpg";
import adidas from "../../../assets/adidas.jpg";
import gucci from "../../../assets/gucci.jpg";
import lv from "../../../assets/lv.jpg";

const stores = [
  {
    id: 1,
    name: "Zara",
    logo: zara,
    description: "Modern fashion and everyday essentials.",
  },
  {
    id: 2,
    name: "Nike",
    logo: nike,
    description: "Sportswear, shoes and lifestyle products.",
  },
  {
    id: 3,
    name: "H&M",
    logo: hm,
    description: "Affordable fashion for every style.",
  },
  {
    id: 4,
    name: "Adidas",
    logo: adidas,
    description: "Sportswear and casual fashion.",
  },
  {
    id: 5,
    name: "Gucci",
    logo: gucci,
    description: "Luxury fashion and accessories.",
  },
  {
    id: 6,
    name: "Louis Vuitton",
    logo: lv,
    description: "Luxury fashion, bags and accessories.",
  },
];

const Stores = () => {
  return (
    <div className="stores-page">

      <div className="stores-header">
        <h1>Our Stores</h1>

        <p>
          Explore collections from your favorite brands
          and discover new styles.
        </p>
      </div>

      <div className="stores-grid">
        {stores.map((store) => (
          <div className="store-page-card" key={store.id}>

            <div className="store-page-logo">
              <img
                src={store.logo}
                alt={store.name}
              />
            </div>

            <h2>{store.name}</h2>

            <p>{store.description}</p>

            <button>
              Explore Store →
            </button>

          </div>
        ))}
      </div>

    </div>
  );
};

export default Stores;