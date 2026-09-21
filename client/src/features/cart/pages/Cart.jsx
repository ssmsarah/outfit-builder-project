import { useNavigate } from "react-router-dom";
import { Trash2, Minus, Plus, ShoppingBag, Store, Heart, Tag } from "lucide-react";
import { useCart } from "../../../context/CartContext";
import { useWishlist } from "../../../context/WishlistContext";
import { useToast } from "../../../context/ToastContext";
import { getImageUrl } from "../../../utils/getImageUrl";
import "./Cart.css";

const unitPrice = (product) => {
  if (!product) return 0;
  return product.discountType && product.discountType !== "none" && product.discountValue > 0
    ? product.finalPrice
    : product.price;
};

const Cart = () => {
  const navigate = useNavigate();
  const cart = useCart();
  const wishlist = useWishlist();
  const toast = useToast();

  if (!localStorage.getItem("token")) {
    return (
      <div className="cart-page">
        <div className="cart-empty">
          <ShoppingBag size={48} strokeWidth={1.5} />
          <h2>Please log in to view your cart</h2>
          <button onClick={() => navigate("/login")}>Log In</button>
        </div>
      </div>
    );
  }

  const items = cart?.items || [];

  const subtotal = items.reduce(
    (sum, item) => sum + (item.product?.price || 0) * item.quantity,
    0
  );

  const discountedTotal = items.reduce(
    (sum, item) => sum + unitPrice(item.product) * item.quantity,
    0
  );

  const savings = subtotal - discountedTotal;

  const groupedByStore = items.reduce((groups, item) => {
    const storeName = item.product?.store || "Shoppea Store";
    if (!groups[storeName]) groups[storeName] = [];
    groups[storeName].push(item);
    return groups;
  }, {});

  const handleMoveToWishlist = async (item) => {
    try {
      await wishlist.toggle(item.product._id);
      await cart.removeItem(item.product._id);
      toast?.showToast(`${item.product.name} moved to wishlist`, "success");
    } catch (error) {
      console.error("Move to wishlist error:", error);
    }
  };

  return (
    <div className="cart-page">

      <h1>Your Cart{items.length > 0 ? ` (${items.length})` : ""}</h1>

      {items.length === 0 ? (
        <div className="cart-empty">
          <ShoppingBag size={48} strokeWidth={1.5} />
          <h2>Your cart is empty</h2>
          <p>Browse products and add something you love.</p>
          <button onClick={() => navigate("/home")}>
            Continue Shopping
          </button>
        </div>
      ) : (
        <div className="cart-layout">

          <div className="cart-items">
            {Object.entries(groupedByStore).map(([storeName, storeItems]) => (
              <div className="cart-store-group" key={storeName}>

                <div className="cart-store-header">
                  <Store size={15} />
                  <span>{storeName}</span>
                </div>

                {storeItems.map((item) => {
                  const hasDiscount =
                    item.product?.discountType &&
                    item.product.discountType !== "none" &&
                    item.product.discountValue > 0;
                  const price = unitPrice(item.product);

                  return (
                    <div className="cart-item" key={item._id}>

                      <img
                        src={getImageUrl(item.product?.image)}
                        alt={item.product?.name}
                        onClick={() =>
                          navigate(`/product/${item.product?._id}`)
                        }
                      />

                      <div className="cart-item-info">
                        <h3>{item.product?.name}</h3>
                        {item.product?.stock === 0 && (
                          <span className="cart-item-oos">Out of stock</span>
                        )}
                        <p className="cart-item-price">
                          Rs. {price}
                          {hasDiscount && (
                            <span className="cart-item-price-original">
                              Rs. {item.product.price}
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="cart-item-qty">
                        <button
                          onClick={() =>
                            item.quantity > 1
                              ? cart.updateItem(item.product._id, item.quantity - 1)
                              : cart.removeItem(item.product._id)
                          }
                        >
                          <Minus size={14} />
                        </button>

                        <span>{item.quantity}</span>

                        <button
                          onClick={() =>
                            cart.updateItem(item.product._id, item.quantity + 1)
                          }
                          disabled={item.quantity >= (item.product?.stock ?? Infinity)}
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <p className="cart-item-total">
                        Rs. {price * item.quantity}
                      </p>

                      <div className="cart-item-actions">
                        <button
                          className="cart-item-wishlist"
                          onClick={() => handleMoveToWishlist(item)}
                          aria-label="Move to wishlist"
                          title="Move to wishlist"
                        >
                          <Heart size={16} />
                        </button>

                        <button
                          className="cart-item-remove"
                          onClick={() => cart.removeItem(item.product._id)}
                          aria-label="Remove item"
                          title="Remove"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                    </div>
                  );
                })}

              </div>
            ))}
          </div>

          <div className="cart-summary">
            <h3>Order Summary</h3>

            <div className="cart-summary-row">
              <span>Subtotal</span>
              <span>Rs. {subtotal}</span>
            </div>

            {savings > 0 && (
              <div className="cart-summary-row cart-summary-savings">
                <span>
                  <Tag size={13} /> Discount
                </span>
                <span>- Rs. {savings}</span>
              </div>
            )}

            <div className="cart-summary-row">
              <span>Shipping</span>
              <span>Free</span>
            </div>

            <div className="cart-summary-row cart-summary-total">
              <span>Total</span>
              <span>Rs. {discountedTotal}</span>
            </div>

            <button
              className="checkout-btn"
              onClick={() => navigate("/checkout")}
            >
              Proceed to Checkout
            </button>
          </div>

        </div>
      )}

    </div>
  );
};

export default Cart;
