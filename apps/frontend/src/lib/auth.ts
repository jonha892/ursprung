// Deprecated file: kept only for isDev helper to avoid large refactor footprint right now.
// New code should import from user_service.ts
export { userService } from "./user_service.ts";
export type { User, LoginResponse } from "./user_service.ts";

export function isDev() {
  return import.meta.env?.MODE === "development" || import.meta.env?.DEV;
}
