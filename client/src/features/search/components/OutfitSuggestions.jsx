import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, TrendingUp, TrendingDown, X } from "lucide-react";
import { getOutfitRecommendations } from "../../../api/outfitApi";
import { getImageUrl } from "../../../utils/getImageUrl";
import "./OutfitSuggestions.css";

// I7.5: outfits built around a search result. Each card shows the applied
// rule boosts/penalties (the API never returns rejected outfits, so no
// rejection is ever shown), plus the compatibility reasons.
const OutfitSuggestions = ({ anchor, occasion, season, onClose }) => {
  const [state, setState] = useState({ loading: true, outfits: [], ruleMessages: [], error: null });

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, outfits: [], ruleMessages: [], error: null });

    getOutfitRecommendations(anchor._id, { occasion, season, limit: 4 })
      .then(({ outfits, ruleMessages }) => {
        if (!cancelled) setState({ loading: false, outfits, ruleMessages, error: null });
      })
      .catch((error) => {
        if (cancelled) return;
        const message =
          error.response?.status === 503
            ? "Outfit suggestions are turned off right now."
            : error.response?.data?.message || "Couldn't build outfits for this item.";
        setState({ loading: false, outfits: [], ruleMessages: [], error: message });
      });

    return () => {
      cancelled = true;
    };
  }, [anchor._id, occasion, season]);

  const { loading, outfits, ruleMessages, error } = state;

  return (
    <section className="outfit-suggestions" aria-live="polite">
      <header className="outfit-suggestions-header">
        <div>
          <span className="outfit-suggestions-eyebrow">
            <Sparkles size={14} /> Outfits built around
          </span>
          <h2>{anchor.name}</h2>
          {(occasion || season) && (
            <p>
              For {[occasion && `${occasion} occasions`, season].filter(Boolean).join(", in ")}
            </p>
          )}
        </div>
        <button type="button" className="outfit-suggestions-close" onClick={onClose} aria-label="Close outfit suggestions">
          <X size={18} />
        </button>
      </header>

      {loading && <p className="outfit-suggestions-status">Building outfits...</p>}
      {error && <p className="outfit-suggestions-status error">{error}</p>}

      {!loading && !error && ruleMessages.length > 0 && (
        <div className="outfit-suggestions-status">
          <strong>This item can't anchor an outfit here:</strong>
          <ul>
            {ruleMessages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      {!loading && !error && ruleMessages.length === 0 && outfits.length === 0 && (
        <p className="outfit-suggestions-status">
          Not enough matching pieces in the catalog to complete an outfit yet.
        </p>
      )}

      <div className="outfit-suggestions-grid">
        {outfits.map((outfit) => (
          <article className="outfit-card" key={outfit.items.join("-")}>
            <div className="outfit-card-score">{Math.round(outfit.finalScore * 100)}% match</div>

            <div className="outfit-card-products">
              {outfit.products.map((product) => (
                <Link to={`/product/${product.id}`} className="outfit-card-product" key={product.id} title={product.name}>
                  <img src={getImageUrl(product.image)} alt={product.name} />
                  <span>{product.name}</span>
                </Link>
              ))}
            </div>

            {outfit.appliedRules?.length > 0 && (
              <ul className="outfit-card-rules">
                {outfit.appliedRules.map((rule) => (
                  <li key={rule.ruleId} className={rule.effect}>
                    {rule.effect === "boost" ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    <span>{rule.message}</span>
                    <b>
                      {rule.effect === "boost" ? "+" : "−"}
                      {Math.round(rule.value * 100)}%
                    </b>
                  </li>
                ))}
              </ul>
            )}

            <ul className="outfit-card-reasons">
              {outfit.reasons
                .filter((reason) => !outfit.appliedRules?.some((rule) => rule.message === reason))
                .map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
};

export default OutfitSuggestions;
