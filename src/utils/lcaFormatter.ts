import {
  OutputFormats,
  ImpactResults,
  OutputFormatUnits,
} from "../types/lca.types";

export class LCAFormatter {
  private static readonly MILLION_THRESHOLD = 400000;
  private static readonly NUMBER_FORMAT_DE = new Intl.NumberFormat("de-CH", {
    useGrouping: true,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  private static readonly MILLION_FORMAT_DE = new Intl.NumberFormat("de-CH", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  /**
   * Formats an impact value with appropriate number formatting and unit
   */
  static formatImpact(
    value: number | string,
    type: OutputFormats,
    includeUnit = false
  ): string {

    if (typeof value !== "number") {
      return "0";
    }

    const formattedNumber = LCAFormatter.NUMBER_FORMAT_DE.format(
      Math.round(value)
    );

    if (!includeUnit) return formattedNumber;

    const unit = LCAFormatter.getUnitForFormat(type);

    return formattedNumber + unit;
  }

  /**
   * Returns the appropriate unit for a given output format
   */
  static getUnitForFormat(type: OutputFormats): string {
    switch (type) {
      case OutputFormats.GWP:
        return " kg CO₂-eq";
      case OutputFormats.UBP:
        return " UBP";
      case OutputFormats.PENR:
        return " kWh";
      default:
        return "";
    }
  }

  /**
   * Formats impact results with appropriate scaling (e.g., millions)
   */
  static formatImpactValue(
    impactResults: ImpactResults,
    outputFormat: OutputFormats,
    showMillions: boolean = true
  ): string {


    // Get the correct property name based on the outputFormat
    const propertyName = LCAFormatter.getPropertyNameForFormat(outputFormat);

    // Ensure we have a numeric value, default to 0 if undefined
    const value = impactResults[propertyName] || 0;


    // Get the appropriate unit
    const unit = LCAFormatter.getUnitForFormat(outputFormat);

    if (showMillions && value > LCAFormatter.MILLION_THRESHOLD) {
      const millionValue =
        LCAFormatter.MILLION_FORMAT_DE.format(value / 1_000_000) +
        " Mio. " +
        unit;
      return millionValue;
    }

    const result = LCAFormatter.formatImpact(value, outputFormat, true);
    return result;
  }

  /**
   * Helper method to get the property name for a given output format
   */
  private static getPropertyNameForFormat(
    outputFormat: OutputFormats
  ): keyof ImpactResults {
    switch (outputFormat) {
      case OutputFormats.GWP:
        return "gwp";
      case OutputFormats.UBP:
        return "ubp";
      case OutputFormats.PENR:
        return "penr";
      default:
        return "gwp";
    }
  }
}
