import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Shirt, Sparkles } from "lucide-react";
import api from "../../../api/axios";
import { searchItems } from "../../../api/searchApi";
import ProductCard from "../../../components/ProductCard";
import OutfitSuggestions from "../components/OutfitSuggestions";
import { getImageUrl, handleImageError } from "../../../utils/getImageUrl";
import "../../stores/pages/Stores.css";
import "./SearchResults.css";

const DEBOUNCE_MS = 250;

// Only these outfit categories can anchor a generated outfit (T2.7).
const ANCHOR_CATEGORIES = ["top", "bottom", "shoes", "dress"];

const ATTRIBUTE_LABELS = {
  category: "Category",
  color: "Color",
  style: "Style",
  pattern: "Pattern",
  occasion: "Occasion",
  season: "Season",
};

const formatValue = (value) => String(value).replace(/_/g, " ");

// I7.5: fuzzy search (TF-IDF + attribute matching) with detected-attribute
// chips, and a "Build outfit" button that recommends outfits around a result.
// With no query it keeps the old behavior: browse every product.
const SearchResults = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get("q") || "";

  const [input, setInput] = useState(urlQuery);
  const [response, setResponse] = useState({ results: [], parsedAttributes: {}, total: 0 });
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [anchor, setAnchor] = useState(null);
  const outfitsRef = useRef(null);

  // setSearchParams changes identity on every URL change; reading it through
  // a ref keeps the search effect from re-running because of its own update.
  const setSearchParamsRef = useRef(setSearchParams);
  setSearchParamsRef.current = setSearchParams;

  // Keep the box in sync when the navbar search changes the URL.
  useEffect(() => {
    setInput(urlQuery);
  }, [urlQuery]);

  // Debounced search: fires 250 ms after the user stops typing, and cancels
  // the previous request so results never arrive out of order.
  useEffect(() => {
    const query = input.trim();
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      if (query !== (new URLSearchParams(window.location.search).get("q") || "")) {
        setSearchParamsRef.current(query ? { q: query } : {}, { replace: true });
      }
      setLoading(true);
      setError(null);

      try {
        if (query) {
          setResponse(await searchItems(query, { limit: 24, signal: controller.signal }));
        } else {
          const { data } = await api.get("/products", { signal: controller.signal });
          setAllProducts(data);
        }
        setLoading(false);
      } catch (err) {
        if (err.name === "CanceledError") return;
        console.error("Search error:", err);
        setError("Search is unavailable right now. Please try again.");
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [input]);

  const buildOutfit = (item) => {
    setAnchor(item);
    requestAnimationFrame(() => outfitsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const query = input.trim();
  const { results, parsedAttributes, total } = response;
  const chips = Object.entries(parsedAttributes);

  return (
    <div className="stores-page search-page">
      <div className="stores-header">
        <h1>{query ? "Search Results" : "All Products"}</h1>
        <p>
          {query
            ? "Typos and synonyms are fine - try \"blak casul tee\"."
            : "Browse everything available on Shoppea right now."}
        </p>
      </div>

      <div className="search-page-box">
        <Search size={18} />
        <input
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search by name, color, style... e.g. black casual top"
          aria-label="Search products"
          autoFocus
        />
      </div>

      {query && chips.length > 0 && (
        <div className="search-chips" aria-label="Detected attributes">
          <span className="search-chips-label">We understood:</span>
          {chips.map(([attribute, value]) => (
            <span className="search-chip" key={attribute} title={ATTRIBUTE_LABELS[attribute]}>
              <small>{ATTRIBUTE_LABELS[attribute]}</small>
              {formatValue(value)}
            </span>
          ))}
        </div>
      )}

      {anchor && (
        <div ref={outfitsRef} className="search-outfits">
          <OutfitSuggestions
            anchor={anchor}
            occasion={parsedAttributes.occasion}
            season={parsedAttributes.season}
            onClose={() => setAnchor(null)}
          />
        </div>
      )}

      {error ? (
        <p className="stores-status">{error}</p>
      ) : loading ? (
        <p className="stores-status">Loading...</p>
      ) : !query ? (
        allProducts.length === 0 ? (
          <p className="stores-status">No products available yet.</p>
        ) : (
          <div className="product-grid">
            {allProducts.map((product) => (
              <ProductCard product={product} key={product._id} />
            ))}
          </div>
        )
      ) : results.length === 0 ? (
        <p className="stores-status">No products matched "{query}".</p>
      ) : (
        <>
          <p className="search-count">
            {total} {total === 1 ? "result" : "results"}
          </p>

          <div className="search-results-grid">
            {results.map(({ item, hybridScore, matched }) => {
              const canAnchor = ANCHOR_CATEGORIES.includes(item.outfitCategory);

              return (
                <article className="search-result-card" key={item._id}>
                  <Link to={`/product/${item._id}`} className="search-result-image">
                    <img src={getImageUrl(item.image)} alt={item.name} onError={handleImageError} />
                    <span className="search-result-score">{Math.round(hybridScore * 100)}% match</span>
                  </Link>

                  <div className="search-result-body">
                    <Link to={`/product/${item._id}`} className="search-result-name">
                      {item.name}
                    </Link>

                    <div className="search-result-price">
                      Rs. {Number(item.price).toLocaleString()}
                      {item.originalPrice > item.price && <s>Rs. {Number(item.originalPrice).toLocaleString()}</s>}
                    </div>

                    {matched?.length > 0 && (
                      <div className="search-result-matched" title="Detected attributes this item matches">
                        {matched.map((attribute) => (
                          <span key={attribute}>✓ {ATTRIBUTE_LABELS[attribute]}</span>
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      className={`search-build-outfit ${anchor?._id === item._id ? "active" : ""}`}
                      onClick={() => buildOutfit(item)}
                      disabled={!canAnchor}
                      title={canAnchor ? "Suggest complete outfits around this item" : "Outfits start from a top, bottom, shoes or dress"}
                    >
                      {canAnchor ? <Sparkles size={15} /> : <Shirt size={15} />}
                      Build outfit
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default SearchResults;
