import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Trash2, ShoppingBag } from "lucide-react";

import { useSavedOutfits } from "../../../context/SavedOutfitsContext";
import { useCart } from "../../../context/CartContext";
import { useToast } from "../../../context/ToastContext";
import { getImageUrl, handleImageError } from "../../../utils/getImageUrl";

import "./SavedOutfits.css";

const getPrice = (product) => Number(product?.finalPrice ?? product?.price ?? 0);

const SavedOutfits = () => {
  const navigate = useNavigate();
  const savedOutfits = useSavedOutfits();
  const cart = useCart();
  const { showToast } = useToast();

  const [removingId, setRemovingId] = useState(null);
  const [addingId, setAddingId] = useState(null);

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      navigate("/login");
    }
  }, [navigate]);

  const items = savedOutfits?.items || [];

  const outfitPieces = (outfit) =>
    [outfit.top, outfit.bottom, outfit.shoes, ...(outfit.accessories || [])].filter(Boolean);

  const outfitTotal = (outfit) =>
    outfitPieces(outfit).reduce((total, product) => total + getPrice(product), 0);

  const handleRemove = async (id) => {
    try {
      setRemovingId(id);
      await savedOutfits.remove(id);
      showToast("Saved outfit removed", "success");
    } catch (error) {
      showToast(
        error.response?.data?.message || "Couldn't remove this outfit",
        "error"
      );
    } finally {
      setRemovingId(null);
    }
  };

  const handleAddToCart = async (outfit) => {
    try {
      setAddingId(outfit._id);
      for (const product of outfitPieces(outfit)) {
        await cart.addItem(product._id, 1);
      }
      showToast("Outfit added to cart", "success");
    } catch (error) {
      showToast(
        error.response?.data?.message || "Couldn't add this outfit to cart",
        "error"
      );
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="so-page">
      <h1>My Saved Outfits</h1>

      {savedOutfits?.loading ? (
        <p className="so-status-msg">Loading your saved outfits...</p>
      ) : items.length === 0 ? (
        <div className="so-empty">
          <Sparkles size={48} strokeWidth={1.5} />
          <h2>No saved outfits yet</h2>
          <p>Build a look in the Outfit Builder and save it to see it here.</p>
          <button onClick={() => navigate("/outfit-builder")}>
            Go to Outfit Builder
          </button>
        </div>
      ) : (
        <div className="so-list">
          {items.map((outfit) => (
            <div className="so-card" key={outfit._id}>
              <div className="so-card-header">
                <strong>{outfit.name}</strong>
                <span className="so-card-date">
                  {new Date(outfit.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div className="so-card-items">
                {outfitPieces(outfit).map((product, index) => (
                  <img
                    key={`${outfit._id}-${product?._id || index}`}
                    src={getImageUrl(product?.image)}
                    alt={product?.name}
                    onError={handleImageError}
                  />
                ))}
              </div>

              <div className="so-card-footer">
                <span>
                  Total <strong>Rs. {outfitTotal(outfit).toLocaleString()}</strong>
                </span>

                <div className="so-card-actions">
                  <button
                    type="button"
                    className="so-add-to-cart"
                    onClick={() => handleAddToCart(outfit)}
                    disabled={addingId === outfit._id}
                  >
                    <ShoppingBag size={15} />
                    {addingId === outfit._id ? "Adding..." : "Add to Cart"}
                  </button>

                  <button
                    type="button"
                    className="so-remove"
                    onClick={() => handleRemove(outfit._id)}
                    disabled={removingId === outfit._id}
                    aria-label="Remove saved outfit"
                    title="Remove"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedOutfits;
