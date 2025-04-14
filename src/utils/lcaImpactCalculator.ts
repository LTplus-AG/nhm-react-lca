import {
  Material,
  UnmodelledMaterial,
  KbobMaterial,
  MaterialImpact,
  OutputFormats,
} from "../types/lca.types";

export class LCAImpactCalculator {
  /**
   * Calculates the environmental impact for a given material
   */
  static calculateMaterialImpact(
    material: Material | UnmodelledMaterial | null,
    kbobMaterial: KbobMaterial | undefined,
    materialDensities?: Record<string, number>
  ): MaterialImpact {
    if (!material || !kbobMaterial) {
      return { gwp: 0, ubp: 0, penr: 0 };
    }

    // Use custom density if available, otherwise fallback to KBOB material density
    const density = materialDensities?.[material.id] || kbobMaterial.density;
    const volume = typeof material.volume === "number" ? material.volume : 0;
    const mass = volume * density;

    return {
      gwp: mass * kbobMaterial.gwp,
      ubp: mass * kbobMaterial.ubp,
      penr: mass * kbobMaterial.penr,
    };
  }

  /**
   * Calculates the total impact for all materials
   */
  static calculateTotalImpact(
    materials: Material[],
    matches: Record<string, string>,
    kbobMaterials: KbobMaterial[],
    materialDensities: Record<string, number> = {},
    outputFormat: OutputFormats = OutputFormats.GWP
  ): number {
    // Create a Map for faster lookups
    const kbobMaterialMap = new Map(kbobMaterials.map((k) => [k.id, k]));
    let totalValue = 0;

    // Calculate for modelled materials
    materials.forEach((material) => {
      const matchedKbobId = matches[material.id];
      if (matchedKbobId) {
        const kbobMaterial = kbobMaterialMap.get(matchedKbobId);
        if (kbobMaterial && typeof material.volume === "number") {
          const volume = material.volume;
          const density =
            materialDensities[material.id] || kbobMaterial.density || 0;
          const mass = volume * density;

          if (mass > 0) {
            switch (outputFormat) {
              case OutputFormats.GWP:
                totalValue += mass * (kbobMaterial.gwp || 0);
                break;
              case OutputFormats.UBP:
                totalValue += mass * (kbobMaterial.ubp || 0);
                break;
              case OutputFormats.PENR:
                totalValue += mass * (kbobMaterial.penr || 0);
                break;
            }
          }
        }
      }
    });

    return totalValue;
  }
}
