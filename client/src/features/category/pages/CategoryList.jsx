import { Link } from "react-router-dom";

import dresses from "../../../assets/dresses.jpg";
import formals from "../../../assets/formals.jpg";
import tops from "../../../assets/tops.jpg";
import bottoms from "../../../assets/bottoms.jpg";
import "../../landing/components/CategorySection.css";
import "../../stores/pages/Stores.css";

const categories = [
  { name: "Dresses", value: "dresses", image: dresses },
  { name: "Formals", value: "formals", image: formals },
  { name: "Tops", value: "tops", image: tops },
  { name: "Bottoms", value: "bottoms", image: bottoms },
  { name: "Shoes", value: "shoes", image: dresses },
  { name: "Accessories", value: "accessories", image: formals },
];

const CategoryList = () => {
  return (
    <div className="stores-page">

      <div className="stores-header">
        <h1>Shop by Category</h1>
        <p>Browse products across every category on Shoppea.</p>
      </div>

      <div className="category-grid" style={{ maxWidth: 1000, margin: "0 auto" }}>
        {categories.map((category) => (
          <Link
            to={`/category/${category.value}`}
            className="category-card"
            key={category.value}
          >
            <img src={category.image} alt={category.name} />
            <h3>{category.name}</h3>
          </Link>
        ))}
      </div>

    </div>
  );
};

export default CategoryList;
