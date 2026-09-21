import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PackageSearch } from "lucide-react";
import api from "../../../api/axios";
import { getImageUrl } from "../../../utils/getImageUrl";
import "./MyOrders.css";

const statusColors = {
  pending: "status-pending",
  processing: "status-processing",
  shipped: "status-shipped",
  delivered: "status-delivered",
  cancelled: "status-cancelled",
};

const MyOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      navigate("/login");
      return;
    }

    const fetchOrders = async () => {
      try {
        const { data } = await api.get("/orders/my-orders");
        setOrders(data);
      } catch (error) {
        console.error("My orders error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [navigate]);

  return (
    <div className="my-orders-page">

      <h1>My Orders</h1>

      {loading ? (
        <p className="orders-status-msg">Loading your orders...</p>
      ) : orders.length === 0 ? (
        <div className="orders-empty">
          <PackageSearch size={48} strokeWidth={1.5} />
          <h2>No orders yet</h2>
          <p>When you place an order, it will show up here.</p>
          <button onClick={() => navigate("/home")}>Start Shopping</button>
        </div>
      ) : (
        <div className="my-orders-list">
          {orders.map((order) => (
            <div className="my-order-card" key={order._id}>

              <div className="my-order-header">
                <div>
                  <strong>#{order._id.slice(-8).toUpperCase()}</strong>
                  <span className="my-order-date">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <span
                  className={`my-order-payment ${
                    order.paymentStatus === "paid" ? "paid" : "pending"
                  }`}
                >
                  {order.paymentStatus}
                </span>
              </div>

              <div className="my-order-items">
                {order.items.map((item) => (
                  <div className="my-order-item" key={item._id}>
                    <img
                      src={getImageUrl(item.product?.image)}
                      alt={item.product?.name}
                    />
                    <div className="my-order-item-info">
                      <p>{item.product?.name}</p>
                      <span>
                        Qty {item.quantity} · Rs. {item.price}
                      </span>
                    </div>
                    <span
                      className={`my-order-item-status ${
                        statusColors[item.status] || ""
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>

              <div className="my-order-footer">
                <span>Total</span>
                <strong>Rs. {order.totalAmount}</strong>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default MyOrders;
