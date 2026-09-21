import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Heart, ShoppingCart, Minus, Plus, Store, Star } from "lucide-react";
import api from "../../../api/axios";
import { useCart } from "../../../context/CartContext";
import { useWishlist } from "../../../context/WishlistContext";
import { useToast } from "../../../context/ToastContext";
import { getImageUrl } from "../../../utils/getImageUrl";
import "./ProductDetails.css";

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const cart = useCart();
  const wishlist = useWishlist();
  const toast = useToast();

  const [product, setProduct] = useState(null);
  const [error, setError] = useState("");

  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);

  const [reviews, setReviews] = useState([]);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [reviewError, setReviewError] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const { data } = await api.get(`/products/${id}`);
        setProduct(data);
        setSelectedSize(data.sizes?.[0] || "");
        setSelectedColor(data.colors?.[0] || "");
      } catch (err) {
        setError(
          err.response?.data?.message || "Failed to fetch product"
        );
      }
    };

    fetchProduct();
  }, [id]);

  const fetchReviews = async () => {
    try {
      const { data } = await api.get(`/reviews/product/${id}`);
      setReviews(data);
    } catch (err) {
      console.error("Reviews error:", err);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [id]);

  const requireLogin = () => {
    if (!localStorage.getItem("token")) {
      toast?.showToast("Please log in first", "info");
      navigate("/login");
      return true;
    }
    return false;
  };

  const handleAddToCart = async () => {
    if (requireLogin()) return;

    try {
      await cart.addItem(product._id, quantity);
      toast?.showToast(`${product.name} added to cart`, "success");
    } catch (err) {
      toast?.showToast(
        err.response?.data?.message || "Failed to add to cart",
        "error"
      );
    }
  };

  const handleBuyNow = async () => {
    if (requireLogin()) return;

    try {
      await cart.addItem(product._id, quantity);
      navigate("/checkout");
    } catch (err) {
      toast?.showToast(
        err.response?.data?.message || "Failed to add to cart",
        "error"
      );
    }
  };

  const handleToggleWishlist = async () => {
    if (requireLogin()) return;

    try {
      await wishlist.toggle(product._id);
      toast?.showToast(
        isWishlisted ? "Removed from wishlist" : "Added to wishlist",
        "success"
      );
    } catch (err) {
      toast?.showToast(
        err.response?.data?.message || "Failed to update wishlist",
        "error"
      );
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setReviewError("");

    if (requireLogin()) return;

    try {
      setSubmittingReview(true);
      await api.post(`/reviews/${id}`, reviewForm);
      setReviewForm({ rating: 5, comment: "" });
      await fetchReviews();
    } catch (err) {
      setReviewError(
        err.response?.data?.message || "Failed to submit review"
      );
    } finally {
      setSubmittingReview(false);
    }
  };

  if (error) {
    return <p className="pd-status">{error}</p>;
  }

  if (!product) {
    return <p className="pd-status">Loading product...</p>;
  }

  const isWishlisted = wishlist?.isWishlisted(product._id);
  const hasDiscount =
    product.discountType && product.discountType !== "none" && product.discountValue > 0;

  return (
    <div className="pd-page">

      <div className="pd-layout">

        <div className="pd-image">
          <img src={getImageUrl(product.image)} alt={product.name} />
        </div>

        <div className="pd-info">

          <p className="pd-category">{product.category?.toUpperCase()}</p>

          <h1>{product.name}</h1>

          <div className="pd-rating">
            <Star size={15} fill="#f5b942" color="#f5b942" />
            <span>
              {product.ratingAvg?.toFixed(1) || "0.0"} ({product.numReviews || 0} reviews)
            </span>
          </div>

          {hasDiscount ? (
            <p className="pd-price">
              Rs. {product.finalPrice}{" "}
              <span className="pd-price-original">Rs. {product.price}</span>
              <span className="pd-discount-tag">
                {product.discountType === "percentage"
                  ? `${product.discountValue}% OFF`
                  : `Rs.${product.discountValue} OFF`}
              </span>
            </p>
          ) : (
            <p className="pd-price">Rs. {product.price}</p>
          )}

          <p className="pd-description">{product.description}</p>

          <button
            className="pd-store-link"
            onClick={() => navigate(`/stores/${product.seller}`)}
          >
            <Store size={15} />
            {product.store}
          </button>

          {product.sizes?.length > 0 && (
            <div className="pd-option-group">
              <label>Size</label>
              <div className="pd-option-list">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    className={`pd-option ${
                      selectedSize === size ? "active" : ""
                    }`}
                    onClick={() => setSelectedSize(size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {product.colors?.length > 0 && (
            <div className="pd-option-group">
              <label>Color</label>
              <div className="pd-option-list">
                {product.colors.map((color) => (
                  <button
                    key={color}
                    className={`pd-option ${
                      selectedColor === color ? "active" : ""
                    }`}
                    onClick={() => setSelectedColor(color)}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="pd-option-group">
            <label>Quantity</label>
            <div className="pd-qty-stepper">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                <Minus size={14} />
              </button>
              <span>{quantity}</span>
              <button
                onClick={() =>
                  setQuantity((q) => Math.min(product.stock || 1, q + 1))
                }
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          <p className="pd-stock">
            {product.stock > 0
              ? `${product.stock} in stock`
              : "Out of stock"}
          </p>

          <div className="pd-actions">
            <button
              className="pd-cart-btn"
              onClick={handleAddToCart}
              disabled={product.stock === 0}
            >
              <ShoppingCart size={16} />
              Add to Cart
            </button>

            <button
              className="pd-buy-btn"
              onClick={handleBuyNow}
              disabled={product.stock === 0}
            >
              Buy Now
            </button>

            <button
              className={`pd-wishlist-btn ${isWishlisted ? "active" : ""}`}
              onClick={handleToggleWishlist}
              aria-label="Toggle wishlist"
            >
              <Heart
                size={18}
                fill={isWishlisted ? "#df5d7c" : "none"}
              />
            </button>
          </div>

        </div>

      </div>

      <div className="pd-reviews">
        <h2>Customer Reviews</h2>

        <form className="pd-review-form" onSubmit={handleSubmitReview}>
          <div className="pd-review-rating-select">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                type="button"
                key={n}
                onClick={() =>
                  setReviewForm({ ...reviewForm, rating: n })
                }
              >
                <Star
                  size={20}
                  fill={n <= reviewForm.rating ? "#f5b942" : "none"}
                  color="#f5b942"
                />
              </button>
            ))}
          </div>

          <textarea
            placeholder="Share your thoughts about this product..."
            rows="3"
            value={reviewForm.comment}
            onChange={(e) =>
              setReviewForm({ ...reviewForm, comment: e.target.value })
            }
          />

          {reviewError && <p className="pd-review-error">{reviewError}</p>}

          <button
            type="submit"
            className="pd-review-submit"
            disabled={submittingReview}
          >
            {submittingReview ? "Submitting..." : "Submit Review"}
          </button>
        </form>

        <div className="pd-review-list">
          {reviews.length === 0 ? (
            <p className="pd-status">No reviews yet. Be the first!</p>
          ) : (
            reviews.map((review) => (
              <div className="pd-review-item" key={review._id}>
                <div className="pd-review-item-header">
                  <strong>{review.customer?.name || "Anonymous"}</strong>
                  <div className="pd-review-stars">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={13}
                        fill={i < review.rating ? "#f5b942" : "none"}
                        color="#f5b942"
                      />
                    ))}
                  </div>
                </div>
                {review.comment && <p>{review.comment}</p>}
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
};

export default ProductDetails;
