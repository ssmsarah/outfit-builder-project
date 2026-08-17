import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../../../assets/shopea.png";
import googleLogo from "../../../assets/google.png";
import "./Auth.css";

const Login = () => {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
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
    setLoading(true);

    try {
      const response = await fetch(
        "http://localhost:5000/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      if (data.token) {
        localStorage.setItem("token", data.token);
      }

      if (data.user) {
        localStorage.setItem(
          "user",
          JSON.stringify(data.user)
        );
      }

      navigate("/");
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay">

      <div className="auth-modal">

        {/* CLOSE BUTTON */}
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
            Discover unique products from your favorite
            stores and find something special for every
            moment.
          </p>

          <div className="auth-benefits">

            <div className="auth-benefit">

              <div className="auth-benefit-icon">
                ✦
              </div>

              <div>
                <strong>
                  DISCOVER UNIQUE STORES
                </strong>

                <span>
                  Explore collections from different stores.
                </span>
              </div>

            </div>


            <div className="auth-benefit">

              <div className="auth-benefit-icon">
                ♡
              </div>

              <div>
                <strong>
                  FIND YOUR STYLE
                </strong>

                <span>
                  Discover products that match your taste.
                </span>
              </div>

            </div>


            <div className="auth-benefit">

              <div className="auth-benefit-icon">
                ✓
              </div>

              <div>
                <strong>
                  SHOP WITH CONFIDENCE
                </strong>

                <span>
                  A simple and enjoyable shopping experience.
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
                WELCOME BACK
              </h2>

              <p>
                Sign in to continue shopping with Shoppea.
              </p>

            </div>


            <form
              className="auth-form"
              onSubmit={handleSubmit}
            >

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
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowPassword(
                        !showPassword
                      )
                    }
                  >
                    {showPassword ? "◉" : "◌"}
                  </button>

                </div>

              </div>


              {/* OPTIONS */}

              <div className="auth-options">

                <label className="remember-me">

                  <input
                    type="checkbox"
                  />

                  Remember me

                </label>


                <Link
                  to="/forgot-password"
                  className="forgot-password"
                >
                  Forgot password?
                </Link>

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


              {/* LOGIN BUTTON */}

              <button
                type="submit"
                className="auth-submit"
                disabled={loading}
              >
                {loading
                  ? "SIGNING IN..."
                  : "SIGN IN →"}
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
            
              <span>Continue with Google</span>
            </button>


            {/* SIGNUP */}

            <div className="auth-switch">

              New to Shoppea?

              <Link
  to="/signup"
  className="create-account-link"
>
  Create an account
</Link>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};

export default Login;