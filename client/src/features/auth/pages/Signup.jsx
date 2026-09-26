
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../../../assets/shopea.png";
import googleLogo from "../../../assets/google.png";
import { API_BASE_URL } from "../../../api/axios";
import "./Auth.css";

const Signup = () => {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

    // Clear error when user starts correcting the form
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    // Check password length
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    // Check whether passwords match
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      // Combine first and last name
      const name = `${formData.firstName.trim()} ${formData.lastName.trim()}`;

      const response = await fetch(
        `${API_BASE_URL}/auth/signup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            email: formData.email.trim(),
            password: formData.password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Registration failed"
        );
      }

      // Save token if backend sends one
      if (data.token) {
        localStorage.setItem("token", data.token);
      }

      // Save user information
      if (data.user) {
        localStorage.setItem(
          "user",
          JSON.stringify(data.user)
        );
      }

      // Signup successful
      navigate("/");
    } catch (err) {
      setError(
        err.message || "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay">

      <div className="auth-modal">

        {/* CLOSE */}

        <button
          type="button"
          className="auth-close"
          onClick={() => navigate("/")}
          aria-label="Close"
        >
          ×
        </button>

        {/* ================= LEFT ================= */}

        <div className="auth-left">

          <div className="auth-brand">

            <img
              src={logo}
              alt="Shoppea"
            />

            <div className="auth-brand-name">
              SHOPPEA
            </div>

          </div>

          <h1>
            EVERY STORE
            <br />
            HAS A <span>STORY.</span>
          </h1>

          <p>
            Join Shoppea and discover products,
            collections and stores that match your
            personal style.
          </p>

          <div className="auth-benefits">

            <div className="auth-benefit">

              <div className="auth-benefit-icon">
                ✦
              </div>

              <div>

                <strong>
                  DISCOVER NEW STORES
                </strong>

                <span>
                  Find something new every time you shop.
                </span>

              </div>

            </div>

            <div className="auth-benefit">

              <div className="auth-benefit-icon">
                ♡
              </div>

              <div>

                <strong>
                  EXPLORE YOUR STYLE
                </strong>

                <span>
                  Find products that fit your personality.
                </span>

              </div>

            </div>

            <div className="auth-benefit">

              <div className="auth-benefit-icon">
                ✓
              </div>

              <div>

                <strong>
                  SHOPPEA COMMUNITY
                </strong>

                <span>
                  One place for all your favorite stores.
                </span>

              </div>

            </div>

          </div>

        </div>

        {/* ================= RIGHT ================= */}

        <div className="auth-right">

          <div className="auth-content">

            <div className="auth-header">

              <h2>
                CREATE ACCOUNT
              </h2>

              <p>
                Join Shoppea and start discovering.
              </p>

            </div>

            <form
              className="auth-form"
              onSubmit={handleSubmit}
            >

              {/* NAME */}

              <div className="signup-row">

                <div className="auth-field">

                  <label htmlFor="firstName">
                    First Name
                  </label>

                  <input
                    id="firstName"
                    className="auth-input"
                    type="text"
                    name="firstName"
                    placeholder="First name"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                  />

                </div>

                <div className="auth-field">

                  <label htmlFor="lastName">
                    Last Name
                  </label>

                  <input
                    id="lastName"
                    className="auth-input"
                    type="text"
                    name="lastName"
                    placeholder="Last name"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                  />

                </div>

              </div>

              {/* EMAIL */}

              <div className="auth-field">

                <label htmlFor="email">
                  Email
                </label>

                <input
                  id="email"
                  className="auth-input"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />

              </div>

              {/* PASSWORD */}

              <div className="auth-field">

                <label htmlFor="password">
                  Password
                </label>

                <div className="auth-input-wrapper">

                  <input
                    id="password"
                    className="auth-input"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    name="password"
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength={6}
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowPassword(!showPassword)
                    }
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPassword ? "◉" : "◌"}
                  </button>

                </div>

              </div>

              {/* CONFIRM PASSWORD */}

              <div className="auth-field">

                <label htmlFor="confirmPassword">
                  Confirm Password
                </label>

                <div className="auth-input-wrapper">

                  <input
                    id="confirmPassword"
                    className="auth-input"
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    name="confirmPassword"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    minLength={6}
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowConfirmPassword(
                        !showConfirmPassword
                      )
                    }
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirm password"
                        : "Show confirm password"
                    }
                  >
                    {showConfirmPassword ? "◉" : "◌"}
                  </button>

                </div>

              </div>

              {/* ERROR */}

              {error && (
                <p
                  style={{
                    color: "#d04f70",
                    fontSize: "12px",
                    margin: "0",
                  }}
                >
                  {error}
                </p>
              )}

              {/* SIGNUP BUTTON */}

              <button
                type="submit"
                className="auth-submit"
                disabled={loading}
              >
                {loading
                  ? "CREATING ACCOUNT..."
                  : "CREATE ACCOUNT →"}
              </button>

            </form>

            {/* DIVIDER */}

            <div className="auth-divider">

              <span>
                OR CONTINUE WITH
              </span>

            </div>

            {/* GOOGLE */}

            <button
              type="button"
              className="google-button"
            >
              <img
                src={googleLogo}
                alt="Google"
                className="google-logo"
              />

              <span>
                Continue with Google
              </span>
            </button>

            {/* LOGIN */}

            <div className="auth-switch">

              Already have an account?

              <Link to="/login">
                Sign in
              </Link>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};

export default Signup;

