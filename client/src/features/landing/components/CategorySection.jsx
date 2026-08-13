import "./CategorySection.css";

import dresses from "../../../assets/dresses.jpg";
import formals from "../../../assets/formals.jpg";
import tops from "../../../assets/tops.jpg";
import bottoms from "../../../assets/bottoms.jpg";

import { Link } from "react-router-dom";

const categories = [
  {
    id: 1,
    name: "Dresses",
    image: dresses,
  },
  {
    id: 2,
    name: "Formals",
    image: formals,
  },
  {
    id: 3,
    name: "Tops",
    image: tops,
  },
  {
    id: 4,
    name: "Bottoms",
    image: bottoms,
  },
];

const CategorySection = () => {
  return (
    <section className="category-section">

      <h2>Shop by Categories</h2>

      <p>
        Find your favorite fashion pieces from every category.
      </p>

      <div className="category-grid">

        {categories.map((category) => (
          <div className="category-card" key={category.id}>

            <img
              src={category.image}
              alt={category.name}
            />

            <h3>{category.name}</h3>

          </div>
        ))}

      </div>

      <div className="category-btn">

        <Link to="/categories">
          View All Categories →
        </Link>

      </div>

    </section>
  );
};

export default CategorySection;