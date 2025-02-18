interface RawKbobMaterial {
  id: string;
  uuid: string;
  nameDE: string;
  nameFR: string;
  density: string;
  unit: string;
  gwpTotal: number;
  gwpProduction: number;
  gwpDisposal: number;
  ubp21Total: number;
  ubpProduction: number;
  ubpDisposal: number;
  primaryEnergyNonRenewableTotal: number;
  biogenicCarbon: number;
}

interface KbobMaterial {
  id: string;
  nameDE: string;
  density: number;
  unit: string;
  gwp: number;
  gwpProduction: number;
  gwpDisposal: number;
  ubp: number;
  ubpProduction: number;
  ubpDisposal: number;
  penr: number;
  biogenicCarbon: number;
}

function parseDensity(densityStr: string | null | undefined): number {
  if (!densityStr) return 0;
  const numericValue = parseFloat(densityStr.replace(/[^\d.]/g, ""));
  return isNaN(numericValue) ? 0 : numericValue;
}

export async function fetchKBOBMaterials(): Promise<KbobMaterial[]> {
  try {
    const response = await fetch("http://localhost:3000/backend/kbob");

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    const transformedMaterials: KbobMaterial[] = data.materials
      .map((material: RawKbobMaterial) => ({
        id: material.uuid,
        nameDE: material.nameDE,
        density: parseDensity(material.density),
        unit: material.unit,
        gwp: material.gwpTotal,
        gwpProduction: material.gwpProduction,
        gwpDisposal: material.gwpDisposal,
        ubp: material.ubp21Total,
        ubpProduction: material.ubpProduction,
        ubpDisposal: material.ubpDisposal,
        penr: material.primaryEnergyNonRenewableTotal,
        biogenicCarbon: material.biogenicCarbon,
      }))
      .filter((material: KbobMaterial) => material.nameDE?.trim());

    return transformedMaterials;
  } catch (error) {
    console.error("Failed to fetch KBOB materials:", error);
    throw error;
  }
}
