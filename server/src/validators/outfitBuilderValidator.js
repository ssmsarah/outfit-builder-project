export function validateOutfitPayload(payload) {
  const hasTop = Boolean(payload.topId);
  const hasBottom = Boolean(payload.bottomId);
  const hasShoes = Boolean(payload.shoesId);

  if (!hasTop || !hasBottom || !hasShoes) {
    return {
      valid: false,
      message: 'Top, Bottom, and Shoes are required.'
    };
  }

  return {
    valid: true,
    message: 'ok'
  };
}
