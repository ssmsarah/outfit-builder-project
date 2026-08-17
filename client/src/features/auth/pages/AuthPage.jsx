import { useLocation } from "react-router-dom";

import LandingPage from "../../landing/LandingPage";
import Login from "./Login";
import Signup from "./Signup";

const AuthPage = () => {
  const location = useLocation();

  const isSignup = location.pathname === "/signup";

  return (
    <>
      <LandingPage />

      {isSignup ? <Signup /> : <Login />}
    </>
  );
};

export default AuthPage;