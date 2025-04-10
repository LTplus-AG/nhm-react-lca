import { BUILDING_LIFETIME_YEARS } from "./constants";

// Define display mode type
export type DisplayMode = "total" | "relative";

export class LCADisplayHelper {
  /**
   * Gets the appropriate divisor and suffix for formatting based on display mode and EBF
   */
  static getDivisorAndSuffix(
    displayMode: DisplayMode,
    ebf: number | null
  ): { divisor: number; suffix: string; error?: string } {
    if (displayMode === "relative") {
      if (ebf !== null && ebf > 0) {
        return { divisor: BUILDING_LIFETIME_YEARS * ebf, suffix: "/m²·Jahr" }; // Use middot for clarity
      } else {
        // Return error state if relative mode selected but EBF invalid
        return { divisor: 1, suffix: "", error: "N/A (EBF fehlt)" };
      }
    }
    // Default for 'total' mode
    return { divisor: 1, suffix: "" };
  }

  /**
   * Formats a value based on its magnitude and display mode
   */
  static formatValue(value: number, displayMode: DisplayMode): string {
    // Determine decimals based on mode and value magnitude
    let decimals = 0;
    if (displayMode === "relative" || Math.abs(value) < 1) {
      decimals = 2; // More precision for relative or small values
    } else if (Math.abs(value) < 100) {
      decimals = 1;
    }

    // Format the number
    return new Intl.NumberFormat("de-CH", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping: true,
    }).format(value);
  }
}
