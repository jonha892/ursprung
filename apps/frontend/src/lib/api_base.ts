// Central place for determining backend API base URL
// Uses Vite env variable VITE_API_BASE or defaults to local backend port 8000.
export function getApiBase() {
  // Vite injects import.meta.env at build time
  // (Typing via deno.jsonc may not include it, so optional chain.)
  // @ts-ignore - env typing may not be present in Deno environment
  return import.meta.env?.VITE_API_BASE || "http://localhost:8000";
}
