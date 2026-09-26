import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../../../assets/shopea.png";
import { API_BASE_URL } from "../../../api/axios";
import "./SellerAuth.css";

const SellerRegister = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
  name: "",
  storeName: "",
  email: "",
  phone: "",
  address: "",
  panVat: "",
  password: "",
  confirmPassword: "",
});

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");



    if (formData.password !== formData.confirmPassword) {
  setError("Passwords do not match.");
  return;
}

if (!/^\d{9}$/.test(formData.panVat)) {
  setError("Please enter a valid PAN number.");
  return;
}


    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/signup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        body: JSON.stringify({
  name: formData.name,
  storeName: formData.storeName,
  email: formData.email,
  phone: formData.phone,
  address: formData.address,
  panVat: formData.panVat,
  password: formData.password,
  role: "seller",
}),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

     setSuccess(
  "Seller account created successfully! Your account is now under verification. You can log in after your account is approved."
);

setTimeout(() => {
  navigate("/seller");
}, 2500);
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div className="seller-auth-page">
      <div className="seller-auth-card">

        <button
          className="seller-close"
          onClick={() => navigate("/seller")}
        >
          ×
        </button>

        <img
          src={logo}
          alt="Shoppea"
          className="seller-logo"
        />

        <h1>Become a Seller</h1>

        <p className="seller-subtitle">
          Create your Shoppea seller account
        </p>

        {error && (
          <div className="seller-error">
            {error}
          </div>
        )}

        {success && (
          <div className="seller-success">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>

  <div className="seller-input-group">
    <label>Full Name</label>
    <input
      type="text"
      name="name"
      placeholder="Enter your full name"
      value={formData.name}
      onChange={handleChange}
      required
    />
  </div>

  <div className="seller-input-group">
    <label>Store Name</label>
    <input
      type="text"
      name="storeName"
      placeholder="Enter your store name"
      value={formData.storeName}
      onChange={handleChange}
      required
    />
  </div>

  <div className="seller-input-group">
    <label>Email Address</label>
    <input
      type="email"
      name="email"
      placeholder="Enter your business email"
      value={formData.email}
      onChange={handleChange}
      required
    />
  </div>

  <div className="seller-input-group">
    <label>Phone Number</label>
    <input
      type="tel"
      name="phone"
      placeholder="Enter your phone number"
      value={formData.phone}
      onChange={handleChange}
      required
    />
  </div>

  <div className="seller-input-group">
    <label>Business Address</label>
    <textarea
      name="address"
      placeholder="Enter your complete business address"
      value={formData.address}
      onChange={handleChange}
      required
    />
  </div>

  <div className="seller-input-group">
    <label>PAN / VAT Number</label>
    <input
      type="text"
      name="panVat"
      placeholder="Enter PAN / VAT number"
      value={formData.panVat}
      onChange={handleChange}
      required
    />
  </div>

  <div className="seller-input-group">
    <label>Password</label>
    <input
      type="password"
      name="password"
      placeholder="Create a password"
      value={formData.password}
      onChange={handleChange}
      required
    />
  </div>

  <div className="seller-input-group">
    <label>Confirm Password</label>
    <input
      type="password"
      name="confirmPassword"
      placeholder="Confirm your password"
      value={formData.confirmPassword}
      onChange={handleChange}
      required
    />
  </div>

  <button
    type="submit"
    className="seller-login-button"
  >
    Create Seller Account
  </button>

</form>

        <div className="seller-register-section">
          <p>Already have a seller account?</p>

          <Link to="/seller">
            Login as Seller
          </Link>
        </div>

      </div>
    </div>
  );
};

export default SellerRegister;