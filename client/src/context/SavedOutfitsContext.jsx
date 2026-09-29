import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  getSavedOutfits,
  saveOutfit as saveOutfitRequest,
  deleteSavedOutfit,
} from "../api/outfitApi";

const SavedOutfitsContext = createContext(null);

export const SavedOutfitsProvider = ({ children }) => {
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
      const data = await getSavedOutfits();
      setItems(data);
    } catch (error) {
      console.error("Saved outfits fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = async (outfit) => {
    const created = await saveOutfitRequest(outfit);
    setItems((previous) => [created, ...previous]);
    return created;
  };

  const remove = async (id) => {
    await deleteSavedOutfit(id);
    setItems((previous) => previous.filter((outfit) => outfit._id !== id));
  };

  return (
    <SavedOutfitsContext.Provider
      value={{ items, loading, refresh, save, remove }}
    >
      {children}
    </SavedOutfitsContext.Provider>
  );
};

export const useSavedOutfits = () => useContext(SavedOutfitsContext);
