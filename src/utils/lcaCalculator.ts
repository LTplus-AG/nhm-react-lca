import {
  OutputFormats,
  Material,
  UnmodelledMaterial,
  KbobMaterial,
  ImpactResults,
  MaterialImpact,
} from "../types/lca.types";

export class LCACalculator {
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

  calculateImpact(
    materials: Material[],
    matches: Record<string, string>,
    kbobMaterials: KbobMaterial[],
    unmodelledMaterials: UnmodelledMaterial[] = [],
    materialDensities: Record<string, number> = {}
  ): ImpactResults {
    const results: ImpactResults = {
      gwp: 0,
      ubp: 0,
      penr: 0,
      modelledMaterials: 0,
      unmodelledMaterials: 0,
    };

    // Create a Map for faster lookups
    const kbobMaterialMap = new Map(kbobMaterials.map((k) => [k.id, k]));

    // Calculate impacts for modelled materials
    for (const material of materials) {
      console.log("Processing material:", material);
      const kbobMaterial = kbobMaterialMap.get(matches[material.id]);
      console.log("Found KBOB material:", kbobMaterial);
      const impacts = this.calculateMaterialImpact(
        material,
        kbobMaterial,
        materialDensities
      );
      console.log("Calculated impacts:", impacts);

      if (impacts.gwp > 0 || impacts.ubp > 0 || impacts.penr > 0) {
        results.gwp += impacts.gwp;
        results.ubp += impacts.ubp;
        results.penr += impacts.penr;
        results.modelledMaterials += 1;
      } else {
        results.unmodelledMaterials += 1;
      }
    }

    // Calculate impacts for unmodelled materials
    for (const material of unmodelledMaterials) {
      const kbobMaterial = kbobMaterialMap.get(material.kbobId);
      if (kbobMaterial) {
        const impacts = this.calculateMaterialImpact(
          material,
          kbobMaterial,
          materialDensities
        );
        results.gwp += impacts.gwp;
        results.ubp += impacts.ubp;
        results.penr += impacts.penr;
        results.unmodelledMaterials += 1;
      }
    }

    console.log("Final results:", results);
    return results;
  }

  calculateMaterialImpact(
    material: Material | UnmodelledMaterial | null,
    kbobMaterial: KbobMaterial | undefined,
    materialDensities?: Record<string, number>
  ): MaterialImpact {
    if (!material || !kbobMaterial) {
      console.log("Missing material or KBOB material:", {
        material,
        kbobMaterial,
      });
      return { gwp: 0, ubp: 0, penr: 0 };
    }

    // Use custom density if available, otherwise fallback to KBOB material density
    const density = materialDensities?.[material.id] || kbobMaterial.density;
    const volume = typeof material.volume === "number" ? material.volume : 0;
    const mass = volume * density;

    console.log("Calculating impact with:", {
      density,
      volume,
      mass,
      gwp: kbobMaterial.gwp,
      ubp: kbobMaterial.ubp,
      penr: kbobMaterial.penr,
    });

    return {
      gwp: mass * kbobMaterial.gwp,
      ubp: mass * kbobMaterial.ubp,
      penr: mass * kbobMaterial.penr,
    };
  }

  formatImpact(
    value: number | string,
    type: OutputFormats,
    includeUnit = false
  ): string {
    console.log("formatImpact called with:", { value, type, includeUnit });

    if (typeof value !== "number") {
      console.log("Value is not a number, returning 0");
      return "0";
    }

    const formattedNumber = LCACalculator.NUMBER_FORMAT_DE.format(
      Math.round(value)
    );
    console.log("Formatted number:", formattedNumber);

    if (!includeUnit) return formattedNumber;

    const unit = this.getUnitForFormat(type);
    console.log("Unit for format:", unit);

    return formattedNumber + unit;
  }

  private getUnitForFormat(type: OutputFormats): string {
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

  calculateGrandTotal(
    materials: Material[],
    matches: Record<string, string>,
    kbobMaterials: KbobMaterial[],
    outputFormat: OutputFormats,
    unmodelledMaterials: UnmodelledMaterial[] = [],
    materialDensities: Record<string, number> = {},
    directValue?: number
  ): string {
    const value =
      directValue !== undefined
        ? directValue
        : this.calculateImpact(
            materials,
            matches,
            kbobMaterials,
            unmodelledMaterials,
            materialDensities
          )[this.getPropertyNameForFormat(outputFormat)];

    // Format in millions if value is greater than threshold
    if (value > LCACalculator.MILLION_THRESHOLD) {
      return (
        LCACalculator.MILLION_FORMAT_DE.format(value / 1_000_000) + " Mio."
      );
    }

    return this.formatImpact(value, outputFormat);
  }

  // Helper method to get the property name for a given output format
  private getPropertyNameForFormat(
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
        return "gwp"; // Default to GWP if unknown
    }
  }

  formatImpactValue(
    impactResults: ImpactResults,
    outputFormat: OutputFormats,
    showMillions: boolean = true
  ): string {
    console.log("formatImpactValue called with:", {
      impactResults,
      outputFormat,
      showMillions,
    });

    // Get the correct property name based on the outputFormat
    const propertyName = this.getPropertyNameForFormat(outputFormat);

    const value = impactResults[propertyName];
    console.log(
      "Value extracted from impactResults:",
      value,
      "using property:",
      propertyName
    );

    if (showMillions && value > LCACalculator.MILLION_THRESHOLD) {
      const millionValue =
        LCACalculator.MILLION_FORMAT_DE.format(value / 1_000_000) + " Mio.";
      console.log("Formatted as millions:", millionValue);
      return millionValue;
    }

    const result = this.formatImpact(value, outputFormat);
    console.log("Final formatted result:", result);
    return result;
  }
}
