import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  RotateCcw,
  ArrowDown,
  Shirt,
  Bookmark,
} from "lucide-react";

import api from "../../../api/axios";
import { getImageUrl, PLACEHOLDER_IMAGE, handleImageError } from "../../../utils/getImageUrl";
import { useCart } from "../../../context/CartContext";
import { useToast } from "../../../context/ToastContext";
import { useSavedOutfits } from "../../../context/SavedOutfitsContext";

import "./OutfitBuilder.css";

/*
 * Tops come from both the "tops" and "formals" marketplace categories
 * (formals are mostly shirts/blazers - see outfitAttributeDefaults.js).
 * Full dresses are fetched separately so they never mix into the tops grid.
 */
const CATEGORY_ENDPOINTS = {
  tops: ["tops", "formals"],
  dresses: ["dresses"],
  bottoms: ["bottoms"],
  shoes: ["shoes"],
  accessories: ["accessories"],
};

/*
 * Products have no sub-type field, so the sub-type (Jeans, Sneakers, Bag...)
 * is derived from keywords in the product name. Order matters: the first
 * matching type wins (e.g. "t-shirt" must be checked before "shirt").
 */
const SUBTYPES = {
  tops: [
    { key: "tshirts", label: "T-Shirts", keywords: ["t-shirt", "tshirt", "t shirt", "tee"] },
    { key: "hoodies", label: "Hoodies", keywords: ["hoodie", "hooded"] },
    { key: "sweaters", label: "Sweaters", keywords: ["sweater", "sweatshirt", "cardigan", "pullover", "jumper", "knit"] },
    { key: "blouses", label: "Blouses", keywords: ["blouse"] },
    { key: "shirts", label: "Shirts", keywords: ["shirt"] },
  ],
  bottoms: [
    { key: "jeans", label: "Jeans", keywords: ["jean", "denim"] },
    { key: "skirt", label: "Skirt", keywords: ["skirt"] },
    { key: "trousers", label: "Trousers", keywords: ["trouser", "chino", "slacks"] },
    { key: "shorts", label: "Shorts", keywords: ["short"] },
    { key: "pants", label: "Pants", keywords: ["pant", "jogger", "legging", "cargo"] },
  ],
  shoes: [
    { key: "sneakers", label: "Sneakers", keywords: ["sneaker", "trainer", "running", "canvas"] },
    { key: "boots", label: "Boots", keywords: ["boot"] },
    { key: "loafers", label: "Loafers", keywords: ["loafer", "moccasin", "oxford", "derby"] },
    { key: "heels", label: "Heels", keywords: ["heel", "pump", "stiletto", "wedge"] },
    { key: "sandals", label: "Sandals", keywords: ["sandal", "slipper", "flip", "flat"] },
  ],
  accessories: [
    { key: "bag", label: "Bag", keywords: ["bag", "tote", "clutch", "purse", "backpack", "satchel"] },
    { key: "jewelry", label: "Jewelry", keywords: ["necklace", "earring", "ring", "bracelet", "jewel", "pendant", "chain", "bangle"] },
    { key: "sunglasses", label: "Sunglasses", keywords: ["sunglass", "glasses", "shades"] },
    { key: "hat", label: "Hat", keywords: ["hat", "cap", "beanie", "beret"] },
    { key: "scarf", label: "Scarf", keywords: ["scarf", "shawl", "stole"] },
    { key: "watch", label: "Watch", keywords: ["watch"] },
    { key: "belt", label: "Belt", keywords: ["belt"] },
  ],
};

const OTHER_SUBTYPE = { key: "other", label: "Other" };

const getSubtype = (product, group) => {
  const name = (product?.name || "").toLowerCase();

  return (
    SUBTYPES[group].find((type) =>
      type.keywords.some((keyword) => name.includes(keyword))
    ) || OTHER_SUBTYPE
  );
};

const MATCH_THRESHOLD = 30;

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

/*
 * -------------------------------------------------------
 * RULE-BASED MATCHING
 * -------------------------------------------------------
 *
 * These rules determine whether two products are
 * compatible.
 */
const ruleBasedCompatibility = (selectedProduct, candidate) => {
  if (!selectedProduct || !candidate) {
    return {
      compatible: false,
      score: 0,
    };
  }

  let score = 0;

  const selectedColors = (selectedProduct.colors || []).map((color) =>
    color.toLowerCase()
  );

  const candidateColors = (candidate.colors || []).map((color) =>
    color.toLowerCase()
  );

  /*
   * RULE 1
   * Same color = strong compatibility
   */
  if (candidateColors.some((color) => selectedColors.includes(color))) {
    score += 35;
  }

  /*
   * RULE 2
   * Neutral colors work with most colors.
   */
  if (candidateColors.some((color) => neutralColors.includes(color))) {
    score += 20;
  }

  /*
   * RULE 3
   * Selected product has neutral color.
   */
  if (selectedColors.some((color) => neutralColors.includes(color))) {
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
    compatible: score >= MATCH_THRESHOLD,
    score: Math.min(score, 100),
  };
};

/*
 * -------------------------------------------------------
 * WEIGHTED SUM MODEL
 * -------------------------------------------------------
 *
 * Scores a candidate against every piece already chosen in the earlier
 * steps. Later pieces carry more weight (top = 1, bottom = 2, shoes = 3),
 * so the step directly before has the most influence.
 */
const calculateWeightedScore = (candidate, chosenItems) => {
  let totalScore = 0;
  let totalWeight = 0;

  chosenItems.forEach((chosen, index) => {
    const weight = index + 1;

    totalScore += ruleBasedCompatibility(chosen, candidate).score * weight;
    totalWeight += weight;
  });

  return totalWeight ? Math.round(totalScore / totalWeight) : 0;
};

/*
 * minScore defaults to MATCH_THRESHOLD (used for shoes/accessories, where a
 * short, curated list makes sense). Bottoms pass minScore: 0 so every
 * available bottom is shown, ranked by score rather than hidden by it.
 */
const rankCandidates = (candidates, chosenItems, minScore = MATCH_THRESHOLD) =>
  candidates
    .map((product) => ({
      ...product,
      compatibilityScore: calculateWeightedScore(product, chosenItems),
    }))
    .filter((product) => product.compatibilityScore >= minScore)
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore);

const matchesGender = (product, gender) =>
  gender === "all" || !product.gender || product.gender === "unisex" || product.gender === gender;

/*
 * Groups ranked products by sub-type. Groups are ordered by their best
 * match, so the most compatible type (e.g. Jeans) comes first.
 */
const groupBySubtype = (ranked, group) => {
  const groups = new Map();

  ranked.forEach((product) => {
    const type = getSubtype(product, group);

    if (!groups.has(type.key)) {
      groups.set(type.key, { ...type, items: [] });
    }

    groups.get(type.key).items.push(product);
  });

  return [...groups.values()];
};

const getImage = (product) =>
  product?.image ? getImageUrl(product.image) : PLACEHOLDER_IMAGE;

const getPrice = (product) => Number(product?.finalPrice ?? product?.price ?? 0);

const OutfitBuilder = () => {
  const navigate = useNavigate();
  const cart = useCart();
  const savedOutfits = useSavedOutfits();
  const { showToast } = useToast();

  const [savingOutfit, setSavingOutfit] = useState(false);

  const [products, setProducts] = useState({
    tops: [],
    dresses: [],
    bottoms: [],
    shoes: [],
    accessories: [],
  });

  const [loading, setLoading] = useState(true);

  const [topMode, setTopMode] = useState("tops");
  const [topFilter, setTopFilter] = useState("all");
  const [selectedTop, setSelectedTop] = useState(null);
  const [isDressSelected, setIsDressSelected] = useState(false);
  const [bottomGender, setBottomGender] = useState("all");
  const [bottomType, setBottomType] = useState(null);
  const [selectedBottom, setSelectedBottom] = useState(null);
  const [selectedShoes, setSelectedShoes] = useState(null);
  const [selectedAccessories, setSelectedAccessories] = useState([]);
  const [completingLook, setCompletingLook] = useState(false);

  const sectionRefs = {
    top: useRef(null),
    bottom: useRef(null),
    shoes: useRef(null),
    accessories: useRef(null),
  };

  useEffect(() => {
    const fetchCategory = async (endpoint) => {
      try {
        const { data } = await api.get(`/products/category/${endpoint}`);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error(`Failed to load ${endpoint}:`, error);
        return [];
      }
    };

    const fetchProducts = async () => {
      try {
        setLoading(true);

        const results = await Promise.all(
          Object.entries(CATEGORY_ENDPOINTS).map(async ([key, endpoints]) => {
            const lists = await Promise.all(endpoints.map(fetchCategory));

            // A product can be listed under both "tops" and "formals".
            const unique = new Map();
            lists.flat().forEach((product) => unique.set(product._id, product));

            return [key, [...unique.values()]];
          })
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
   * STEP 1 - TOPS / DRESSES
   * -------------------------------------------------------
   * "Tops" and "Full Dresses" are kept as two separate lists so a dress
   * never shows up while picking a top (and vice versa), even if a seller
   * mistakenly tagged a product with both categories.
   */
  const wearableTops = useMemo(
    () => products.tops.filter((product) => !product.category?.includes("dresses")),
    [products.tops]
  );

  const wearableDresses = useMemo(
    () => products.dresses.filter((product) => product.category?.includes("dresses")),
    [products.dresses]
  );

  const topFilters = useMemo(() => {
    const present = new Set(
      wearableTops.map((product) => getSubtype(product, "tops").key)
    );

    const filters = SUBTYPES.tops.map(({ key, label }) => ({ key, label }));

    if (present.has(OTHER_SUBTYPE.key)) {
      filters.push(OTHER_SUBTYPE);
    }

    return filters;
  }, [wearableTops]);

  const visibleTops = useMemo(
    () =>
      topFilter === "all"
        ? wearableTops
        : wearableTops.filter(
            (product) => getSubtype(product, "tops").key === topFilter
          ),
    [wearableTops, topFilter]
  );

  /*
   * -------------------------------------------------------
   * STEP 2 - BOTTOMS (scored against the top)
   * -------------------------------------------------------
   * Dresses are a complete outfit on their own, so this step is skipped
   * when a dress is selected. minScore: 0 means every bottom that matches
   * the gender filter is shown - the score only decides sort order/badge,
   * it never hides an item.
   */
  const genderFilteredBottoms = useMemo(
    () => products.bottoms.filter((product) => matchesGender(product, bottomGender)),
    [products.bottoms, bottomGender]
  );

  const bottomGroups = useMemo(() => {
    if (!selectedTop || isDressSelected) return [];
    return groupBySubtype(
      rankCandidates(genderFilteredBottoms, [selectedTop], 0),
      "bottoms"
    );
  }, [genderFilteredBottoms, selectedTop, isDressSelected]);

  const activeBottomGroup =
    bottomGroups.find((group) => group.key === bottomType) || bottomGroups[0];

  /*
   * -------------------------------------------------------
   * STEP 3 - SHOES (scored against the outfit so far)
   * -------------------------------------------------------
   */
  const outfitBase = [selectedTop, selectedBottom].filter(Boolean);
  const readyForShoes = isDressSelected ? !!selectedTop : !!selectedTop && !!selectedBottom;

  const shoeOptions = useMemo(() => {
    if (!readyForShoes) return [];
    return rankCandidates(products.shoes, outfitBase);
  }, [products.shoes, readyForShoes, selectedTop, selectedBottom]);

  /*
   * -------------------------------------------------------
   * STEP 4 - ACCESSORIES (scored against top + bottom + shoes)
   * -------------------------------------------------------
   */
  const accessoryOptions = useMemo(() => {
    if (!readyForShoes || !selectedShoes) return [];
    return rankCandidates(products.accessories, [...outfitBase, selectedShoes]);
  }, [products.accessories, readyForShoes, selectedShoes, selectedTop, selectedBottom]);

  /*
   * -------------------------------------------------------
   * SELECTION HANDLERS
   * -------------------------------------------------------
   * Changing an earlier step re-ranks every later step, so later
   * selections are cleared to keep the outfit consistent.
   */
  const clearAfterTop = () => {
    setBottomType(null);
    setBottomGender("all");
    setSelectedBottom(null);
    setSelectedShoes(null);
    setSelectedAccessories([]);
  };

  const selectTop = (product, fromDresses = false) => {
    if (selectedTop?._id === product._id) {
      setSelectedTop(null);
      setIsDressSelected(false);
    } else {
      setSelectedTop(product);
      setIsDressSelected(fromDresses);
    }

    clearAfterTop();
  };

  const selectTopMode = (mode) => {
    setTopMode(mode);
    setTopFilter("all");

    if (selectedTop) {
      setSelectedTop(null);
      setIsDressSelected(false);
      clearAfterTop();
    }
  };

  const selectBottomType = (key) => {
    setBottomType(key);

    if (selectedBottom && getSubtype(selectedBottom, "bottoms").key !== key) {
      setSelectedBottom(null);
      setSelectedShoes(null);
      setSelectedAccessories([]);
    }
  };

  const selectBottom = (product) => {
    setSelectedBottom(selectedBottom?._id === product._id ? null : product);
    setSelectedShoes(null);
    setSelectedAccessories([]);
  };

  const selectShoes = (product) => {
    setSelectedShoes(selectedShoes?._id === product._id ? null : product);
    setSelectedAccessories([]);
  };

  /*
   * Accessories are optional and multi-select, with one piece per
   * accessory type (picking a second bag replaces the first).
   */
  const toggleAccessory = (product) => {
    setSelectedAccessories((previous) => {
      if (previous.some((item) => item._id === product._id)) {
        return previous.filter((item) => item._id !== product._id);
      }

      const type = getSubtype(product, "accessories").key;

      return [
        ...previous.filter(
          (item) =>
            type === OTHER_SUBTYPE.key ||
            getSubtype(item, "accessories").key !== type
        ),
        product,
      ];
    });
  };

  const resetBuilder = () => {
    setSelectedTop(null);
    setIsDressSelected(false);
    setTopMode("tops");
    setTopFilter("all");
    clearAfterTop();
    sectionRefs.top.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollTo = (key) => {
    sectionRefs[key].current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  /*
   * -------------------------------------------------------
   * OUTFIT SUMMARY
   * -------------------------------------------------------
   */
  const selectedBag = selectedAccessories.find(
    (item) => getSubtype(item, "accessories").key === "bag"
  );

  const otherAccessories = selectedAccessories.filter(
    (item) => item !== selectedBag
  );

  const outfitPieces = [
    selectedTop,
    selectedBottom,
    selectedShoes,
    ...selectedAccessories,
  ].filter(Boolean);

  const totalPrice = outfitPieces.reduce(
    (total, product) => total + getPrice(product),
    0
  );

  const averageMatch = useMemo(() => {
    const scored = [selectedBottom, selectedShoes, ...selectedAccessories]
      .filter(Boolean)
      .map((item) => item.compatibilityScore || 0);

    if (!scored.length) return null;

    return Math.round(
      scored.reduce((sum, value) => sum + value, 0) / scored.length
    );
  }, [selectedBottom, selectedShoes, selectedAccessories]);

  const outfitMessage = (() => {
    if (!selectedTop) return "Pick a top or a full dress to start building your look.";
    if (!isDressSelected && !selectedBottom) return "Great choice! Now pick a matching bottom.";
    if (!selectedShoes) return "Almost there - choose a pair of shoes.";
    if (averageMatch >= 70) return "A stylish, balanced outfit — just for you!";
    return "A fresh, easy-going outfit — just for you!";
  })();

  const summaryRows = [
    {
      key: "top",
      label: isDressSelected ? "Dress" : "Top",
      items: selectedTop ? [selectedTop] : [],
    },
    { key: "bottom", label: "Bottom", items: selectedBottom ? [selectedBottom] : [] },
    { key: "shoes", label: "Shoes", items: selectedShoes ? [selectedShoes] : [] },
    { key: "accessories", label: "Bag", items: selectedBag ? [selectedBag] : [] },
    { key: "accessories", label: "Accessories", items: otherAccessories },
  ].filter((row) => row.key !== "bottom" || !isDressSelected);

  /*
   * -------------------------------------------------------
   * COMPLETE LOOK -> CHECKOUT
   * -------------------------------------------------------
   * Adds every selected piece to the (server-backed) cart,
   * then redirects to checkout so the order summary there
   * reflects the completed outfit.
   */
  const handleCompleteLook = async () => {
    if (!localStorage.getItem("token")) {
      showToast("Log in to complete your look", "error");
      navigate("/login");
      return;
    }

    try {
      setCompletingLook(true);

      for (const product of outfitPieces) {
        await cart.addItem(product._id, 1);
      }

      navigate("/checkout");
    } catch (error) {
      showToast(
        error.response?.data?.message || "Couldn't add your look to the cart",
        "error"
      );
    } finally {
      setCompletingLook(false);
    }
  };

  /*
   * -------------------------------------------------------
   * SAVE OUTFIT -> DRAFT COLLECTION
   * -------------------------------------------------------
   * Stores the current selection as a named draft the user can revisit
   * later from "My Saved Outfits", without adding anything to the cart.
   */
  const handleSaveOutfit = async () => {
    if (!localStorage.getItem("token")) {
      showToast("Log in to save this outfit", "error");
      navigate("/login");
      return;
    }

    try {
      setSavingOutfit(true);

      await savedOutfits.save({
        name: `${selectedTop.name} Look`,
        top: selectedTop._id,
        isDress: isDressSelected,
        bottom: selectedBottom?._id,
        shoes: selectedShoes._id,
        accessories: selectedAccessories.map((item) => item._id),
      });

      showToast("Outfit saved! View it in My Saved Outfits.", "success");
    } catch (error) {
      showToast(
        error.response?.data?.message || "Couldn't save this outfit",
        "error"
      );
    } finally {
      setSavingOutfit(false);
    }
  };

  return (
    <div className="ob-page">
      <div className="ob-layout">
        {/* ================= LEFT: STEPS ================= */}
        <div className="ob-main">
          <header className="ob-header">
            <div>
              <h1>Outfit Builder</h1>
              <p>
                Pick a top (or a full dress), and we'll suggest the best
                matching bottoms, shoes and accessories for a stylish
                complete look!
              </p>
            </div>

            {selectedTop && (
              <button type="button" className="ob-reset" onClick={resetBuilder}>
                <RotateCcw size={15} />
                Start Over
              </button>
            )}
          </header>

          {/* STEP 1 - TOP / DRESS */}
          <section className="ob-step" ref={sectionRefs.top}>
            <StepTitle
              number={1}
              title="Select a"
              highlight={topMode === "dresses" ? "DRESS" : "TOP"}
            />

            {loading ? (
              <div className="ob-status">Finding your fashion pieces...</div>
            ) : (
              <>
                <div className="ob-filters">
                  <button
                    type="button"
                    className={topMode === "tops" ? "active" : ""}
                    onClick={() => selectTopMode("tops")}
                  >
                    Tops
                  </button>
                  <button
                    type="button"
                    className={topMode === "dresses" ? "active" : ""}
                    onClick={() => selectTopMode("dresses")}
                  >
                    Full Dresses
                  </button>
                </div>

                {topMode === "tops" && (
                  <div className="ob-filters">
                    <button
                      type="button"
                      className={topFilter === "all" ? "active" : ""}
                      onClick={() => setTopFilter("all")}
                    >
                      All
                    </button>

                    {topFilters.map((filter) => (
                      <button
                        type="button"
                        key={filter.key}
                        className={topFilter === filter.key ? "active" : ""}
                        onClick={() => setTopFilter(filter.key)}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                )}

                {topMode === "tops" ? (
                  visibleTops.length ? (
                    <div className="ob-grid">
                      {visibleTops.map((product) => (
                        <OptionCard
                          key={product._id}
                          image={getImage(product)}
                          label={product.name}
                          selected={selectedTop?._id === product._id && !isDressSelected}
                          onClick={() => selectTop(product, false)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="ob-status">No tops in this style yet.</div>
                  )
                ) : wearableDresses.length ? (
                  <div className="ob-grid">
                    {wearableDresses.map((product) => (
                      <OptionCard
                        key={product._id}
                        image={getImage(product)}
                        label={product.name}
                        selected={selectedTop?._id === product._id && isDressSelected}
                        onClick={() => selectTop(product, true)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="ob-status">No dresses available yet.</div>
                )}

                {selectedTop && (
                  <div className="ob-info">
                    <Sparkles size={18} />
                    <p>
                      {isDressSelected
                        ? "A dress is a complete outfit on its own - we'll jump straight to shoes."
                        : "We'll now find compatible bottoms using a rule-based matching system + weighted sum model."}
                    </p>
                  </div>
                )}
              </>
            )}
          </section>

          {/* STEP 2 - BOTTOMS */}
          {!isDressSelected && (
            <section
              className={`ob-step ${selectedTop ? "" : "locked"}`}
              ref={sectionRefs.bottom}
            >
              <StepTitle number={2} title="Compatible" highlight="BOTTOMS" />

              {!selectedTop ? (
                <div className="ob-status">Select a top to see matching bottoms.</div>
              ) : (
                <>
                  <div className="ob-filters">
                    <button
                      type="button"
                      className={bottomGender === "all" ? "active" : ""}
                      onClick={() => setBottomGender("all")}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      className={bottomGender === "female" ? "active" : ""}
                      onClick={() => setBottomGender("female")}
                    >
                      Women
                    </button>
                    <button
                      type="button"
                      className={bottomGender === "male" ? "active" : ""}
                      onClick={() => setBottomGender("male")}
                    >
                      Men
                    </button>
                  </div>

                  {!bottomGroups.length ? (
                    <div className="ob-status">
                      No bottoms found for this filter. Try another category or top.
                    </div>
                  ) : (
                    <>
                      <div className="ob-grid">
                        {bottomGroups.map((group) => (
                          <OptionCard
                            key={group.key}
                            image={getImage(group.items[0])}
                            label={group.label}
                            badge={`${group.items[0].compatibilityScore}%`}
                            selected={activeBottomGroup?.key === group.key}
                            onClick={() => selectBottomType(group.key)}
                          />
                        ))}
                      </div>

                      <div className="ob-arrow">
                        <ArrowDown size={16} />
                      </div>

                      <div className="ob-subpanel">
                        <h3>Select a bottom ({activeBottomGroup.items.length} available)</h3>

                        <Carousel>
                          {activeBottomGroup.items.map((product) => (
                            <OptionCard
                              key={product._id}
                              image={getImage(product)}
                              label={product.name}
                              badge={`${product.compatibilityScore}%`}
                              selected={selectedBottom?._id === product._id}
                              onClick={() => selectBottom(product)}
                              compact
                            />
                          ))}
                        </Carousel>
                      </div>
                    </>
                  )}
                </>
              )}
            </section>
          )}

          {/* STEP 3 - SHOES */}
          <section
            className={`ob-step ${readyForShoes ? "" : "locked"}`}
            ref={sectionRefs.shoes}
          >
            <StepTitle number={3} title="Compatible" highlight="SHOES" />

            {!readyForShoes ? (
              <div className="ob-status">
                {isDressSelected
                  ? "Select a dress to see matching shoes."
                  : "Select a bottom to see matching shoes."}
              </div>
            ) : !shoeOptions.length ? (
              <div className="ob-status">No compatible shoes found for this look.</div>
            ) : (
              <>
                <div className="ob-grid">
                  {shoeOptions.map((product) => (
                    <OptionCard
                      key={product._id}
                      image={getImage(product)}
                      label={product.name}
                      badge={`${product.compatibilityScore}%`}
                      selected={selectedShoes?._id === product._id}
                      onClick={() => selectShoes(product)}
                    />
                  ))}
                </div>

                <p className="ob-hint">Select a shoe</p>
              </>
            )}
          </section>

          {/* STEP 4 - ACCESSORIES */}
          <section
            className={`ob-step ${selectedShoes ? "" : "locked"}`}
            ref={sectionRefs.accessories}
          >
            <StepTitle number={4} title="Compatible" highlight="ACCESSORIES" />

            {!selectedShoes ? (
              <div className="ob-status">Select shoes to see matching accessories.</div>
            ) : !accessoryOptions.length ? (
              <div className="ob-status">No compatible accessories found for this look.</div>
            ) : (
              <>
                <div className="ob-grid ob-grid-small">
                  {accessoryOptions.map((product) => (
                    <OptionCard
                      key={product._id}
                      image={getImage(product)}
                      label={product.name}
                      badge={`${product.compatibilityScore}%`}
                      selected={selectedAccessories.some(
                        (item) => item._id === product._id
                      )}
                      onClick={() => toggleAccessory(product)}
                    />
                  ))}
                </div>

                <p className="ob-hint">Select accessories (optional)</p>
              </>
            )}
          </section>
        </div>

        {/* ================= RIGHT: OUTFIT PREVIEW ================= */}
        <aside className="ob-preview">
          <h2>Your Complete Outfit</h2>

          <div className="ob-collage">
            {outfitPieces.length ? (
              <>
                <div className="ob-collage-main">
                  {selectedTop && (
                    <img src={getImage(selectedTop)} alt={selectedTop.name} onError={handleImageError} />
                  )}
                  {selectedBottom && (
                    <img src={getImage(selectedBottom)} alt={selectedBottom.name} onError={handleImageError} />
                  )}
                </div>

                <div className="ob-collage-side">
                  {otherAccessories.map((item) => (
                    <img key={item._id} src={getImage(item)} alt={item.name} onError={handleImageError} />
                  ))}
                  {selectedBag && (
                    <img src={getImage(selectedBag)} alt={selectedBag.name} onError={handleImageError} />
                  )}
                  {selectedShoes && (
                    <img src={getImage(selectedShoes)} alt={selectedShoes.name} onError={handleImageError} />
                  )}
                </div>
              </>
            ) : (
              <div className="ob-collage-empty">
                <Shirt size={40} />
                <span>Your outfit will appear here</span>
              </div>
            )}
          </div>

          <h3>Items Selected</h3>

          <div className="ob-summary">
            {summaryRows.map((row) => (
              <button
                type="button"
                key={row.label}
                className={`ob-summary-row ${row.items.length ? "" : "empty"}`}
                onClick={() => scrollTo(row.key)}
              >
                <div className="ob-summary-thumb">
                  {row.items[0] ? (
                    <img
                      src={getImage(row.items[0])}
                      alt={row.items[0].name}
                      onError={handleImageError}
                    />
                  ) : (
                    <span>—</span>
                  )}
                </div>

                <div className="ob-summary-text">
                  <strong>{row.label}</strong>
                  <small>
                    {row.items.length
                      ? row.items.map((item) => item.name).join(" + ")
                      : "Not selected"}
                  </small>
                </div>

                <ChevronRight size={16} />
              </button>
            ))}
          </div>

          <div className="ob-message">
            <Sparkles size={18} />
            <p>
              {outfitMessage}
              {averageMatch !== null && (
                <small>Overall match score: {averageMatch}%</small>
              )}
            </p>
          </div>

          {selectedTop && (
            <>
              <div className="ob-total">
                <span>Estimated Total</span>
                <strong>Rs. {totalPrice.toLocaleString()}</strong>
              </div>

              <button
                type="button"
                className="ob-complete"
                onClick={handleCompleteLook}
                disabled={completingLook || !readyForShoes || !selectedShoes}
              >
                <Sparkles size={17} />
                {completingLook
                  ? "Adding to cart..."
                  : readyForShoes && selectedShoes
                    ? "Complete Look"
                    : isDressSelected
                      ? "Pick shoes to finish"
                      : "Pick a bottom & shoes to finish"}
              </button>

              {readyForShoes && selectedShoes && (
                <button
                  type="button"
                  className="ob-save"
                  onClick={handleSaveOutfit}
                  disabled={savingOutfit}
                >
                  <Bookmark size={16} />
                  {savingOutfit ? "Saving..." : "Save Outfit"}
                </button>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
};

const StepTitle = ({ number, title, highlight }) => (
  <div className="ob-step-title">
    <span className="ob-step-number">{number}</span>
    <h2>
      {title} <em>{highlight}</em>
    </h2>
  </div>
);

const OptionCard = ({ image, label, badge, selected, onClick, compact = false }) => (
  <button
    type="button"
    className={`ob-card ${selected ? "selected" : ""} ${compact ? "compact" : ""}`}
    onClick={onClick}
    title={label}
  >
    <div className="ob-card-image">
      <img src={image} alt={label} onError={handleImageError} />

      {selected && (
        <span className="ob-card-check">
          <Check size={12} strokeWidth={3} />
        </span>
      )}

      {badge && <span className="ob-card-badge">{badge} match</span>}
    </div>

    {!compact && <span className="ob-card-label">{label}</span>}
  </button>
);

const Carousel = ({ children }) => {
  const trackRef = useRef(null);

  const scroll = (direction) => {
    const track = trackRef.current;
    if (!track) return;

    track.scrollBy({ left: direction * track.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <div className="ob-carousel">
      <button type="button" className="ob-carousel-nav" onClick={() => scroll(-1)} aria-label="Previous">
        <ChevronLeft size={18} />
      </button>

      <div className="ob-carousel-track" ref={trackRef}>
        {children}
      </div>

      <button type="button" className="ob-carousel-nav" onClick={() => scroll(1)} aria-label="Next">
        <ChevronRight size={18} />
      </button>
    </div>
  );
};

export default OutfitBuilder;
