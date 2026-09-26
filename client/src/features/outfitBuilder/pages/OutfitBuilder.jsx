import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronRight,
  Sparkles,
  RotateCcw,
  X,
} from "lucide-react";

import api from "../../../api/axios";

import "./OutfitBuilder.css";

const CATEGORY_ENDPOINTS = {
  dresses: "dresses",
  formals: "formals",
  tops: "tops",
  bottoms: "bottoms",
  shoes: "shoes",
  accessories: "accessories",
};

const CATEGORY_LABELS = {
  dresses: "Dresses",
  formals: "Formals",
  tops: "Tops",
  bottoms: "Bottoms",
  shoes: "Shoes",
  accessories: "Accessories",
};

const CATEGORY_ORDER = [
  "dresses",
  "formals",
  "tops",
  "bottoms",
  "shoes",
  "accessories",
];

const neutralColors = [
  "black",
  "white",
  "grey",
  "gray",
  "beige",
  "cream",
  "brown",
  "navy",
  "denim",
];

const OutfitBuilder = () => {
  const [products, setProducts] = useState({
    dresses: [],
    formals: [],
    tops: [],
    bottoms: [],
    shoes: [],
    accessories: [],
  });

  const [selectedItems, setSelectedItems] = useState([]);

  const [activeCategory, setActiveCategory] = useState(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);

        const results = await Promise.all(
          Object.entries(CATEGORY_ENDPOINTS).map(
            async ([key, endpoint]) => {
              try {
                const { data } = await api.get(
                  `/products/category/${endpoint}`
                );

                return [
                  key,
                  Array.isArray(data) ? data : [],
                ];
              } catch (error) {
                console.error(
                  `Failed to load ${key}:`,
                  error
                );

                return [key, []];
              }
            }
          )
        );

        setProducts(Object.fromEntries(results));
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  /*
   * -------------------------------------------------------
   * RULE-BASED MATCHING
   * -------------------------------------------------------
   *
   * These rules determine whether two products are
   * compatible.
   */
  const ruleBasedCompatibility = (
    selectedProduct,
    candidate
  ) => {
    if (!selectedProduct || !candidate) {
      return {
        compatible: false,
        score: 0,
      };
    }

    let score = 0;

    const selectedColors = (
      selectedProduct.colors || []
    ).map((color) => color.toLowerCase());

    const candidateColors = (
      candidate.colors || []
    ).map((color) => color.toLowerCase());

    /*
     * RULE 1
     * Same color = strong compatibility
     */
    const sameColor = candidateColors.some((color) =>
      selectedColors.includes(color)
    );

    if (sameColor) {
      score += 35;
    }

    /*
     * RULE 2
     * Neutral colors work with most colors.
     */
    const candidateHasNeutral = candidateColors.some(
      (color) => neutralColors.includes(color)
    );

    if (candidateHasNeutral) {
      score += 20;
    }

    /*
     * RULE 3
     * Selected product has neutral color.
     */
    const selectedHasNeutral = selectedColors.some(
      (color) => neutralColors.includes(color)
    );

    if (selectedHasNeutral) {
      score += 15;
    }

    /*
     * RULE 4
     * Product is available and in stock.
     */
    if (candidate.available !== false && candidate.stock > 0) {
      score += 15;
    }

    /*
     * RULE 5
     * Higher-rated products receive additional score.
     */
    const rating = Number(candidate.ratingAvg || 0);

    if (rating >= 4.5) {
      score += 15;
    } else if (rating >= 4) {
      score += 10;
    } else if (rating >= 3) {
      score += 5;
    }

    return {
      compatible: score >= 30,
      score: Math.min(score, 100),
    };
  };

  /*
   * -------------------------------------------------------
   * WEIGHTED SCORING
   * -------------------------------------------------------
   *
   * When multiple products have already been selected,
   * score the candidate against ALL selected products.
   */
  const calculateWeightedScore = (candidate) => {
    if (!selectedItems.length) {
      return 0;
    }

    let totalScore = 0;
    let totalWeight = 0;

    selectedItems.forEach((selectedProduct) => {
      const result = ruleBasedCompatibility(
        selectedProduct,
        candidate
      );

      /*
       * Newer selections have slightly more influence,
       * while earlier selections still matter.
       */
      const weight =
        selectedItems.indexOf(selectedProduct) + 1;

      totalScore += result.score * weight;
      totalWeight += weight;
    });

    if (!totalWeight) {
      return 0;
    }

    return Math.round(totalScore / totalWeight);
  };

  /*
   * -------------------------------------------------------
   * RECOMMENDATIONS
   * -------------------------------------------------------
   *
   * Recommendations are generated for every category that
   * has NOT already been selected.
   */
  const recommendations = useMemo(() => {
    if (!selectedItems.length) {
      return {};
    }

    const selectedIds = selectedItems.map(
      (item) => item._id
    );

    const result = {};

    CATEGORY_ORDER.forEach((category) => {
      const alreadySelected = selectedItems.some(
        (item) => item.category === category
      );

      if (alreadySelected) {
        return;
      }

      const candidates = products[category] || [];

      const scored = candidates
        .filter(
          (product) =>
            !selectedIds.includes(product._id)
        )
        .map((product) => ({
          ...product,
          compatibilityScore:
            calculateWeightedScore(product),
        }))
        .filter(
          (product) =>
            product.compatibilityScore >= 30
        )
        .sort(
          (a, b) =>
            b.compatibilityScore -
            a.compatibilityScore
        );

      result[category] = scored.slice(0, 6);
    });

    return result;
  }, [products, selectedItems]);

  /*
   * -------------------------------------------------------
   * SELECT PRODUCT
   * -------------------------------------------------------
   */
  const selectProduct = (product) => {
    setSelectedItems((previous) => {
      /*
       * If the same product is already selected,
       * don't add it again.
       */
      if (
        previous.some(
          (item) => item._id === product._id
        )
      ) {
        return previous;
      }

      /*
       * Only one product per category.
       */
      const withoutSameCategory =
        previous.filter(
          (item) =>
            item.category !== product.category
        );

      return [
        ...withoutSameCategory,
        product,
      ];
    });

    setActiveCategory(null);
  };

  /*
   * -------------------------------------------------------
   * REMOVE PRODUCT
   * -------------------------------------------------------
   */
  const removeProduct = (productId) => {
    setSelectedItems((previous) =>
      previous.filter(
        (item) => item._id !== productId
      )
    );
  };

  /*
   * -------------------------------------------------------
   * RESET
   * -------------------------------------------------------
   */
  const resetBuilder = () => {
    setSelectedItems([]);
    setActiveCategory(null);
  };

  const getImage = (product) => {
    if (!product?.image) {
      return "/placeholder-product.jpg";
    }

    return product.image;
  };

  const getPrice = (product) => {
    return Number(
      product.finalPrice ?? product.price ?? 0
    );
  };

  const totalPrice = selectedItems.reduce(
    (total, product) =>
      total + getPrice(product),
    0
  );

  /*
   * -------------------------------------------------------
   * INITIAL SCREEN
   * -------------------------------------------------------
   */
  if (!selectedItems.length) {
    return (
      <div className="outfit-builder-page">

        <div className="outfit-builder-header">
          <span className="outfit-eyebrow">
            <Sparkles size={16} />
            STYLE YOUR LOOK
          </span>

          <h1>Outfit Builder</h1>

          <p>
            Start with any piece you love and we'll find
            compatible items to complete your look.
          </p>
        </div>

        <div className="start-builder-card">

          <div className="start-builder-heading">
            <h2>Where would you like to start?</h2>

            <p>
              Choose any category. There is no required
              starting point.
            </p>
          </div>

          {loading ? (
            <div className="outfit-loading">
              Finding your fashion pieces...
            </div>
          ) : (
            <div className="starting-category-grid">
              {CATEGORY_ORDER.map((category) => (
                <button
                  key={category}
                  className="starting-category-card"
                  onClick={() =>
                    setActiveCategory(category)
                  }
                >
                  <div className="starting-category-image">
                    {products[category]?.[0] ? (
                      <img
                        src={getImage(
                          products[category][0]
                        )}
                        alt={CATEGORY_LABELS[category]}
                      />
                    ) : (
                      <span>
                        {CATEGORY_LABELS[
                          category
                        ][0]}
                      </span>
                    )}
                  </div>

                  <div>
                    <strong>
                      {CATEGORY_LABELS[category]}
                    </strong>

                    <small>
                      {products[category]?.length || 0}{" "}
                      items
                    </small>
                  </div>

                  <ChevronRight size={18} />
                </button>
              ))}
            </div>
          )}
        </div>

        {activeCategory && (
          <div className="category-selection-modal">
            <div className="category-selection-content">

              <button
                className="close-builder"
                onClick={() =>
                  setActiveCategory(null)
                }
              >
                <X size={20} />
              </button>

              <span className="selection-step">
                START WITH
              </span>

              <h2>
                Choose a{" "}
                {CATEGORY_LABELS[activeCategory]
                  .toLowerCase()
                  .slice(0, -1)}
              </h2>

              <div className="outfit-product-grid">
                {(products[activeCategory] || []).map(
                  (product) => (
                    <ProductOption
                      key={product._id}
                      product={product}
                      getImage={getImage}
                      onSelect={selectProduct}
                    />
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /*
   * -------------------------------------------------------
   * BUILDER SCREEN
   * -------------------------------------------------------
   */
  return (
    <div className="outfit-builder-page">

      <div className="outfit-builder-header">

        <div>
          <span className="outfit-eyebrow">
            <Sparkles size={16} />
            YOUR PERSONAL STYLIST
          </span>

          <h1>Build Your Look</h1>

          <p>
            Your selections are being matched using
            compatibility rules and weighted scoring.
          </p>
        </div>

        <button
          className="reset-builder-button"
          onClick={resetBuilder}
        >
          <RotateCcw size={16} />
          Start Over
        </button>
      </div>

      <div className="outfit-builder-content">

        {/* LEFT */}
        <div className="outfit-selection-area">

          <div className="selected-summary">

            <div>
              <span className="selection-step">
                YOUR SELECTIONS
              </span>

              <h2>
                Your Outfit
              </h2>
            </div>

            <span>
              {selectedItems.length}{" "}
              {selectedItems.length === 1
                ? "piece"
                : "pieces"}
            </span>
          </div>

          <div className="selected-products-row">
            {selectedItems.map((product) => (
              <div
                className="selected-product-chip"
                key={product._id}
              >
                <img
                  src={getImage(product)}
                  alt={product.name}
                />

                <div>
                  <strong>
                    {product.name}
                  </strong>

                  <small>
                    {CATEGORY_LABELS[
                      product.category
                    ]}
                  </small>
                </div>

                <button
                  onClick={() =>
                    removeProduct(product._id)
                  }
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>

          <div className="recommendation-heading">
            <div>
              <span className="selection-step">
                SMART RECOMMENDATIONS
              </span>

              <h2>
                Complete Your Look
              </h2>

              <p>
                Items below are ranked using your
                compatibility score.
              </p>
            </div>
          </div>

          {Object.keys(recommendations).map(
            (category) => {
              const items =
                recommendations[category] || [];

              if (!items.length) {
                return null;
              }

              return (
                <section
                  className="recommendation-section"
                  key={category}
                >
                  <div className="recommendation-category-heading">
                    <h3>
                      {CATEGORY_LABELS[category]}
                    </h3>

                    <span>
                      Recommended for you
                    </span>
                  </div>

                  <div className="outfit-product-grid">
                    {items.map((product) => (
                      <ProductOption
                        key={product._id}
                        product={product}
                        getImage={getImage}
                        onSelect={selectProduct}
                        showScore
                      />
                    ))}
                  </div>
                </section>
              );
            }
          )}

          <div className="manual-add-section">
            <span>
              Want something different?
            </span>

            <div className="manual-category-buttons">
              {CATEGORY_ORDER.map((category) => {
                const alreadySelected =
                  selectedItems.some(
                    (item) =>
                      item.category === category
                  );

                if (alreadySelected) {
                  return null;
                }

                return (
                  <button
                    key={category}
                    onClick={() =>
                      setActiveCategory(category)
                    }
                  >
                    +{" "}
                    {CATEGORY_LABELS[category]}
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* RIGHT PREVIEW */}
        <aside className="outfit-preview">

          <div className="preview-header">
            <div>
              <span>YOUR STYLE</span>

              <h2>
                Complete Look
              </h2>
            </div>

            <Sparkles
              size={21}
            />
          </div>

          <div className="preview-items">

            {selectedItems.map((product) => (
              <div
                className="preview-item has-product"
                key={product._id}
              >
                <img
                  src={getImage(product)}
                  alt={product.name}
                />

                <div className="preview-item-details">
                  <span>
                    {CATEGORY_LABELS[
                      product.category
                    ]}
                  </span>

                  <strong>
                    {product.name}
                  </strong>

                  <small>
                    Rs.{" "}
                    {getPrice(
                      product
                    ).toLocaleString()}
                  </small>
                </div>

                <Check
                  className="preview-check"
                  size={18}
                />
              </div>
            ))}

          </div>

          <div className="preview-message">
            <Sparkles size={16} />

            <p>
              Your look is complete with the pieces
              you've chosen.
            </p>
          </div>

          <div className="preview-total">
            <span>
              Estimated Total
            </span>

            <strong>
              Rs.{" "}
              {totalPrice.toLocaleString()}
            </strong>
          </div>

          <button
            className="generate-outfit-button"
            onClick={() => {
              /*
               * This is intentionally NOT disabled
               * when only 1 or 2 categories are selected.
               */
              document
                .querySelector(
                  ".complete-outfit-preview"
                )
                ?.scrollIntoView({
                  behavior: "smooth",
                });
            }}
          >
            <Sparkles size={18} />
            Complete Look
          </button>

          <div className="complete-outfit-preview">
            <h3>
              ✨ Your look is ready
            </h3>

            <p>
              You can keep adding recommended pieces
              or use your current selection as your
              complete outfit.
            </p>
          </div>

        </aside>
      </div>

      {activeCategory && (
        <div className="category-selection-modal">

          <div className="category-selection-content">

            <button
              className="close-builder"
              onClick={() =>
                setActiveCategory(null)
              }
            >
              <X size={20} />
            </button>

            <span className="selection-step">
              ADD TO YOUR LOOK
            </span>

            <h2>
              Choose{" "}
              {CATEGORY_LABELS[activeCategory]}
            </h2>

            <div className="outfit-product-grid">
              {(products[activeCategory] || []).map(
                (product) => (
                  <ProductOption
                    key={product._id}
                    product={product}
                    getImage={getImage}
                    onSelect={selectProduct}
                  />
                )
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

const ProductOption = ({
  product,
  getImage,
  onSelect,
  showScore = false,
}) => {
  return (
    <div
      className="outfit-product-card"
      onClick={() => onSelect(product)}
    >
      <div className="outfit-product-image">

        <img
          src={getImage(product)}
          alt={product.name}
        />

        {showScore && (
          <span className="match-badge">
            {product.compatibilityScore}% match
          </span>
        )}

      </div>

      <div className="outfit-product-info">

        <span className="outfit-product-category">
          {CATEGORY_LABELS[product.category]}
        </span>

        <h3>
          {product.name}
        </h3>

        <strong>
          Rs.{" "}
          {Number(
            product.finalPrice ??
              product.price ??
              0
          ).toLocaleString()}
        </strong>

      </div>
    </div>
  );
};

export default OutfitBuilder;