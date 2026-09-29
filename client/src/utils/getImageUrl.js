const RAW_API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export const ASSET_BASE_URL = RAW_API_URL.replace(/\/api\/?$/, "");

export const getImageUrl = (path) => {
  if (!path) return path;
  if (/^(https?:|blob:|data:)/i.test(path)) return path;
  return `${ASSET_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
};

// Inline SVG so a missing image field or a 404'd upload never shows a
// browser "broken image" icon - no extra file to keep in sync with /public.
export const PLACEHOLDER_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
      <rect width="200" height="200" fill="#f6f5f9"/>
      <path d="M60 130 L85 95 L105 118 L130 80 L150 130 Z" fill="#ded7f0"/>
      <circle cx="75" cy="75" r="12" fill="#ded7f0"/>
    </svg>`
  );

// Attach as onError on any <img src={getImageUrl(...)}> to fall back to the
// placeholder instead of leaving a broken-image icon when the URL 404s.
export const handleImageError = (e) => {
  e.currentTarget.onerror = null;
  e.currentTarget.src = PLACEHOLDER_IMAGE;
};
