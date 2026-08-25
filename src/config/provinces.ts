/**
 * Internal Launch Scoping Configuration
 * Controls supported province datasets for data validation and seeding logic.
 * (User-facing copy remains nationwide Philippine-branded).
 */
export const SUPPORTED_PROVINCES = ['Batangas'] as const;

export type SupportedProvince = typeof SUPPORTED_PROVINCES[number];

/**
 * Checks if a given province is within the active launch dataset.
 */
export function isProvinceSupported(province: string): boolean {
  if (!province) return false;
  const clean = province.trim().toLowerCase();
  return SUPPORTED_PROVINCES.some(p => p.toLowerCase() === clean);
}
