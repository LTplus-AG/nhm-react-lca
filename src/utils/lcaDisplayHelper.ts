import { ebkpAmortizationPeriods, DEFAULT_AMORTIZATION_YEARS } from "../data/amortizationData";

// Define display mode type
export type DisplayMode = "total" | "relative";

export class LCADisplayHelper {
  /**
   * Gets the appropriate divisor and suffix for formatting based on display mode, EBF and optional eBKP code
   */
  static getDivisorAndSuffix(
    displayMode: DisplayMode,
    ebf: number | null,
    ebkpCode?: string
  ): { divisor: number; suffix: string; error?: string } {
    if (displayMode === "relative") {
      if (ebf !== null && ebf > 0) {
        const years = ebkpCode
          ? ebkpAmortizationPeriods.get(ebkpCode) ?? DEFAULT_AMORTIZATION_YEARS
          : DEFAULT_AMORTIZATION_YEARS;
        return { divisor: years * ebf, suffix: "/m²·Jahr" };
      } else {
        // Return error state if relative mode selected but EBF invalid
        return { divisor: 1, suffix: "", error: "N/A (EBF fehlt)" };
      }
    }
    // Default for 'total' mode
    return { divisor: 1, suffix: "" };
  }
}
