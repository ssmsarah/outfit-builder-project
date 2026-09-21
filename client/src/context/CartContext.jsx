import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import api from "../api/axios";

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
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
      const { data } = await api.get("/cart");
      setItems(data);
    } catch (error) {
      console.error("Cart fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addItem = async (productId, quantity = 1) => {
    const { data } = await api.post("/cart/add", { productId, quantity });
    setItems(data);
  };

  const updateItem = async (productId, quantity) => {
    const { data } = await api.patch(`/cart/${productId}`, { quantity });
    setItems(data);
  };

  const removeItem = async (productId) => {
    const { data } = await api.delete(`/cart/${productId}`);
    setItems(data);
  };

  const clearCart = async () => {
    await api.delete("/cart");
    setItems([]);
  };

  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        count,
        loading,
        refresh,
        addItem,
        updateItem,
        removeItem,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
