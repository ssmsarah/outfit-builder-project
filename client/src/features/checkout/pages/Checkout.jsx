import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import { useCart } from "../../../context/CartContext";
import "../../cart/pages/Cart.css";
import "./Checkout.css";

const Checkout = () => {
  const navigate = useNavigate();
  const cart = useCart();

  const user = JSON.parse(localStorage.getItem("user") || "null");

  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    address: "",
  });
  const [error, setError] = useState("");
  const [placing, setPlacing] = useState(false);

  const items = cart?.items || [];

  const unitPrice = (product) => {
    if (!product) return 0;
    return product.discountType && product.discountType !== "none" && product.discountValue > 0
      ? product.finalPrice
      : product.price;
  };

  const subtotal = items.reduce(
    (sum, item) => sum + unitPrice(item.product) * item.quantity,
    0
  );

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name || !form.phone || !form.address) {
      setError("Please fill in your name, phone and address.");
      return;
    }

    try {
      setPlacing(true);

      const orderItems = items.map((item) => ({
        productId: item.product._id,
        quantity: item.quantity,
      }));

      const { data } = await api.post("/orders", {
        items: orderItems,
        shippingAddress: form,
      });

      await cart.refresh();

      navigate(`/order-confirmation/${data._id}`);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to place order"
      );
    } finally {
      setPlacing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="cart-page">
        <div className="cart-empty">
          <h2>Your cart is empty</h2>
          <p>Add products to your cart before checking out.</p>
          <button onClick={() => navigate("/home")}>
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">

      <h1>Checkout</h1>

      <form className="checkout-layout" onSubmit={handlePlaceOrder}>

        <div className="checkout-form-card">
          <h3>Shipping Details</h3>

          <div className="checkout-form-group">
            <label>Full Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              required
            />
          </div>

          <div className="checkout-form-group">
            <label>Phone Number</label>
            <input
              type="text"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="Enter your phone number"
              required
            />
          </div>

          <div className="checkout-form-group">
            <label>Delivery Address</label>
            <textarea
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Enter your full delivery address"
              rows="4"
              required
            />
          </div>

          <div className="checkout-form-group">
            <label>Payment Method</label>
            <div className="checkout-payment-note">
              Cash on Delivery — pay when your order arrives.
            </div>
          </div>

          {error && <p className="checkout-error">{error}</p>}
        </div>

        <div className="cart-summary">
          <h3>Order Summary</h3>

          {items.map((item) => (
            <div className="cart-summary-row" key={item._id}>
              <span>
                {item.product?.name} × {item.quantity}
              </span>
              <span>Rs. {unitPrice(item.product) * item.quantity}</span>
            </div>
          ))}

          <div className="cart-summary-row">
            <span>Shipping</span>
            <span>Free</span>
          </div>

          <div className="cart-summary-row cart-summary-total">
            <span>Total</span>
            <span>Rs. {subtotal}</span>
          </div>

          <button
            type="submit"
            className="checkout-btn"
            disabled={placing}
          >
            {placing ? "Placing Order..." : "Place Order"}
          </button>
        </div>

      </form>

    </div>
  );
};

export default Checkout;
