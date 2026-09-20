import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ExclusiveOffers.css"

const ProductSection = () => {
    const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [wishlist, setWishlist] = useState([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch(
          "http://localhost:5000/api/products"
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Failed to fetch products"
          );
        }

        setProducts(data);
      } catch (error) {
        console.error("Products error:", error);
      }
    };

    fetchProducts();
  }, []);

  const toggleWishlist = (id) => {
    setWishlist((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  };

  const addToCart = (product) => {
    console.log("Added to cart:", product.name);

    // Cart functionality can be connected later.
  };

  return (
    <section className="exclusive-offers">

      <div className="section-title">
        <h2>Latest Products</h2>
      </div>

      {products.length === 0 ? (
        <p className="no-products">
          No products available yet.
        </p>
      ) : (
        <div className="product-grid">

          {products.map((product) => {

            const isWishlisted = wishlist.includes(
              product._id
            );

            return (
              <div
                className="product-card"
                key={product._id}
              >

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
                    onClick={() =>
                      toggleWishlist(product._id)
                    }
                    aria-label="Add to wishlist"
                  >
                    {isWishlisted ? "♥" : "♡"}
                  </button>

                </div>

                {/* PRODUCT INFORMATION */}
                <div className="product-content">

                  <p className="product-category">
                    {product.category?.toUpperCase()}
                  </p>

                  <h3>{product.name}</h3>

                  <p className="price">
                    Rs. {product.price}
                  </p>

                  {/* BUTTONS */}
                  <div className="product-actions">

                    {/* DETAILS */}
                   <button
  type="button"
  className="details-btn"
  onClick={() => navigate(`/product/${product._id}`)}
>
  <span className="details-icon">
    ⓘ
  </span>
  Details
</button>

                    {/* ADD TO CART */}
                    <button
                      type="button"
                      className="cart-btn"
                      onClick={() => addToCart(product)}
                    >
                      <span className="cart-icon">
                        🛒
                      </span>
                      Add
                    </button>

                  </div>

                </div>

              </div>
            );
          })}

        </div>
      )}

    </section>
  );
};

export default ProductSection;