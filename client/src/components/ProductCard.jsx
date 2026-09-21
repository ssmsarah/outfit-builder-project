import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useToast } from "../context/ToastContext";
import { getImageUrl } from "../utils/getImageUrl";
import "../features/landing/components/ExclusiveOffers.css";

const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  const cart = useCart();
  const wishlist = useWishlist();
  const toast = useToast();

  const isWishlisted = wishlist?.isWishlisted(product._id);
  const hasDiscount =
    product.discountType && product.discountType !== "none" && product.discountValue > 0;
  const finalPrice = hasDiscount ? product.finalPrice : product.price;

  const isNew =
    !hasDiscount &&
    product.createdAt &&
    Date.now() - new Date(product.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000;

  const requireLogin = () => {
    if (!localStorage.getItem("token")) {
      toast?.showToast("Please log in first", "info");
      navigate("/login");
      return true;
    }
    return false;
  };

  const handleAddToCart = async (e) => {
    e.stopPropagation();

    if (requireLogin()) return;

    try {
      await cart.addItem(product._id, 1);
      toast?.showToast(`${product.name} added to cart`, "success");
    } catch (error) {
      console.error("Add to cart error:", error);
      toast?.showToast(
        error.response?.data?.message || "Failed to add to cart",
        "error"
      );
    }
  };

  const handleToggleWishlist = async (e) => {
    e.stopPropagation();

    if (requireLogin()) return;

    try {
      await wishlist.toggle(product._id);
      toast?.showToast(
        isWishlisted ? "Removed from wishlist" : "Added to wishlist",
        "success"
      );
    } catch (error) {
      console.error("Wishlist error:", error);
      toast?.showToast(
        error.response?.data?.message || "Failed to update wishlist",
        "error"
      );
    }
  };

  return (
    <div
      className="product-card"
      onClick={() => navigate(`/product/${product._id}`)}
      style={{ cursor: "pointer" }}
    >

      <div className="product-image">
        <img src={getImageUrl(product.image)} alt={product.name} />

        {hasDiscount && (
          <span className="discount-badge">
            {product.discountType === "percentage"
              ? `-${product.discountValue}%`
              : `-Rs.${product.discountValue}`}
          </span>
        )}

        {isNew && <span className="discount-badge new-badge">NEW</span>}

        <button
          type="button"
          className={`wishlist-btn ${isWishlisted ? "active" : ""}`}
          onClick={handleToggleWishlist}
          aria-label="Add to wishlist"
        >
          {isWishlisted ? "♥" : "♡"}
        </button>
      </div>

      <div className="product-content">
        <p className="product-category">
          {product.category?.toUpperCase()}
        </p>

        <h3>{product.name}</h3>

        {hasDiscount ? (
          <p className="price">
            Rs. {finalPrice}{" "}
            <span className="price-original">Rs. {product.price}</span>
          </p>
        ) : (
          <p className="price">Rs. {product.price}</p>
        )}

        <div className="product-actions">
          <button
            type="button"
            className="details-btn"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/product/${product._id}`);
            }}
          >
            <span className="details-icon">ⓘ</span>
            Details
          </button>

          <button
            type="button"
            className="cart-btn"
            onClick={handleAddToCart}
            disabled={product.stock === 0}
          >
            <span className="cart-icon">🛒</span>
            {product.stock === 0 ? "Sold Out" : "Add"}
          </button>
        </div>
      </div>

    </div>
  );
};

export default ProductCard;
