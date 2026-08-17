import { Routes, Route } from "react-router-dom";

import LandingPage from "./features/landing/LandingPage";
import AuthPage from "./features/auth/pages/AuthPage";

function App() {
  return (
    <Routes>
      {/* Landing Page */}
      <Route
        path="/"
        element={<LandingPage />}
      />

      {/* Login */}
      <Route
        path="/login"
        element={<AuthPage />}
      />

      {/* Signup */}
      <Route
        path="/signup"
        element={<AuthPage />}
      />
    </Routes>
  );
}

export default App;