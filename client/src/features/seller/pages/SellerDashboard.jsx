import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  CreditCard,
  Star,
  User,
  LogOut,
  PlusCircle,
  ArrowLeft,
  TrendingUp,
} from "lucide-react";

import logo from "../../../assets/shopea.png";
import api from "../../../api/axios";
import ProductForm from "../components/ProductForm";
import "./SellerDashboard.css";

const SellerDashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activePage, setActivePage] = useState(
    searchParams.get("tab") || "Dashboard"
  );

  // null = product list view, {mode:"add"} or {mode:"edit", product} = form view
  const [productView, setProductView] = useState(null);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/seller");
  };
  const [verificationStatus, setVerificationStatus] = useState("Pending");

  /* Component */

  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const [profileData, setProfileData] = useState({
    storeName: "",
    sellerName: "",
    email: "",
    phone: "",
    address: "",
    panVat: "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleProfileChange = (e) => {
  setProfileData({
    ...profileData,
    [e.target.name]: e.target.value,
  });
};

const handleSaveProfile = () => {
  setIsEditingProfile(false);
  alert("Profile updated successfully!");
};

const handleCancelProfile = () => {
  setIsEditingProfile(false);
};

const handleChangePassword = () => {
  if (
    !passwordData.currentPassword ||
    !passwordData.newPassword ||
    !passwordData.confirmPassword
  ) {
    alert("Please fill in all password fields.");
    return;
  }

  if (passwordData.newPassword !== passwordData.confirmPassword) {
    alert("New passwords do not match.");
    return;
  }

  if (passwordData.newPassword.length < 8) {
    alert("New password must be at least 8 characters.");
    return;
  }

  alert("Password changed successfully!");

  setPasswordData({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
};


    /* =========================
     ORDERS
  ========================= */

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  const fetchSellerOrders = async () => {
    try {
      setOrdersLoading(true);
      const { data } = await api.get("/orders/seller-orders");
      setOrders(data);
    } catch (error) {
      console.error("Seller orders error:", error);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    fetchSellerOrders();
  }, []);

  const handleItemStatusChange = async (orderId, itemId, status) => {
    try {
      await api.patch(`/orders/${orderId}/items/${itemId}/status`, {
        status,
      });
      fetchSellerOrders();
    } catch (error) {
      console.error("Update item status error:", error);
    }
  };

  /* =========================
     REVIEWS
  ========================= */

  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const { data } = await api.get("/reviews/seller-reviews");
        setReviews(data);
      } catch (error) {
        console.error("Seller reviews error:", error);
      }
    };

    fetchReviews();
  }, []);

  /* =========================
     DERIVED SALES / PAYMENT DATA
  ========================= */

  const allItems = orders.flatMap((order) =>
    order.items.map((item) => ({ ...item, order }))
  );

  const totalEarnings = allItems
    .filter((item) => item.order.paymentStatus === "paid")
    .reduce((sum, item) => sum + item.price * item.quantity, 0);

  const pendingEarnings = allItems
    .filter((item) => item.order.paymentStatus !== "paid")
    .reduce((sum, item) => sum + item.price * item.quantity, 0);

  const totalSales = allItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const ratingCounts = [5, 4, 3, 2, 1].map(
    (star) => reviews.filter((r) => r.rating === star).length
  );
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  /* =========================
     PRODUCT STATES
  ========================= */

  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");

  const fetchMyProducts = async () => {
    try {
      const { data } = await api.get("/products/my-products");
      setProducts(data);
    } catch (err) {
      console.error("Products error:", err);
      setError(err.response?.data?.message || "Failed to fetch products");
    }
  };

  useEffect(() => {
    fetchMyProducts();
  }, []);

  const handleProductFormSuccess = () => {
    setProductView(null);
    fetchMyProducts();
  };

  /* =========================
     MENU ITEMS
  ========================= */

  const menuItems = [
    {
      name: "Dashboard",
      icon: <LayoutDashboard size={20} />,
    },
    {
      name: "Products",
      icon: <Package size={20} />,
    },
    {
      name: "Orders",
      icon: <ShoppingCart size={20} />,
    },
    {
      name: "Payments",
      icon: <CreditCard size={20} />,
    },
    {
      name: "Reviews",
      icon: <Star size={20} />,
    },
    {
      name: "Profile",
      icon: <User size={20} />,
    },
  ];

  /* =========================
     PRODUCT ACTIONS
  ========================= */

  const handleDeleteProduct = async (id) => {
    if (!window.confirm("Delete this product? This cannot be undone.")) return;

    try {
      await api.delete(`/products/${id}`);

      setProducts((prevProducts) =>
        prevProducts.filter((product) => product._id !== id)
      );
    } catch (err) {
      console.error("Delete product error:", err);
      setError(err.response?.data?.message || "Failed to delete product");
    }
  };

 
  /* =========================
     PRODUCT COUNTS
  ========================= */

  const totalProducts = products.length;

  const lowStockProducts = products.filter(
    (product) =>
      product.stock > 0 && product.stock <= 5
  ).length;

  const outOfStockProducts = products.filter(
    (product) => product.stock === 0
  ).length;

  /* =========================
     COMPONENT
  ========================= */

  return (
    
    <div className="seller-dashboard">

      {/* =========================
          SIDEBAR
      ========================= */}

      <aside className="seller-sidebar">

        {/* LOGO */}

        <div className="seller-brand">

          <div className="seller-logo-circle">
            <img
              src={logo}
              alt="Shoppea"
            />
          </div>

          <span>Seller Panel</span>

        </div>


        {/* MENU */}

        <nav className="seller-menu">

          {menuItems.map((item) => (

            <button
              key={item.name}
              className={`seller-menu-item ${
                activePage === item.name
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setActivePage(item.name)
              }
            >

              {item.icon}

              <span>{item.name}</span>

            </button>

          ))}

        </nav>


        {/* BOTTOM ACTIONS */}

        <div className="seller-sidebar-bottom">

          <button
            className="add-product-sidebar"
            onClick={() => {
              setActivePage("Products");
              setProductView({ mode: "add" });
            }}
          >

            <PlusCircle size={20} />

            <span>Add New Product</span>

          </button>


          <button className="seller-logout" onClick={handleLogout}>

            <LogOut size={20} />

            <span>Logout</span>

          </button>

        </div>

      </aside>


      {/* =========================
          MAIN CONTENT
      ========================= */}

      <main className="seller-main">

        {/* HEADER */}

        <header className="seller-header">

          <h1>{activePage}</h1>

          <div className="seller-user">

            <div className="seller-user-avatar">
              S
            </div>

            <div>

              <strong>Seller</strong>

              <span>Shoppea Store</span>

            </div>

          </div>

        </header>


        {/* CONTENT */}

        <section className="seller-content">


          {/* ==================================================
              DASHBOARD
          ================================================== */}

          {activePage === "Dashboard" && (

            <>

              {/* WELCOME */}

              <div className="seller-welcome">

                <h2>Welcome back!</h2>

                <p>
                  Here's what's happening with your
                  store today.
                </p>

              </div>


              {/* STAT CARDS */}

              <div className="seller-stat-grid">


                {/* SALES */}

                <div className="seller-stat-card">

                  <div className="stat-icon sales-icon">

                    <TrendingUp size={23} />

                  </div>

                  <p>Total Sales</p>

                  <h2>Rs. {totalSales.toLocaleString()}</h2>

                </div>


                {/* ORDERS */}

                <div className="seller-stat-card">

                  <div className="stat-icon orders-icon">

                    <ShoppingCart size={23} />

                  </div>

                  <p>Total Orders</p>

                  <h2>{orders.length}</h2>

                </div>


                {/* PRODUCTS */}

                <div className="seller-stat-card">

                  <div className="stat-icon products-icon">

                    <Package size={23} />

                  </div>

                  <p>Active Products</p>

                  <h2>
                    {products.filter((p) => p.available).length}
                  </h2>

                </div>


                {/* RATING */}

                <div className="seller-stat-card">

                  <div className="stat-icon rating-icon">

                    <Star size={23} />

                  </div>

                  <p>Avg Rating</p>

                  <div className="rating-value">

                    <h2>{avgRating.toFixed(2)}</h2>

                    <span>/ 5.0</span>

                  </div>

                  <small>{reviews.length} reviews</small>

                </div>

              </div>


              {/* LOWER SECTION */}

              <div className="seller-lower-grid">


                {/* SALES TREND */}

                <div className="sales-trend-card">

                  <div className="section-title-row">

                    <div>

                      <h3>Sales Trend</h3>

                      <p>
                        Track your store performance
                      </p>

                    </div>

                    <span className="trend-badge">
                      7D
                    </span>

                  </div>


                  <div className="empty-chart">

                    <TrendingUp size={42} />

                    <p>No sales data yet</p>

                    <span>
                      Your sales performance will
                      appear here once you start
                      receiving orders.
                    </span>

                  </div>


                  <div className="chart-days">

                    <span>Sun</span>
                    <span>Mon</span>
                    <span>Tue</span>
                    <span>Wed</span>
                    <span>Thu</span>
                    <span>Fri</span>
                    <span>Sat</span>

                  </div>

                </div>


                {/* QUICK ACTIONS */}

                <div className="quick-actions-card">

                  <h3>Quick Actions</h3>


                  <button
  onClick={() => {
    setActivePage("Products");
    setProductView({ mode: "add" });
  }}
>

                    <div className="quick-icon">

                      <PlusCircle size={22} />

                    </div>

                    <div>

                      <strong>
                        Add New Product
                      </strong>

                      <span>
                        List a new item in your catalog
                      </span>

                    </div>

                  </button>


                  <button
                    onClick={() =>
                      setActivePage("Orders")
                    }
                  >

                    <div className="quick-icon">

                      <ShoppingCart size={22} />

                    </div>

                    <div>

                      <strong>
                        Manage Orders
                      </strong>

                      <span>
                        Review and update your orders
                      </span>

                    </div>

                  </button>


                  <button
                    onClick={() =>
                      setActivePage("Profile")
                    }
                  >

                    <div className="quick-icon">

                      <User size={22} />

                    </div>

                    <div>

                      <strong>
                        Store Profile
                      </strong>

                      <span>
                        Manage your store information
                      </span>

                    </div>

                  </button>

                </div>

              </div>

            </>

          )}


       
{/* ==================================================
    PRODUCTS
================================================== */}

{activePage === "Products" && (

  <div className="seller-page">

    {productView && (
      <div className="seller-page-heading">
        <div>
          <h2>{productView.mode === "edit" ? "Edit Product" : "Add New Product"}</h2>
          <p>
            {productView.mode === "edit"
              ? "Update the details of your product below."
              : "List a new item in your catalog."}
          </p>
        </div>

        <button
          className="back-to-products-btn"
          onClick={() => setProductView(null)}
        >
          <ArrowLeft size={16} />
          Back to Products
        </button>
      </div>
    )}

    {productView && (
      <ProductForm
        key={productView.mode === "edit" ? productView.product._id : "add"}
        mode={productView.mode}
        productId={productView.product?._id}
        initialProduct={productView.product}
        onSuccess={handleProductFormSuccess}
        onCancel={() => setProductView(null)}
      />
    )}

    {!productView && (<>

    {/* PRODUCT HEADER */}

    <div className="seller-page-heading">

      <div>
        <h2>Products</h2>

        <p>
          Manage the products available in your store.
        </p>
      </div>

      <button
        className="primary-action"
        onClick={() => setProductView({ mode: "add" })}
      >
        <PlusCircle size={18} />
        Add Product
      </button>

    </div>


    {/* PRODUCT SUMMARY CARDS */}

    <div className="product-summary-grid">

      {/* TOTAL PRODUCTS */}

      <div className="product-summary-card">

        <div className="product-summary-icon total-products">
          <Package size={22} />
        </div>

        <div>
          <p>Total Products</p>
          <h3>{totalProducts}</h3>
        </div>

      </div>


      {/* LOW STOCK */}

      <div className="product-summary-card">

        <div className="product-summary-icon low-stock">
          <Package size={22} />
        </div>

        <div>
          <p>Low Stock</p>
          <h3>{lowStockProducts}</h3>
        </div>

      </div>


      {/* OUT OF STOCK */}

      <div className="product-summary-card">

        <div className="product-summary-icon out-stock">
          <Package size={22} />
        </div>

        <div>
          <p>Out of Stock</p>
          <h3>{outOfStockProducts}</h3>
        </div>

      </div>

    </div>



    {/* ==================================================
        PRODUCT TABLE
    ================================================== */}

    <div className="products-table-card">

      <div className="products-table-header">

        <div>

          <h3>My Products</h3>

          <p>
            Products added to your Shoppea store.
          </p>

        </div>

      </div>


      {products.length === 0 ? (

        /* EMPTY STATE */

        <div className="product-empty-state">

          <Package size={45} />

          <h3>No Products Yet</h3>

          <p>
            Add your first product to start selling
            on Shoppea.
          </p>

          <button
            className="primary-action"
            onClick={() => setProductView({ mode: "add" })}
          >
            <PlusCircle size={18} />
            Add Product
          </button>

        </div>

      ) : (

        /* PRODUCT TABLE */

        <div className="products-table-wrapper">

          <table className="products-table">

            <thead>

              <tr>

                <th>Image</th>
                <th>Product</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Action</th>

              </tr>

            </thead>


            <tbody>

              {products.map((product) => {

                let stockStatus = "In Stock";

                if (product.stock === 0) {
                  stockStatus = "Out of Stock";
                } else if (product.stock <= 5) {
                  stockStatus = "Low Stock";
                }

                return (

                  <tr key={product._id}>

                    {/* IMAGE */}

                    <td>

                      <div className="product-table-image">

                        {product.image ? (

                          <img
                            src={product.image}
                            alt={product.name}
                          />

                        ) : (

                          <Package size={22} />

                        )}

                      </div>

                    </td>


                    {/* PRODUCT */}

                    <td>

                      <div className="product-table-name">

                        <strong>
                          {product.name}
                        </strong>

                        <span>
                          {product.category}
                        </span>

                      </div>

                    </td>


                    {/* PRICE */}

                    <td>
                      {product.discountType && product.discountType !== "none" && product.discountValue > 0 ? (
                        <div className="price-with-discount">
                          <strong>Rs. {product.finalPrice?.toLocaleString()}</strong>
                          <span className="price-strike">
                            Rs. {product.price.toLocaleString()}
                          </span>
                          <span className="discount-chip">
                            {product.discountType === "percentage"
                              ? `${product.discountValue}% OFF`
                              : `Rs.${product.discountValue} OFF`}
                          </span>
                        </div>
                      ) : (
                        `Rs. ${product.price.toLocaleString()}`
                      )}
                    </td>


                    {/* STOCK */}

                    <td>

                      <div className="stock-info">

                        <strong>
                          {product.stock}
                        </strong>

                        <span
                          className={`stock-status ${
                            stockStatus
                              .toLowerCase()
                              .replaceAll(" ", "-")
                          }`}
                        >
                          {stockStatus}
                        </span>

                      </div>

                    </td>


                    {/* STATUS */}

                 <td>
  <span
    className={`product-status ${
      product.available ? "active" : "inactive"
    }`}
  >
    {product.available ? "Active" : "Inactive"}
  </span>
</td>


                    {/* ACTION */}

                    <td>
  <button
    className="edit-product-button"
    onClick={() => setProductView({ mode: "edit", product })}
  >
    Edit
  </button>

  <button
    className="delete-product-button"
    onClick={() => handleDeleteProduct(product._id)}
  >
    Delete
  </button>
</td>

                  </tr>

                );

              })}

            </tbody>

          </table>

        </div>

      )}

    </div>

    </>)}

  </div>

)}

          {/* ==================================================
              ORDERS
          ================================================== */}

          {activePage === "Orders" && (

  <div className="seller-page">

    <div className="seller-page-heading">
      <div>
        <h2>Orders</h2>
        <p>View and manage customer orders.</p>
      </div>
    </div>

    {!ordersLoading && orders.length > 0 && (
      <div className="order-status-summary">
        {["pending", "processing", "shipped", "delivered", "cancelled"].map(
          (status) => {
            const count = allItems.filter((i) => i.status === status).length;
            return (
              <div className={`order-status-chip status-${status}`} key={status}>
                <span className="order-status-count">{count}</span>
                <span className="order-status-label">{status}</span>
              </div>
            );
          }
        )}
      </div>
    )}

    {ordersLoading ? (
      <div className="orders-empty-state">
        <p>Loading orders...</p>
      </div>
    ) : orders.length === 0 ? (
      <div className="orders-empty-state">
        <ShoppingCart size={45} />

        <h3>No Orders Yet</h3>

        <p>
          Customer orders will appear here after customers
          purchase your products.
        </p>
      </div>
    ) : (
      <div className="seller-orders-list">
        {orders.map((order) => (
          <div className="seller-order-card" key={order._id}>

            <div className="seller-order-header">
              <div>
                <strong>#{order._id.slice(-6).toUpperCase()}</strong>
                <span className="seller-order-date">
                  {new Date(order.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div className="seller-order-customer">
                <span>{order.customer?.name}</span>
                <small>{order.customer?.phone || order.customer?.email}</small>
              </div>

              <span
                className={`seller-order-payment ${
                  order.paymentStatus === "paid" ? "paid" : "pending"
                }`}
              >
                {order.paymentStatus}
              </span>
            </div>

            <div className="seller-order-items">
              {order.items.map((item) => (
                <div className="seller-order-item" key={item._id}>

                  <img
                    src={item.product?.image}
                    alt={item.product?.name}
                  />

                  <div className="seller-order-item-info">
                    <p>{item.product?.name}</p>
                    <span>
                      Qty {item.quantity} · Rs. {item.price * item.quantity}
                    </span>
                  </div>

                  <span className={`order-item-status-pill status-${item.status}`}>
                    {item.status}
                  </span>

                  <select
                    className="order-item-status-select"
                    value={item.status}
                    onChange={(e) =>
                      handleItemStatusChange(
                        order._id,
                        item._id,
                        e.target.value
                      )
                    }
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>

                </div>
              ))}
            </div>

          </div>
        ))}
      </div>
    )}

  </div>
)}


          {/* ==================================================
              PAYMENTS
          ================================================== */}

         {activePage === "Payments" && (
  <div className="seller-page">

    <div className="seller-page-heading">
      <div>
        <h2>Payments</h2>
        <p>Track your earnings and payment history.</p>
      </div>
    </div>

    {/* Payment Summary */}
    <div className="payment-summary-grid">

      <div className="payment-summary-card">
        <div className="payment-summary-icon earnings-icon">
          <TrendingUp size={22} />
        </div>

        <div>
          <p>Total Earnings</p>
          <h3>Rs. {totalEarnings.toLocaleString()}</h3>
        </div>
      </div>

      <div className="payment-summary-card">
        <div className="payment-summary-icon pending-payment-icon">
          <CreditCard size={22} />
        </div>

        <div>
          <p>Pending Payment</p>
          <h3>Rs. {pendingEarnings.toLocaleString()}</h3>
        </div>
      </div>

      <div className="payment-summary-card">
        <div className="payment-summary-icon fee-icon">
          <CreditCard size={22} />
        </div>

        <div>
          <p>Shoppea Fee</p>
          <h3>Rs. 0</h3>
        </div>
      </div>

    </div>

    {/* Payment History */}
    <div className="payments-table-card">

      <div className="payments-table-header">
        <div>
          <h3>Payment History</h3>
          <p>Your earnings from completed orders.</p>
        </div>
      </div>

      {allItems.length === 0 ? (
        <div className="payments-empty-state">
          <CreditCard size={45} />

          <h3>No Payments Yet</h3>

          <p>
            Your payment history will appear here after
            customers purchase your products.
          </p>
        </div>
      ) : (
        <div className="products-table-wrapper">
          <table className="products-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Product</th>
                <th>Amount</th>
                <th>Payment Status</th>
              </tr>
            </thead>
            <tbody>
              {allItems.map((item) => (
                <tr key={item._id}>
                  <td>#{item.order._id.slice(-6).toUpperCase()}</td>
                  <td>{item.product?.name}</td>
                  <td>Rs. {item.price * item.quantity}</td>
                  <td>
                    <span
                      className={`product-status ${
                        item.order.paymentStatus === "paid"
                          ? "active"
                          : "inactive"
                      }`}
                    >
                      {item.order.paymentStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>

  </div>
)}


          {/* ==================================================
              REVIEWS
          ================================================== */}

        {activePage === "Reviews" && (
  <div className="seller-page">

    <div className="seller-page-heading">
      <div>
        <h2>Reviews</h2>
        <p>See what customers think about your products.</p>
      </div>
    </div>

    {/* Rating Summary */}
    <div className="reviews-summary-card">

      <div className="overall-rating">
        <h3>{avgRating.toFixed(1)}</h3>

        <div className="rating-stars">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              size={20}
              fill={n <= Math.round(avgRating) ? "#f5b942" : "none"}
              color="#f5b942"
            />
          ))}
        </div>

        <p>{reviews.length === 0 ? "No ratings yet" : `${reviews.length} ratings`}</p>
      </div>

      <div className="rating-breakdown">

        {[5, 4, 3, 2, 1].map((star, i) => (
          <div className="rating-row" key={star}>
            <span>{star} Stars</span>
            <div className="rating-bar">
              <div
                className="rating-bar-fill"
                style={{
                  width: reviews.length
                    ? `${(ratingCounts[i] / reviews.length) * 100}%`
                    : "0%",
                }}
              ></div>
            </div>
            <span>{ratingCounts[i]}</span>
          </div>
        ))}

      </div>

    </div>

    {/* Customer Reviews */}
    <div className="reviews-list-card">

      <div className="reviews-list-header">
        <div>
          <h3>Customer Reviews</h3>
          <p>Reviews submitted by customers.</p>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="reviews-empty-state">
          <Star size={45} />

          <h3>No Reviews Yet</h3>

          <p>
            Customer reviews will appear here after customers
            purchase and review your products.
          </p>
        </div>
      ) : (
        <div className="products-table-wrapper">
          <table className="products-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Customer</th>
                <th>Rating</th>
                <th>Comment</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((review) => (
                <tr key={review._id}>
                  <td>{review.product?.name}</td>
                  <td>{review.customer?.name}</td>
                  <td>{"★".repeat(review.rating)}</td>
                  <td>{review.comment || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>

  </div>
)}


          {/* ==================================================
              PROFILE
          ================================================== */}

         {activePage === "Profile" && (
  <div className="seller-page">

    <div className="seller-page-heading">
      <div>
        <h2>Profile</h2>
        <p>Manage your store and account information.</p>
      </div>
    </div>

    {/* Profile Information */}
    <div className="profile-card">

      <div className="profile-card-header">
        <div>
          <h3>Store Information</h3>
          <p>Update your store and personal information.</p>
        </div>

        {!isEditingProfile && (
          <button
            className="profile-edit-button"
            onClick={() => setIsEditingProfile(true)}
          >
            <User size={16} />
            Edit Profile
          </button>
        )}
      </div>

      <div className="profile-form">

        <div className="profile-form-row">

          <div className="profile-form-group">
            <label>Store Name</label>
            <input
              type="text"
              name="storeName"
              value={profileData.storeName}
              onChange={handleProfileChange}
              disabled={!isEditingProfile}
            />
          </div>

          <div className="profile-form-group">
            <label>Seller Name</label>
            <input
              type="text"
              name="sellerName"
              value={profileData.sellerName}
              onChange={handleProfileChange}
              disabled={!isEditingProfile}
            />
          </div>

        </div>

        <div className="profile-form-row">

          <div className="profile-form-group">
            <label>Email Address</label>
            <input
              type="email"
              name="email"
              value={profileData.email}
              disabled
            />
            <small>Email cannot be changed.</small>
          </div>

          <div className="profile-form-group">
            <label>Phone Number</label>
            <input
              type="text"
              name="phone"
              value={profileData.phone}
              onChange={handleProfileChange}
              disabled={!isEditingProfile}
            />
          </div>

        </div>

        <div className="profile-form-group">
          <label>Business Address</label>
          <textarea
            name="address"
            value={profileData.address}
            onChange={handleProfileChange}
            disabled={!isEditingProfile}
            rows="3"
          />
        </div>

        <div className="profile-form-row">

          <div className="profile-form-group">
            <label>PAN / VAT Number</label>
            <input
              type="text"
              name="panVat"
              value={profileData.panVat}
              disabled
            />
            <small>PAN/VAT cannot be changed after verification.</small>
          </div>

          <div className="profile-form-group">
            <label>Verification Status</label>
            <div className={`verification-status ${verificationStatus.toLowerCase()}`}>
  {verificationStatus === "Pending" && "Pending Verification"}
  {verificationStatus === "Approved" && "✓ Verified Seller"}
  {verificationStatus === "Rejected" && "✕ Verification Rejected"}
</div>
          </div>

        </div>

        {isEditingProfile && (
          <div className="profile-form-actions">

            <button
              className="profile-cancel-button"
              onClick={handleCancelProfile}
            >
              Cancel
            </button>

            <button
              className="profile-save-button"
              onClick={handleSaveProfile}
            >
              Save Changes
            </button>

          </div>
        )}

      </div>
    </div>

    {/* Change Password */}
    <div className="profile-card password-card">

      <div className="profile-card-header">
        <div>
          <h3>Change Password</h3>
          <p>Update your password to keep your account secure.</p>
        </div>
      </div>

      <div className="profile-form">

        <div className="profile-form-group">
          <label>Current Password</label>
          <input
            type="password"
            value={passwordData.currentPassword}
            onChange={(e) =>
              setPasswordData({
                ...passwordData,
                currentPassword: e.target.value,
              })
            }
            placeholder="Enter current password"
          />
        </div>

        <div className="profile-form-row">

          <div className="profile-form-group">
            <label>New Password</label>
            <input
              type="password"
              value={passwordData.newPassword}
              onChange={(e) =>
                setPasswordData({
                  ...passwordData,
                  newPassword: e.target.value,
                })
              }
              placeholder="Enter new password"
            />
          </div>

          <div className="profile-form-group">
            <label>Confirm New Password</label>
            <input
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) =>
                setPasswordData({
                  ...passwordData,
                  confirmPassword: e.target.value,
                })
              }
              placeholder="Confirm new password"
            />
          </div>

        </div>

        <button
          className="profile-save-button password-button"
          onClick={handleChangePassword}
        >
          Change Password
        </button>

      </div>
    </div>

  </div>
)}

        </section>

      </main>

    </div>
  );
};

export default SellerDashboard;