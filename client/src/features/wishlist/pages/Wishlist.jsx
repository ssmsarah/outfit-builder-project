import { useNavigate } from "react-router-dom";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import { useWishlist } from "../../../context/WishlistContext";
import { useCart } from "../../../context/CartContext";
import { getImageUrl } from "../../../utils/getImageUrl";
import "../../cart/pages/Cart.css";
import "./Wishlist.css";

const Wishlist = () => {
  const navigate = useNavigate();
  const wishlist = useWishlist();
  const cart = useCart();

  if (!localStorage.getItem("token")) {
    return (
      <div className="cart-page">
        <div className="cart-empty">
          <Heart size={48} strokeWidth={1.5} />
          <h2>Please log in to view your wishlist</h2>
          <button onClick={() => navigate("/login")}>Log In</button>
        </div>
      </div>
    );
  }

  const items = wishlist?.items || [];

  return (
    <div className="cart-page">

      <h1>Your Wishlist</h1>

      {items.length === 0 ? (
        <div className="cart-empty">
          <Heart size={48} strokeWidth={1.5} />
          <h2>Your wishlist is empty</h2>
          <p>Save products you love to find them here later.</p>
          <button onClick={() => navigate("/home")}>
            Continue Shopping
          </button>
        </div>
      ) : (
        <div className="wishlist-grid">
          {items.map((product) => (
            <div className="wishlist-card" key={product._id}>

              <img
                src={getImageUrl(product.image)}
                alt={product.name}
                onClick={() => navigate(`/product/${product._id}`)}
              />

              <div className="wishlist-card-info">
                <h3>{product.name}</h3>
                <p>Rs. {product.price}</p>
              </div>

              <div className="wishlist-card-actions">
                <button
                  className="wishlist-move-btn"
                  onClick={async () => {
                    await cart.addItem(product._id, 1);
                    await wishlist.toggle(product._id);
                  }}
                  disabled={product.stock === 0}
                >
                  <ShoppingCart size={15} />
                  {product.stock === 0 ? "Sold Out" : "Move to Cart"}
                </button>

                <button
                  className="wishlist-remove-btn"
                  onClick={() => wishlist.toggle(product._id)}
                  aria-label="Remove from wishlist"
                >
                  <Trash2 size={16} />
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default Wishlist;
