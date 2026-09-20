import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import api from "../api/axios";

const WishlistContext = createContext(null);

export const WishlistProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const isLoggedIn = () => !!localStorage.getItem("token");

  const refresh = useCallback(async () => {
    if (!isLoggedIn()) {
      setItems([]);
      return;
    }

    try {
      setLoading(true);
      const { data } = await api.get("/wishlist");
      setItems(data);
    } catch (error) {
      console.error("Wishlist fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isWishlisted = (productId) =>
    items.some((item) => item._id === productId);

  const toggle = async (productId) => {
    if (!isLoggedIn()) return;

    if (isWishlisted(productId)) {
      const { data } = await api.delete(`/wishlist/${productId}`);
      setItems(data);
    } else {
      const { data } = await api.post(`/wishlist/${productId}`);
      setItems(data);
    }
  };

  return (
    <WishlistContext.Provider
      value={{ items, loading, refresh, isWishlisted, toggle }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => useContext(WishlistContext);
