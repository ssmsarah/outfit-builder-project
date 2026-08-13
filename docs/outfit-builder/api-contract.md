# Outfit Builder API Contract

## Base Path
`/api/outfit-builder`

## Endpoints

### Get step recommendations
`GET /api/outfit-builder/recommendations`

Query params:
- `topId`
- `bottomId`
- `shoesId`
- `category` one of `bottoms`, `shoes`, `accessories`
- `limit`

Response:
- `step`
- `candidates`
- `reasonCodes`
- `compatibilityContext`

### Preview outfit
`POST /api/outfit-builder/preview`

Body:
- `topId`
- `bottomId`
- `shoesId`
- `accessoryIds`

Response:
- `selectedItems`
- `totalPrice`
- `compatibilityScore`
- `ruleBreakdown`
- `warnings`
- `nextRecommendations`

### Save outfit
`POST /api/outfit-builder/save`

Body:
- `name`
- `topId`
- `bottomId`
- `shoesId`
- `accessoryIds`
- `notes`

Response:
- `outfitId`
- `snapshot`
- `createdAt`

### List saved outfits
`GET /api/outfit-builder/saved`

Response:
- list of saved outfit snapshots for the current user

### Update saved outfit
`PATCH /api/outfit-builder/saved/:id`

Body:
- `name`
- `notes`
- optional item replacements

### Delete saved outfit
`DELETE /api/outfit-builder/saved/:id`

### Replace an outfit item
`POST /api/outfit-builder/:id/replace-item`

Body:
- `itemType` one of `top`, `bottom`, `shoes`, `accessory`
- `productId`

Response:
- updated selected outfit
- recalculated price
- recalculated compatibility score
- refreshed recommendations

### Buy now
`POST /api/outfit-builder/buy-now`

Body:
- `topId`
- `bottomId`
- `shoesId`
- `accessoryIds`

Response:
- `cartId` or `orderId`
- pricing confirmation
- stock validation result

## Internal Service Contracts

### RecommendationService
Input:
- selected product ids
- target category
- user context

Output:
- ranked candidates
- reason codes
- rule trace

### CompatibilityService
Input:
- selected items
- active rules

Output:
- final score
- breakdown
- warnings

### PricingService
Input:
- selected items
- discounts
- promotions

Output:
- subtotal
- discountAmount
- finalTotal

## Validation Rules
- Top must be selected before Bottom recommendations are shown.
- Bottom must be selected before Shoes recommendations are shown.
- Shoes must be selected before Accessories recommendations are shown.
- All selected items must be active and in stock.
- Server must recompute total price and score on every mutation.

## Error Model
- `400` invalid category flow
- `401` unauthorized
- `404` product or outfit not found
- `409` stock conflict or invalid replacement
- `500` server error

## Response Principle
The API should always return enough data for the UI to refresh instantly after a replace action: selected items, next recommendations, total price, and compatibility score.