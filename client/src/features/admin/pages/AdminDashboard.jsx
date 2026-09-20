import { useEffect, useState } from "react";
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
} from "lucide-react";
import "./AdminDashboard.css";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSellers: 0,
    totalProducts: 0,
    totalOrders: 0,
  });

  const [activeSection, setActiveSection] = useState("dashboard");

  const [sellers, setSellers] = useState([]);
  const [loadingSellers, setLoadingSellers] = useState(false);

  const [openSales, setOpenSales] = useState(true);
  const [openCatalog, setOpenCatalog] = useState(true);
  const [openUsers, setOpenUsers] = useState(true);

  const fetchSellers = async () => {
    try {
      setLoadingSellers(true);

      const response = await fetch(
        "http://localhost:5000/api/admin/sellers"
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch sellers");
      }

      setSellers(data);
    } catch (error) {
      console.error("Sellers error:", error);
    } finally {
      setLoadingSellers(false);
    }
  };

  const handleApproveSeller = async (id) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/admin/sellers/${id}/approve`,
        {
          method: "PATCH",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to approve seller");
      }

      alert("Seller approved successfully!");

      fetchSellers();
    } catch (error) {
      console.error("Approve seller error:", error);
      alert(error.message);
    }
  };

  const handleRejectSeller = async (id) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/admin/sellers/${id}/reject`,
        {
          method: "PATCH",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to reject seller");
      }

      alert("Seller rejected successfully!");

      fetchSellers();
    } catch (error) {
      console.error("Reject seller error:", error);
      alert(error.message);
    }
  };

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const response = await fetch(
          "http://localhost:5000/api/admin/stats"
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Failed to fetch statistics"
          );
        }

        setStats(data);
      } catch (error) {
        console.error("Dashboard stats error:", error);
      }
    };

    fetchDashboardStats();
  }, []);

  useEffect(() => {
    if (activeSection === "sellers") {
      fetchSellers();
    }
  }, [activeSection]);

  

  const renderContent = () => {
    switch (activeSection) {
      case "orders":
        return (
          <div className="section-content">
            <h1>Orders</h1>
            <p>Manage customer orders here.</p>
          </div>
        );

      case "payments":
        return (
          <div className="section-content">
            <h1>Payments</h1>
            <p>Manage payment transactions here.</p>
          </div>
        );

      case "products":
        return (
          <div className="section-content">
            <h1>Products</h1>
            <p>Manage products here.</p>
          </div>
        );

      case "categories":
        return (
          <div className="section-content">
            <h1>Categories</h1>
            <p>Manage product categories here.</p>
          </div>
        );

      case "users":
        return (
          <div className="section-content">
            <h1>Users</h1>
            <p>Manage registered users here.</p>
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
        </div>

        {renderContent()}

      </main>

    </div>
  );
};

export default AdminDashboard;