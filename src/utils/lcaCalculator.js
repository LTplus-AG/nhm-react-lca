import { OutputFormats } from "../types/lca.types";

export class LCACalculator {
  calculateImpact(materials, matches, kbobMaterials, unmodelledMaterials = []) {
    let results = {
      gwp: 0,
      ubp: 0,
      penr: 0,
      modelledMaterials: 0,
      unmodelledMaterials: 0,
    };

    // Calculate impacts for modelled materials
    materials.forEach((material) => {
      const kbobMaterial = kbobMaterials.find(
        (k) => k.id === matches[material.id]
      );
      const impacts = this.calculateMaterialImpact(material, kbobMaterial);

      if (impacts.gwp > 0 || impacts.ubp > 0 || impacts.penr > 0) {
        results.gwp += impacts.gwp;
        results.ubp += impacts.ubp;
        results.penr += impacts.penr;
        results.modelledMaterials += 1;
      } else {
        results.unmodelledMaterials += 1;
      }
    });

    // Calculate impacts for unmodelled materials
    unmodelledMaterials.forEach((material) => {
      const kbobMaterial = kbobMaterials.find((k) => k.id === material.kbobId);
      if (kbobMaterial) {
        const impacts = this.calculateMaterialImpact(material, kbobMaterial);
        results.gwp += impacts.gwp;
        results.ubp += impacts.ubp;
        results.penr += impacts.penr;
        results.unmodelledMaterials += 1;
      }
    });

    return results;
  }

  calculateMaterialImpact(material, kbobMaterial) {
    if (!material || !kbobMaterial) {
      return { gwp: 0, ubp: 0, penr: 0 };
    }

    const volume = material.volume;
    const density = kbobMaterial.density;
    const mass = density ? volume * density : volume;

    return {
      gwp: mass * kbobMaterial.gwp,
      ubp: mass * kbobMaterial.ubp,
      penr: mass * kbobMaterial.penr,
    };
  }

  formatImpact(value, type, includeUnit = false) {
    if (typeof value !== "number") return "0";

    // Format with thousands delimiter and no decimal places
    const formattedNumber = Math.round(value).toLocaleString("de-CH", {
      useGrouping: true,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

    if (includeUnit) {
      const unit =
        type === OutputFormats.GWP
          ? " kg CO₂-eq"
          : type === OutputFormats.UBP
          ? " UBP"
          : type === OutputFormats.PENR
          ? " MJ"
          : "";
      return formattedNumber + unit;
    }

    return formattedNumber;
  }

  calculateGrandTotal(
    materials,
    matches,
    kbobMaterials,
    outputFormat,
    unmodelledMaterials = []
  ) {
    const results = this.calculateImpact(
      materials,
      matches,
      kbobMaterials,
      unmodelledMaterials
    );
    const value = results[outputFormat.toLowerCase()];

    // Format in millions if value is greater than 400'000
    if (value > 400000) {
      const millions = value / 1000000;
      const formattedMillions = millions.toLocaleString("de-CH", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      });
      const unit =
        outputFormat === OutputFormats.GWP
          ? " Mio. kg CO₂-eq"
          : outputFormat === OutputFormats.UBP
          ? " Mio. UBP"
          : outputFormat === OutputFormats.PENR
          ? " Mio. MJ"
          : "";
      return formattedMillions + unit;
    }

    return this.formatImpact(value, outputFormat, true);
  }
}
