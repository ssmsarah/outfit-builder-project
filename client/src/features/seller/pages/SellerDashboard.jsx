import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  CreditCard,
  Star,
  User,
  LogOut,
  PlusCircle,
  TrendingUp,
} from "lucide-react";

import logo from "../../../assets/shopea.png";
import "./SellerDashboard.css";

const SellerDashboard = () => {
  const [activePage, setActivePage] = useState("Dashboard");
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
     SAMPLE ORDERS
  ========================= */

  const [orders] = useState([
    {
      id: "ORD-1001",
      customer: "Anisha Sharma",
      date: "Sep 20, 2026",
      amount: 3500,
      payment: "Paid",
      status: "Delivered",
    },
    {
      id: "ORD-1002",
      customer: "Riya Thapa",
      date: "Sep 19, 2026",
      amount: 2200,
      payment: "Pending",
      status: "Processing",
    },
    {
      id: "ORD-1003",
      customer: "Sita KC",
      date: "Sep 18, 2026",
      amount: 4800,
      payment: "Paid",
      status: "Shipped",
    },
    {
      id: "ORD-1004",
      customer: "Priya Gurung",
      date: "Sep 17, 2026",
      amount: 1800,
      payment: "Paid",
      status: "Pending",
    },
  ]);

  /* =========================
     PRODUCT STATES
  ========================= */

  const [showProductForm, setShowProductForm] = useState(false);
const [products, setProducts] = useState([]);
const [editingProductId, setEditingProductId] = useState(null);
const [error, setError] = useState("");

useEffect(() => {
  const fetchMyProducts = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        setError("Please log in again.");
        return;
      }

      const response = await fetch(
        "http://localhost:5000/api/products/my-products",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch products");
      }

      setProducts(data);
    } catch (error) {
      console.error("Products error:", error);
      setError(error.message);
    }
  };

  fetchMyProducts();
}, []);

const [productForm, setProductForm] = useState({
  name: "",
  category: "",
  description: "",
  price: "",
  stock: "",
  image: "",
  size: "",
  color: "",
  status: "Active",
});

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
     PRODUCT FORM HANDLERS
  ========================= */

  const handleProductChange = (e) => {
    const { name, value } = e.target;

    setProductForm({
      ...productForm,
      [name]: value,
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];

    if (file) {
      setProductForm({
        ...productForm,
        image: URL.createObjectURL(file),
      });
    }
  };

const handleAddProduct = async (e) => {
  e.preventDefault();

  try {
    const token = localStorage.getItem("token");

    if (!token) {
      setError("Please log in again.");
      return;
    }

    const response = await fetch(
      "http://localhost:5000/api/products",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: productForm.name,
          category: productForm.category.toLowerCase(),
          description: productForm.description,
          price: Number(productForm.price),
          stock: Number(productForm.stock),
          image: productForm.image || "https://via.placeholder.com/150",
          sizes: productForm.size
            ? productForm.size
                .split(",")
                .map((size) => size.trim())
            : [],
          colors: productForm.color
            ? productForm.color
                .split(",")
                .map((color) => color.trim())
            : [],
          available: productForm.status === "Active",
         
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Failed to add product"
      );
    }

    // Add the product returned from MongoDB
    setProducts((prevProducts) => [
      ...prevProducts,
      data,
    ]);
    alert("Product added successfully!");

    // Clear form
    setProductForm({
      name: "",
      category: "",
      description: "",
      price: "",
      stock: "",
      image: "",
      size: "",
      color: "",
      status: "Active",
    });

    setShowProductForm(false);
    setError("");

    alert("Product added successfully!");
  } catch (error) {
    console.error("Add product error:", error);
    setError(error.message);
  }
};

const handleDeleteProduct = async (id) => {
  try {
    const token = localStorage.getItem("token");

    console.log("Deleting product ID:", id);
    console.log("Token exists:", !!token);

    const response = await fetch(
      `http://localhost:5000/api/products/${id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log("Delete HTTP status:", response.status);

    const data = await response.json();

    console.log("Delete backend response:", data);

    if (!response.ok) {
      throw new Error(data.message || "Failed to delete product");
    }

    setProducts((prevProducts) =>
      prevProducts.filter((product) => product._id !== id)
    );

    alert("Product deleted successfully!");
  } catch (error) {
    console.error("Delete product error:", error);
    setError(error.message);
  }
};

const handleEditProduct = (product) => {
  setEditingProductId(product._id);

  setProductForm({
    name: product.name || "",
    category: product.category
      ? product.category.charAt(0).toUpperCase() +
        product.category.slice(1)
      : "",
    description: product.description || "",
    price: product.price ?? "",
    stock: product.stock ?? "",
    image: product.image || "",
    size: product.sizes ? product.sizes.join(", ") : "",
    color: product.colors ? product.colors.join(", ") : "",
    status: product.available ? "Active" : "Inactive",
  });

  setShowProductForm(true);
};

const handleUpdateProduct = async (e) => {
  e.preventDefault();

  try {
    const token = localStorage.getItem("token");

    if (!token) {
      setError("Please log in again.");
      return;
    }

    const response = await fetch(
      `http://localhost:5000/api/products/${editingProductId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: productForm.name,
          category: productForm.category.toLowerCase(),
          description: productForm.description,
          price: Number(productForm.price),
          stock: Number(productForm.stock),
          image: productForm.image,
          sizes: productForm.size
            ? productForm.size.split(",").map((size) => size.trim())
            : [],
          colors: productForm.color
            ? productForm.color.split(",").map((color) => color.trim())
            : [],
          available: productForm.status === "Active",
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Failed to update product"
      );
    }

    setProducts((prevProducts) =>
      prevProducts.map((product) =>
        product._id === editingProductId
          ? data.product
          : product
      )
    );

    setEditingProductId(null);

    setProductForm({
      name: "",
      category: "",
      description: "",
      price: "",
      stock: "",
      image: "",
      size: "",
      color: "",
      status: "Active",
    });

    setShowProductForm(false);
    setError("");

    alert("Product updated successfully!");
  } catch (error) {
    console.error("Update product error:", error);
    setError(error.message);
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
              setShowProductForm(true);
            }}
          >

            <PlusCircle size={20} />

            <span>Add New Product</span>

          </button>


          <button className="seller-logout">

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
    {user?.storeName?.charAt(0).toUpperCase() || "S"}
  </div>

  <div>
    <strong>{user?.storeName || "Seller"}</strong>
    <span>Shoppea</span>
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

                  <h2>Rs. 0</h2>

                </div>


                {/* ORDERS */}

                <div className="seller-stat-card">

                  <div className="stat-icon orders-icon">

                    <ShoppingCart size={23} />

                  </div>

                  <p>Total Orders</p>

                  <h2>0</h2>

                </div>


                {/* PRODUCTS */}

                <div className="seller-stat-card">

                  <div className="stat-icon products-icon">

                    <Package size={23} />

                  </div>

                  <p>Active Products</p>

                  <h2>0</h2>

                </div>


                {/* RATING */}

                <div className="seller-stat-card">

                  <div className="stat-icon rating-icon">

                    <Star size={23} />

                  </div>

                  <p>Avg Rating</p>

                  <div className="rating-value">

                    <h2>0.00</h2>

                    <span>/ 5.0</span>

                  </div>

                  <small>0 reviews</small>

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
    setEditingProductId(null);
    setActivePage("Products");
    setShowProductForm(true);
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
        onClick={() => setShowProductForm(true)}
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
        ADD PRODUCT FORM
    ================================================== */}

    {showProductForm && (

      <div className="product-form-card">

        <div className="product-form-header">

          <div>
            <h3>
  {editingProductId ? "Edit Product" : "Add New Product"}
</h3>

            <p>
  {editingProductId
    ? "Update the details of your product below."
    : "Add the details of your product below."}
</p>
          </div>

          <button
  className="close-product-form"
  onClick={() => {
    setEditingProductId(null);
    setShowProductForm(false);
  }}
>
  ×
</button>

        </div>


        <form
  onSubmit={
    editingProductId
      ? handleUpdateProduct
      : handleAddProduct
  }
>

          {/* PRODUCT NAME */}

          <div className="product-form-group">

            <label>Product Name</label>

            <input
              type="text"
              name="name"
              placeholder="Enter product name"
              value={productForm.name}
              onChange={handleProductChange}
              required
            />

          </div>


          {/* CATEGORY */}

          <div className="product-form-group">

            <label>Category</label>

            <select
              name="category"
              value={productForm.category}
              onChange={handleProductChange}
              required
            >

              <option value="">
                Select category
              </option>

              <option value="Dresses">
                Dresses
              </option>

              <option value="Tops">
                Tops
              </option>

              <option value="Bottoms">
                Bottoms
              </option>

              <option value="Formals">
                Formals
              </option>

              <option value="Shoes">
                Shoes
              </option>

              <option value="Accessories">
                Accessories
              </option>

            </select>

          </div>


          {/* DESCRIPTION */}

          <div className="product-form-group">

            <label>Description</label>

            <textarea
              name="description"
              placeholder="Enter product description"
              value={productForm.description}
              onChange={handleProductChange}
              rows="4"
              required
            />

          </div>


          {/* PRICE + STOCK */}

          <div className="product-form-row">

            <div className="product-form-group">

              <label>Price (Rs.)</label>

              <input
                type="number"
                name="price"
                placeholder="Enter price"
                min="0"
                value={productForm.price}
                onChange={handleProductChange}
                required
              />

            </div>


            <div className="product-form-group">

              <label>Stock Quantity</label>

              <input
                type="number"
                name="stock"
                placeholder="Enter stock quantity"
                min="0"
                value={productForm.stock}
                onChange={handleProductChange}
                required
              />

            </div>

          </div>


          {/* PRODUCT IMAGE */}

          <div className="product-form-group">

            <label>Product Image</label>

            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
             required={!editingProductId}
            />

            {productForm.image && (

              <div className="image-preview">

                <img
                  src={productForm.image}
                  alt="Product preview"
                />

              </div>

            )}

          </div>


          {/* SIZE + COLOR */}

          <div className="product-form-row">

            <div className="product-form-group">

              <label>Size</label>

              <input
                type="text"
                name="size"
                placeholder="e.g. S, M, L, XL"
                value={productForm.size}
                onChange={handleProductChange}
              />

            </div>


            <div className="product-form-group">

              <label>Color</label>

              <input
                type="text"
                name="color"
                placeholder="e.g. Black, White"
                value={productForm.color}
                onChange={handleProductChange}
              />

            </div>

          </div>


          {/* PRODUCT STATUS */}

          <div className="product-form-group">

            <label>Product Status</label>

            <select
              name="status"
              value={productForm.status}
              onChange={handleProductChange}
            >

              <option value="Active">
                Active
              </option>

              <option value="Inactive">
                Inactive
              </option>

            </select>

          </div>


          {/* FORM BUTTONS */}

          <div className="product-form-actions">

            <button
              type="button"
              className="cancel-product-button"
              onClick={() => {
  setEditingProductId(null);
  setShowProductForm(false);
}}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="save-product-button"
            >
              <PlusCircle size={18} />
                {editingProductId ? "Update Product" : "Add Product"}
            </button>

          </div>

        </form>

      </div>

    )}


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
            onClick={() => setShowProductForm(true)}
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

                  <tr key={product.id}>

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
                      Rs. {product.price.toLocaleString()}
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
    onClick={() => handleEditProduct(product)}
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

    <div className="orders-table-card">

      <div className="orders-table-header">
        <div>
          <h3>Recent Orders</h3>
          <p>Orders placed by customers in your store.</p>
        </div>
      </div>

      <div className="orders-empty-state">
        <ShoppingCart size={45} />

        <h3>No Orders Yet</h3>

        <p>
          Customer orders will appear here after customers
          purchase your products.
        </p>
      </div>

    </div>

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
          <h3>Rs. 0</h3>
        </div>
      </div>

      <div className="payment-summary-card">
        <div className="payment-summary-icon pending-payment-icon">
          <CreditCard size={22} />
        </div>

        <div>
          <p>Pending Payment</p>
          <h3>Rs. 0</h3>
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

      <div className="payments-empty-state">
        <CreditCard size={45} />

        <h3>No Payments Yet</h3>

        <p>
          Your payment history will appear here after
          customers purchase your products.
        </p>
      </div>

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
        <h3>0.0</h3>

        <div className="rating-stars">
          <Star size={20} />
          <Star size={20} />
          <Star size={20} />
          <Star size={20} />
          <Star size={20} />
        </div>

        <p>No ratings yet</p>
      </div>

      <div className="rating-breakdown">

        <div className="rating-row">
          <span>5 Stars</span>
          <div className="rating-bar">
            <div className="rating-bar-fill" style={{ width: "0%" }}></div>
          </div>
          <span>0</span>
        </div>

        <div className="rating-row">
          <span>4 Stars</span>
          <div className="rating-bar">
            <div className="rating-bar-fill" style={{ width: "0%" }}></div>
          </div>
          <span>0</span>
        </div>

        <div className="rating-row">
          <span>3 Stars</span>
          <div className="rating-bar">
            <div className="rating-bar-fill" style={{ width: "0%" }}></div>
          </div>
          <span>0</span>
        </div>

        <div className="rating-row">
          <span>2 Stars</span>
          <div className="rating-bar">
            <div className="rating-bar-fill" style={{ width: "0%" }}></div>
          </div>
          <span>0</span>
        </div>

        <div className="rating-row">
          <span>1 Star</span>
          <div className="rating-bar">
            <div className="rating-bar-fill" style={{ width: "0%" }}></div>
          </div>
          <span>0</span>
        </div>

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

      <div className="reviews-empty-state">
        <Star size={45} />

        <h3>No Reviews Yet</h3>

        <p>
          Customer reviews will appear here after customers
          purchase and review your products.
        </p>
      </div>

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