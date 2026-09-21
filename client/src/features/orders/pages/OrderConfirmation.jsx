import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../api/axios";
import "./OrderConfirmation.css";

const OrderConfirmation = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const { data } = await api.get(`/orders/${orderId}`);
        setOrder(data);
      } catch (error) {
        console.error("Order fetch error:", error);
      }
    };

    fetchOrder();
  }, [orderId]);

  return (
    <div className="confirmation-page">

      <div className="confirmation-card">

        <div className="tick-wrapper">
          <svg viewBox="0 0 90 90" className="tick-svg">
            <circle
              className="tick-circle"
              cx="45"
              cy="45"
              r="40"
              fill="none"
            />
            <path
              className="tick-check"
              fill="none"
              d="M25 46 L39 60 L66 30"
            />
          </svg>
        </div>

        <h1>Your Order is Placed!</h1>

        <p>
          Thank you for shopping with Shoppea. We've received your order
          and it's being prepared.
        </p>

        {order && (
          <div className="confirmation-details">
            <div>
              <span>Order Number</span>
              <strong>#{order._id.slice(-8).toUpperCase()}</strong>
            </div>
            <div>
              <span>Total Amount</span>
              <strong>Rs. {order.totalAmount}</strong>
            </div>
            <div>
              <span>Payment</span>
              <strong>Cash on Delivery</strong>
            </div>
          </div>
        )}

        <div className="confirmation-actions">
          <button
            className="confirmation-secondary"
            onClick={() => navigate("/home")}
          >
            Continue Shopping
          </button>

          <button
            className="confirmation-primary"
            onClick={() => navigate("/my-orders")}
          >
            View My Orders
          </button>
        </div>

      </div>

    </div>
  );
};

export default OrderConfirmation;
