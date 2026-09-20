import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../../../assets/shopea.png";
import "./SellerAuth.css";

const SellerLogin = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  setError("");

  try {
    const response = await fetch(
      "http://localhost:5000/api/auth/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Login failed");
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem(
      "user",
      JSON.stringify(data.user)
    );

    navigate("/seller/dashboard");
  } catch (error) {
    setError(error.message);
  }
};

  return (
  <div className="seller-auth-page">

    <div className="seller-auth-card">

      <button
        className="seller-close"
        onClick={() => navigate("/")}
      >
        ×
      </button>

      <img
        src={logo}
        alt="Shoppea"
        className="seller-logo"
      />

      <h1>Seller Login</h1>

      <p className="seller-subtitle">
        Login to manage your Shoppea store
      </p>

      {error && (
        <div className="seller-error">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>

        <div className="seller-input-group">
          <label>Email Address</label>

          <input
            type="email"
            name="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="seller-input-group">
          <label>Password</label>

          <input
            type="password"
            name="password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>

        <button
          type="submit"
          className="seller-login-button"
        >
          Login
        </button>

      </form>

      <div className="seller-register-section">
        <p>Don't have a seller account?</p>

        <Link to="/seller/register">
          Register as Seller
        </Link>
      </div>

    </div>

  </div>
);
}
export default SellerLogin;