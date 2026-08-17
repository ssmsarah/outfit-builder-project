import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../../../assets/shopea.png";
import googleLogo from "../../../assets/google.png";
import "./Auth.css";

const Signup = () => {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
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
        "http://localhost:5000/api/auth/register",
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
        throw new Error(
          data.message || "Registration failed"
        );
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
      setError(
        err.message || "Something went wrong"
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
                      setShowPassword(
                        !showPassword
                      )
                    }
                  >
                    {showPassword ? "◉" : "◌"}
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

  <span>Continue with Google</span>
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