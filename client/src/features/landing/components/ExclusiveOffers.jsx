import { useState } from "react";
import "./ExclusiveOffers.css";

import dress from "../../../assets/dress.jpg";
import skirt from "../../../assets/skirt.jpg";
import hoodie from "../../../assets/hoodie.jpg";
import tshirt from "../../../assets/tshirt.jpg";

const products = [
  {
    id: 1,
    image: dress,
    name: "Pastel Yellow Dress",
    price: "Rs. 2,499",
    category: "DRESS",
  },
  {
    id: 2,
    image: skirt,
    name: "Polka Dots Skirt",
    price: "Rs. 1,999",
    category: "SKIRT",
  },
  {
    id: 3,
    image: hoodie,
    name: "Hoodie",
    price: "Rs. 3,299",
    category: "HOODIE",
  },
  {
    id: 4,
    image: tshirt,
    name: "Shirt",
    price: "Rs. 2,199",
    category: "SHIRT",
  },
];

const ExclusiveOffers = () => {
  const [wishlist, setWishlist] = useState([]);

  const toggleWishlist = (id) => {
    setWishlist((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  };

  const addToCart = (product) => {
    console.log("Added to cart:", product.name);

    // We can connect this to your cart/backend later.
  };

  return (
    <section className="exclusive-offers">

      <div className="section-title">
        <h2>Exclusive Offers</h2>
      </div>

      <div className="product-grid">

        {products.map((product) => {

          const isWishlisted = wishlist.includes(product.id);

          return (
            <div className="product-card" key={product.id}>

              {/* PRODUCT IMAGE */}
              <div className="product-image">

                <img
                  src={product.image}
                  alt={product.name}
                />

                {/* WISHLIST */}
                <button
                  type="button"
                  className={`wishlist-btn ${
                    isWishlisted ? "active" : ""
                  }`}
                  onClick={() => toggleWishlist(product.id)}
                  aria-label="Add to wishlist"
                >
                  {isWishlisted ? "♥" : "♡"}
                </button>

              </div>


              {/* PRODUCT INFORMATION */}
              <div className="product-content">

                <p className="product-category">
                  {product.category}
                </p>

                <h3>{product.name}</h3>

                <p className="price">
                  {product.price}
                </p>


                {/* BUTTONS */}
                <div className="product-actions">

                  {/* DETAILS */}
                  <button
                    type="button"
                    className="details-btn"
                  >
                    <span className="details-icon">ⓘ</span>
                    Details
                  </button>


                  {/* ADD TO CART */}
                  <button
                    type="button"
                    className="cart-btn"
                    onClick={() => addToCart(product)}
                  >
                    <span className="cart-icon">🛒</span>
                    Add
                  </button>

                </div>

              </div>

            </div>
          );
        })}

      </div>

    </section>
  );
};

export default ExclusiveOffers;