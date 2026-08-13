# Outfit Builder Architecture

## Goal
Build a rule-based Outfit Builder for a fashion marketplace using the MERN stack. The module must let users assemble an outfit by selecting products from categories in a guided sequence: Top -> Bottom -> Shoes -> Accessories. It must not use AI, virtual try-on, or mannequins.

## Product Experience
The builder should feel like a guided styling flow rather than a standard product grid. At each step, the system shows only the next valid category and updates the current outfit, price, compatibility score, and recommendations instantly when an item changes.

## Recommended Repository Structure
```text
/ecommerce
  /client
    /src
      /app
      /features
        /outfit-builder
          /components
          /hooks
          /pages
          /state
          /types
          /utils
      /shared
      /services
  /server
    /src
      /config
      /controllers
      /models
      /routes
      /services
      /middleware
      /validators
      /utils
  /docs
    /outfit-builder
      architecture.md
      api-contract.md
```

## React Component Structure
Use a page-level builder composed of focused sections.

- OutfitBuilderPage
- OutfitStepNavigator
- ProductCategorySelector
- ProductGrid
- ProductCard
- SelectedOutfitPanel
- OutfitSummaryBar
- CompatibilityScoreMeter
- PriceBreakdown
- RecommendationRail
- ReplaceItemDrawer
- SaveOutfitModal
- BuyOutfitCTA
- FilterBar
- OutfitHistoryPanel

### Responsibilities
- OutfitBuilderPage: loads builder state and owns step orchestration.
- ProductGrid: renders recommended products for the active step.
- SelectedOutfitPanel: shows the selected items as product cards.
- OutfitSummaryBar: shows total price, score, and action buttons.
- ReplaceItemDrawer: lets users swap an item without leaving the builder.
- CompatibilityScoreMeter: visualizes the rule-based score.

## State Management
Use Redux Toolkit for the builder because the state is shared, frequently updated, and derived across multiple components.

### Slices
- catalogSlice: product metadata, filters, pagination.
- outfitSlice: selected top, bottom, shoes, accessories.
- recommendationSlice: recommended products by step.
- uiSlice: active step, drawers, loading, errors.
- userSlice: saved outfits and purchase history.

### State Shape
- selectedItems: top, bottom, shoes, accessories.
- activeStep: top | bottom | shoes | accessories | review.
- recommendations: per category and per selection state.
- outfitPrice: subtotal, discounts, final total.
- compatibilityScore: total score plus rule breakdown.
- validation: stock checks, missing items, mismatch warnings.

## MongoDB Design
Keep catalog data separate from generated outfit state.

### Collections
- users
- products
- categories
- outfits
- outfitRules
- savedOutfits
- carts
- orders
- recommendationLogs

### Product Document
- name
- brand
- categoryId
- subCategory
- genderTarget
- price
- images
- sizes
- colors
- material
- season
- occasion
- styleTags
- colorFamily
- fitType
- fabricWeight
- inventoryCount
- rating
- isActive

### Outfit Document
- userId
- selectedTopId
- selectedBottomId
- selectedShoesId
- selectedAccessoryIds
- compatibilityScore
- totalPrice
- ruleBreakdown
- status
- createdAt
- updatedAt

### Outfit Rule Document
- ruleType
- sourceCategory
- targetCategory
- conditions
- weight
- penalty
- description
- isActive

## Backend Architecture
Use a layered Node.js and Express structure.

### Layers
- Routes: define REST endpoints.
- Controllers: parse requests and shape responses.
- Services: implement recommendation, scoring, pricing, and outfit assembly.
- Models: define MongoDB schemas.
- Middleware: auth, validation, errors, rate limiting.
- Utilities: reusable scoring and matching helpers.

### Core Services
- ProductService
- OutfitService
- RecommendationService
- CompatibilityService
- PricingService
- PurchaseService
- SavedOutfitService

## Recommendation Logic
Use deterministic rules only.

### Matching Inputs
- category compatibility
- color harmony
- style alignment
- season match
- occasion match
- fit balance
- price band consistency
- inventory availability

### Recommendation Flow
1. Collect candidates from the next category.
2. Filter by availability, gender target, season, and occasion.
3. Score each candidate with weighted rules.
4. Sort descending by compatibility score.
5. Return the top candidates with reason codes.

### Reason Codes
- color matched
- style aligned
- season compatible
- occasion compatible
- price band matched
- fit balance matched

## Compatibility Score
Use a 0 to 100 weighted score.

### Suggested Breakdown
- color harmony: 25
- style match: 25
- occasion match: 15
- season match: 10
- fit balance: 10
- price coherence: 10
- stock and quality confidence: 5

### Output
- finalScore
- ruleBreakdown
- warnings
- confidenceLevel

## UI Design Direction
Make the interface feel like a premium styling studio.

### Layout
- Desktop: three-column builder with preview, recommendations, and summary.
- Mobile: stacked single-column flow with a sticky summary bar.

### Visual Direction
- editorial typography
- warm neutral or clean white background
- strong product imagery
- subtle borders and shadows
- one clear accent color for active step and CTAs
- compatibility score shown as a meter

## User Flow
1. User opens Outfit Builder.
2. User selects a Top.
3. System recommends Bottoms.
4. User selects a Bottom.
5. System recommends Shoes.
6. User selects Shoes.
7. System recommends Accessories.
8. User completes the outfit and sees cards, price, and score.
9. User replaces any item and the system recalculates instantly.
10. User saves the outfit or buys the full outfit.

## Replace Item Behavior
When a user replaces an item:
- update the selected item
- refresh all downstream recommendations
- recalculate price
- recalculate compatibility score
- preserve unrelated selections when possible

## Save and Buy Flow
### Save
Persist a snapshot of the outfit so it remains available even if catalog items change later.

### Buy
Convert the full outfit into a cart or order in one click after stock and pricing validation.

## Scalability Notes
- cache recommendation results by selection combination
- store rules in MongoDB so merchandisers can update logic without code changes
- snapshot saved outfits for historical integrity
- log recommendation outcomes for analytics
- denormalize common product metadata for fast filtering

## Implementation Roadmap
1. Define schemas for products, outfits, and rules.
2. Build the builder page shell and product browsing UI.
3. Add Redux Toolkit state for selection and recommendations.
4. Implement REST endpoints for preview and recommendations.
5. Build the rule engine and compatibility scoring.
6. Wire save and buy flows.
7. Add item replacement and instant recalculation.
8. Add responsive polish and error states.
9. Add analytics and caching.

## Next Build Target
After this spec, the next practical step is to create the actual MERN folder scaffold and the initial REST API contract as code stubs.