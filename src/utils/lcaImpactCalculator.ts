import {
  Material,
  UnmodelledMaterial,
  KbobMaterial,
  MaterialImpact,
  OutputFormats,
} from "../types/lca.types";
import { DisplayMode } from "./lcaDisplayHelper";

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

  /**
   * Calculates the total impact for all materials
   */
  static calculateTotalImpact(
    materials: Material[],
    matches: Record<string, string>,
    kbobMaterials: KbobMaterial[],
    unmodelledMaterials: UnmodelledMaterial[] = [],
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

    // Calculate for unmodelled materials
    unmodelledMaterials.forEach((material) => {
      if (material.kbobId && typeof material.volume === "number") {
        const kbobMaterial = kbobMaterialMap.get(material.kbobId);
        if (kbobMaterial) {
          const volume = material.volume;
          const density = kbobMaterial.density || 0;
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
