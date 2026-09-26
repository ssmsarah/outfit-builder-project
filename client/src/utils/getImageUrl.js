const RAW_API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export const ASSET_BASE_URL = RAW_API_URL.replace(/\/api\/?$/, "");

export const getImageUrl = (path) => {
  if (!path) return path;
  if (/^(https?:|blob:|data:)/i.test(path)) return path;
  return `${ASSET_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
};
