import { OutputFormats, Material, UnmodelledMaterial, KbobMaterial, ImpactResults, MaterialImpact } from "../types/lca.types";

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
    unmodelledMaterials: UnmodelledMaterial[] = []
  ): ImpactResults {
    const results: ImpactResults = {
      gwp: 0,
      ubp: 0,
      penr: 0,
      modelledMaterials: 0,
      unmodelledMaterials: 0,
    };

    // Create a Map for faster lookups
    const kbobMaterialMap = new Map(kbobMaterials.map(k => [k.id, k]));

    // Calculate impacts for modelled materials
    for (const material of materials) {
      const kbobMaterial = kbobMaterialMap.get(matches[material.id]);
      const impacts = this.calculateMaterialImpact(material, kbobMaterial);

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
        const impacts = this.calculateMaterialImpact(material, kbobMaterial);
        results.gwp += impacts.gwp;
        results.ubp += impacts.ubp;
        results.penr += impacts.penr;
        results.unmodelledMaterials += 1;
      }
    }

    return results;
  }

  calculateMaterialImpact(
    material: Material | UnmodelledMaterial | null,
    kbobMaterial: KbobMaterial | undefined
  ): MaterialImpact {
    if (!material || !kbobMaterial) {
      return { gwp: 0, ubp: 0, penr: 0 };
    }

    const mass = kbobMaterial.density ? material.volume * kbobMaterial.density : material.volume;

    return {
      gwp: mass * kbobMaterial.gwp,
      ubp: mass * kbobMaterial.ubp,
      penr: mass * kbobMaterial.penr,
    };
  }

  formatImpact(value: number | string, type: OutputFormats, includeUnit = false): string {
    if (typeof value !== "number") return "0";

    const formattedNumber = LCACalculator.NUMBER_FORMAT_DE.format(Math.round(value));

    if (!includeUnit) return formattedNumber;

    const unit = this.getUnitForFormat(type);
    return formattedNumber + unit;
  }

  private getUnitForFormat(type: OutputFormats): string {
    switch (type) {
      case OutputFormats.GWP:
        return " kg CO₂-eq";
      case OutputFormats.UBP:
        return " UBP";
      case OutputFormats.PENR:
        return " MJ";
      default:
        return "";
    }
  }

  calculateGrandTotal(
    materials: Material[],
    matches: Record<string, string>,
    kbobMaterials: KbobMaterial[],
    outputFormat: OutputFormats,
    unmodelledMaterials: UnmodelledMaterial[] = []
  ): string {
    const results = this.calculateImpact(
      materials,
      matches,
      kbobMaterials,
      unmodelledMaterials
    );
    const value = results[outputFormat];

    // Format in millions if value is greater than threshold
    if (value > LCACalculator.MILLION_THRESHOLD) {
      return LCACalculator.MILLION_FORMAT_DE.format(value / 1_000_000) + " Mio.";
    }

    return this.formatImpact(value, outputFormat);
  }
}
