import "./CategorySection.css";

import dresses from "../../../assets/dresses.jpg";
import formals from "../../../assets/formals.jpg";
import tops from "../../../assets/tops.jpg";
import bottoms from "../../../assets/bottoms.jpg";

import { Link } from "react-router-dom";
import { ArrowUpRight, Grid3x3 } from "lucide-react";

const smallCategories = [
  { id: 2, name: "Formals", image: formals },
  { id: 3, name: "Tops", image: tops },
  { id: 4, name: "Bottoms", image: bottoms },
];

const CategorySection = () => {
  return (
    <section className="category-section">

      <h2>Shop by Categories</h2>

      <p>
        Find your favorite fashion pieces from every category.
      </p>

      <div className="category-mosaic">

        <Link to="/category/dresses" className="mosaic-tile mosaic-tile-large">
          <img src={dresses} alt="Dresses" />
          <div className="mosaic-overlay">
            <span>Dresses</span>
            <ArrowUpRight size={18} />
          </div>
        </Link>

        <div className="mosaic-small-grid">

          {smallCategories.map((category) => (
            <Link
              to={`/category/${category.name.toLowerCase()}`}
              className="mosaic-tile"
              key={category.id}
            >
              <img src={category.image} alt={category.name} />
              <div className="mosaic-overlay">
                <span>{category.name}</span>
                <ArrowUpRight size={16} />
              </div>
            </Link>
          ))}

          <Link to="/categories" className="mosaic-tile mosaic-tile-viewall">
            <Grid3x3 size={26} />
            <span>View All Categories</span>
          </Link>

        </div>

      </div>

    </section>
  );
};

export default CategorySection;
