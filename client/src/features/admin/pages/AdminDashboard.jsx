import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  CreditCard,
  Package,
  Tags,
  Users,
  Store,
  ChevronUp,
  ChevronDown,
  Menu,
  LogOut,
} from "lucide-react";
import api from "../../../api/axios";
import "./AdminDashboard.css";

const AdminDashboard = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/admin/login");
  };

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSellers: 0,
    totalProducts: 0,
    totalOrders: 0,
  });

  const [activeSection, setActiveSection] = useState("dashboard");

  const [sellers, setSellers] = useState([]);
  const [loadingSellers, setLoadingSellers] = useState(false);

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [dashboardError, setDashboardError] = useState("");

  const [openSales, setOpenSales] = useState(true);
  const [openCatalog, setOpenCatalog] = useState(true);
  const [openUsers, setOpenUsers] = useState(true);

  const fetchSellers = async () => {
    try {
      setLoadingSellers(true);
      setDashboardError("");
      const { data } = await api.get("/admin/sellers");
      setSellers(data);
    } catch (error) {
      console.error("Sellers error:", error);
      setDashboardError(error.response?.data?.message || "Unable to load sellers.");
    } finally {
      setLoadingSellers(false);
    }
  };

  const handleApproveSeller = async (id) => {
    try {
      await api.patch(`/admin/sellers/${id}/approve`);
      alert("Seller approved successfully!");
      fetchSellers();
    } catch (error) {
      console.error("Approve seller error:", error);
      alert(error.response?.data?.message || "Failed to approve seller");
    }
  };

  const handleRejectSeller = async (id) => {
    try {
      await api.patch(`/admin/sellers/${id}/reject`);
      alert("Seller rejected successfully!");
      fetchSellers();
    } catch (error) {
      console.error("Reject seller error:", error);
      alert(error.response?.data?.message || "Failed to reject seller");
    }
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      setDashboardError("");
      const { data } = await api.get("/admin/users");
      setUsers(data);
    } catch (error) {
      console.error("Users error:", error);
      setDashboardError(error.response?.data?.message || "Unable to load users.");
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleToggleBlock = async (id) => {
    try {
      await api.patch(`/admin/users/${id}/block`);
      fetchUsers();
    } catch (error) {
      console.error("Toggle block error:", error);
      alert(error.response?.data?.message || "Failed to update user");
    }
  };

  const fetchOrders = async () => {
    try {
      setLoadingOrders(true);
      setDashboardError("");
      const { data } = await api.get("/admin/orders");
      setOrders(data);
    } catch (error) {
      console.error("Orders error:", error);
      setDashboardError(error.response?.data?.message || "Unable to load orders.");
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleUpdatePayment = async (orderId, paymentStatus) => {
    try {
      await api.patch(`/admin/orders/${orderId}/payment`, {
        paymentStatus,
      });
      fetchOrders();
    } catch (error) {
      console.error("Update payment error:", error);
      alert(error.response?.data?.message || "Failed to update payment");
    }
  };

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      setDashboardError("");
      const { data } = await api.get("/admin/products");
      setProducts(data);
    } catch (error) {
      console.error("Products error:", error);
      setDashboardError(error.response?.data?.message || "Unable to load products.");
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleAdminDeleteProduct = async (id) => {
    if (!window.confirm("Remove this product from the marketplace?")) return;

    try {
      await api.delete(`/admin/products/${id}`);
      fetchProducts();
    } catch (error) {
      console.error("Delete product error:", error);
      alert(error.response?.data?.message || "Failed to remove product");
    }
  };

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setDashboardError("");
        const { data } = await api.get("/admin/stats");
        setStats(data);
      } catch (error) {
        console.error("Dashboard stats error:", error);
        setDashboardError(
          error.response?.data?.message || "Unable to load dashboard data."
        );

        if (error.response?.status === 401 || error.response?.status === 403) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/admin/login", { replace: true });
        }
      }
    };

    fetchDashboardStats();
  }, [navigate]);

  useEffect(() => {
    if (activeSection === "sellers") {
      fetchSellers();
    } else if (activeSection === "users") {
      fetchUsers();
    } else if (activeSection === "orders" || activeSection === "payments") {
      fetchOrders();
    } else if (activeSection === "products" || activeSection === "categories") {
      fetchProducts();
    }
  }, [activeSection]);



  const renderContent = () => {
    switch (activeSection) {
      case "orders":
        return (
          <div className="section-content">
            <div className="section-header">
              <div>
                <h1>Orders</h1>
                <p>All orders placed across the marketplace.</p>
              </div>
            </div>

            <div className="seller-table-card">
              {loadingOrders ? (
                <div className="seller-loading">Loading orders...</div>
              ) : orders.length === 0 ? (
                <div className="seller-empty">
                  <ShoppingCart size={45} />
                  <h3>No Orders Yet</h3>
                  <p>Orders will appear here once customers start buying.</p>
                </div>
              ) : (
                <div className="seller-table-wrapper">
                  <table className="seller-table">
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Customer</th>
                        <th>Items</th>
                        <th>Total</th>
                        <th>Payment</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order._id}>
                          <td>#{order._id.slice(-6).toUpperCase()}</td>
                          <td>{order.customer?.name}</td>
                          <td>{order.items.length}</td>
                          <td>Rs. {order.totalAmount}</td>
                          <td>
                            <span
                              className={`seller-status ${
                                order.paymentStatus === "paid"
                                  ? "approved"
                                  : "pending"
                              }`}
                            >
                              {order.paymentStatus}
                            </span>
                          </td>
                          <td>
                            {new Date(order.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );

      case "payments": {
        const totalRevenue = orders
          .filter((o) => o.paymentStatus === "paid")
          .reduce((sum, o) => sum + o.totalAmount, 0);

        const pendingPayments = orders.filter(
          (o) => o.paymentStatus !== "paid"
        );

        return (
          <div className="section-content">
            <div className="section-header">
              <div>
                <h1>Payments</h1>
                <p>Track and override payment status across orders.</p>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">
                  <CreditCard size={24} />
                </div>
                <div>
                  <p>Total Revenue Collected</p>
                  <h2>Rs. {totalRevenue.toLocaleString()}</h2>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">
                  <CreditCard size={24} />
                </div>
                <div>
                  <p>Orders Awaiting Payment</p>
                  <h2>{pendingPayments.length}</h2>
                </div>
              </div>
            </div>

            <div className="seller-table-card">
              {loadingOrders ? (
                <div className="seller-loading">Loading payments...</div>
              ) : orders.length === 0 ? (
                <div className="seller-empty">
                  <CreditCard size={45} />
                  <h3>No Payments Yet</h3>
                </div>
              ) : (
                <div className="seller-table-wrapper">
                  <table className="seller-table">
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Customer</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order._id}>
                          <td>#{order._id.slice(-6).toUpperCase()}</td>
                          <td>{order.customer?.name}</td>
                          <td>Rs. {order.totalAmount}</td>
                          <td>
                            <span
                              className={`seller-status ${
                                order.paymentStatus === "paid"
                                  ? "approved"
                                  : "pending"
                              }`}
                            >
                              {order.paymentStatus}
                            </span>
                          </td>
                          <td>
                            <select
                              value={order.paymentStatus}
                              onChange={(e) =>
                                handleUpdatePayment(order._id, e.target.value)
                              }
                            >
                              <option value="pending">Pending</option>
                              <option value="paid">Paid</option>
                              <option value="failed">Failed</option>
                              <option value="refunded">Refunded</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );
      }

      case "products":
        return (
          <div className="section-content">
            <div className="section-header">
              <div>
                <h1>Products</h1>
                <p>Moderate products listed across all stores.</p>
              </div>
            </div>

            <div className="seller-table-card">
              {loadingProducts ? (
                <div className="seller-loading">Loading products...</div>
              ) : products.length === 0 ? (
                <div className="seller-empty">
                  <Package size={45} />
                  <h3>No Products Yet</h3>
                </div>
              ) : (
                <div className="seller-table-wrapper">
                  <table className="seller-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Store</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Stock</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((product) => (
                        <tr key={product._id}>
                          <td>{product.name}</td>
                          <td>{product.store}</td>
                          <td>{product.category}</td>
                          <td>Rs. {product.price}</td>
                          <td>{product.stock}</td>
                          <td>
                            <span
                              className={`seller-status ${
                                product.available ? "approved" : "rejected"
                              }`}
                            >
                              {product.available ? "active" : "inactive"}
                            </span>
                          </td>
                          <td>
                            <button
                              className="reject-button"
                              onClick={() =>
                                handleAdminDeleteProduct(product._id)
                              }
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );

      case "categories": {
        const categoryOrder = [
          "dresses",
          "formals",
          "tops",
          "bottoms",
          "shoes",
          "accessories",
        ];

        const counts = categoryOrder.map(
          (cat) => products.filter((p) => p.category === cat).length
        );

        return (
          <div className="section-content">
            <div className="section-header">
              <div>
                <h1>Categories</h1>
                <p>Product distribution across categories.</p>
              </div>
            </div>

            <div className="stats-grid">
              {categoryOrder.map((cat, i) => (
                <div className="stat-card" key={cat}>
                  <div className="stat-icon">
                    <Tags size={24} />
                  </div>
                  <div>
                    <p style={{ textTransform: "capitalize" }}>{cat}</p>
                    <h2>{counts[i]}</h2>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case "users":
        return (
          <div className="section-content">
            <div className="section-header">
              <div>
                <h1>Users</h1>
                <p>Manage registered customer accounts.</p>
              </div>
            </div>

            <div className="seller-table-card">
              {loadingUsers ? (
                <div className="seller-loading">Loading users...</div>
              ) : users.length === 0 ? (
                <div className="seller-empty">
                  <Users size={45} />
                  <h3>No Users Found</h3>
                </div>
              ) : (
                <div className="seller-table-wrapper">
                  <table className="seller-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u._id}>
                          <td>{u.name}</td>
                          <td>{u.email}</td>
                          <td>{u.phone || "-"}</td>
                          <td>
                            <span
                              className={`seller-status ${
                                u.isBlocked ? "rejected" : "approved"
                              }`}
                            >
                              {u.isBlocked ? "blocked" : "active"}
                            </span>
                          </td>
                          <td>
                            <button
                              className={
                                u.isBlocked
                                  ? "approve-button"
                                  : "reject-button"
                              }
                              onClick={() => handleToggleBlock(u._id)}
                            >
                              {u.isBlocked ? "Unblock" : "Block"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );

    case "sellers":
  return (
    <div className="section-content">
      <div className="section-header">
        <div>
          <h1>Sellers</h1>
          <p>Review and manage seller registrations.</p>
        </div>
      </div>

      <div className="seller-table-card">

        {loadingSellers ? (
          <div className="seller-loading">
            Loading sellers...
          </div>
        ) : sellers.length === 0 ? (
          <div className="seller-empty">
            <Store size={45} />
            <h3>No Sellers Found</h3>
            <p>
              Seller registrations will appear here after sellers
              create their accounts.
            </p>
          </div>
        ) : (
          <div className="seller-table-wrapper">
            <table className="seller-table">
              <thead>
                <tr>
                  <th>Store</th>
                  <th>Seller</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>PAN/VAT</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {sellers.map((seller) => (
                  <tr key={seller._id}>
                    <td>{seller.storeName || "-"}</td>

                    <td>{seller.name}</td>

                    <td>{seller.email}</td>

                    <td>{seller.phone || "-"}</td>

                    <td>{seller.panVat || "-"}</td>

                    <td>
                      <span
                        className={`seller-status ${seller.sellerStatus}`}
                      >
                        {seller.sellerStatus}
                      </span>
                    </td>

                    <td>
                      {seller.sellerStatus === "pending" ? (
                        <div className="seller-actions">

                          <button
                            className="approve-button"
                            onClick={() =>
                              handleApproveSeller(seller._id)
                            }
                          >
                            Approve
                          </button>

                          <button
                            className="reject-button"
                            onClick={() =>
                              handleRejectSeller(seller._id)
                            }
                          >
                            Reject
                          </button>

                        </div>
                      ) : (
                        <span className="no-action">
                          No action
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );

      default:
        return (
          <div className="dashboard-content">

            <div className="dashboard-header">
              <div>
                <h1>Dashboard</h1>
                <p>Welcome to the Shoppea Admin Panel.</p>
              </div>
            </div>

            <div className="stats-grid">

              <div className="stat-card">
                <div className="stat-icon">
                  <Users size={24} />
                </div>

                <div>
                  <p>Total Users</p>
                  <h2>{stats.totalUsers}</h2>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">
                  <Store size={24} />
                </div>

                <div>
                  <p>Total Sellers</p>
                  <h2>{stats.totalSellers}</h2>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">
                  <Package size={24} />
                </div>

                <div>
                  <p>Total Products</p>
                  <h2>{stats.totalProducts}</h2>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">
                  <ShoppingCart size={24} />
                </div>

                <div>
                  <p>Total Orders</p>
                 <h2>{stats.totalOrders}</h2>
                </div>
              </div>

            </div>

            <div className="chart-card">
              <h2>Orders Over Last 7 Days</h2>

              <div className="empty-chart">
                <p>Order statistics will appear here.</p>
              </div>
            </div>

          </div>
        );
    }
  };

  return (
    <div className="admin-layout">

      {/* Sidebar */}
      <aside className="admin-sidebar">

        <div className="admin-logo">
          <h2>SHOPPEA</h2>
          <span>Admin Panel</span>
        </div>

        <div className="sidebar-menu">

          {/* Dashboard */}
          <button
            className={`sidebar-item ${
              activeSection === "dashboard" ? "active" : ""
            }`}
            onClick={() => setActiveSection("dashboard")}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </button>


          {/* Sales & Transactions */}
          <button
            className="sidebar-section"
            onClick={() => setOpenSales(!openSales)}
          >
            <span>Sales & Transactions</span>

            {openSales ? (
              <ChevronUp size={18} />
            ) : (
              <ChevronDown size={18} />
            )}
          </button>

          {openSales && (
            <div className="sidebar-submenu">

              <button
                className={
                  activeSection === "orders"
                    ? "submenu-item active"
                    : "submenu-item"
                }
                onClick={() => setActiveSection("orders")}
              >
                <ShoppingCart size={18} />
                <span>Orders</span>
              </button>

              <button
                className={
                  activeSection === "payments"
                    ? "submenu-item active"
                    : "submenu-item"
                }
                onClick={() => setActiveSection("payments")}
              >
                <CreditCard size={18} />
                <span>Payments</span>
              </button>

            </div>
          )}


          {/* Catalog */}
          <button
            className="sidebar-section"
            onClick={() => setOpenCatalog(!openCatalog)}
          >
            <span>Catalog</span>

            {openCatalog ? (
              <ChevronUp size={18} />
            ) : (
              <ChevronDown size={18} />
            )}
          </button>

          {openCatalog && (
            <div className="sidebar-submenu">

              <button
                className={
                  activeSection === "products"
                    ? "submenu-item active"
                    : "submenu-item"
                }
                onClick={() => setActiveSection("products")}
              >
                <Package size={18} />
                <span>Products</span>
              </button>

              <button
                className={
                  activeSection === "categories"
                    ? "submenu-item active"
                    : "submenu-item"
                }
                onClick={() => setActiveSection("categories")}
              >
                <Tags size={18} />
                <span>Categories</span>
              </button>

            </div>
          )}


          {/* User Management */}
          <button
            className="sidebar-section"
            onClick={() => setOpenUsers(!openUsers)}
          >
            <span>User Management</span>

            {openUsers ? (
              <ChevronUp size={18} />
            ) : (
              <ChevronDown size={18} />
            )}
          </button>

          {openUsers && (
            <div className="sidebar-submenu">

              <button
                className={
                  activeSection === "users"
                    ? "submenu-item active"
                    : "submenu-item"
                }
                onClick={() => setActiveSection("users")}
              >
                <Users size={18} />
                <span>Users</span>
              </button>

              <button
                className={
                  activeSection === "sellers"
                    ? "submenu-item active"
                    : "submenu-item"
                }
                onClick={() => setActiveSection("sellers")}
              >
                <Store size={18} />
                <span>Sellers</span>
              </button>

            </div>
          )}

        </div>

      </aside>


      {/* Main Content */}
      <main className="admin-main">

        <div className="admin-topbar">
          <div className="mobile-menu">
            <Menu size={22} />
          </div>

          <div className="admin-profile">
            <div className="admin-avatar">
              A
            </div>

            <div>
              <strong>Shoppea Admin</strong>
              <span>Administrator</span>
            </div>
          </div>

          <button className="admin-logout-btn" onClick={handleLogout}>
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>

        {renderContent()}

        {dashboardError && (
          <div className="admin-error" role="alert">
            {dashboardError}
          </div>
        )}

      </main>

    </div>
  );
};

export default AdminDashboard;