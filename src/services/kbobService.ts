const API_URL = "/api/kbob";

interface KbobMaterial {
  id: string;
  nameDE: string;
  nameFR: string;
  density: number;
  unit: string;
  gwp: number;
  gwpProduction: number;
  gwpDisposal: number;
  ubp: number;
  ubpProduction: number;
  ubpDisposal: number;
  penr: number;
  penrProduction: number;
  penrDisposal: number;
  biogenicCarbon: number;
}

function parseDensity(densityStr: string | null): number {
  if (!densityStr) return 0;
  
  const numericValue = parseFloat(densityStr.replace(/[^\d.]/g, ''));
  return isNaN(numericValue) ? 0 : numericValue;
}

export async function fetchKBOBMaterials(): Promise<KbobMaterial[]> {
  try {
    console.log("Fetching KBOB materials");
    const response = await fetch(API_URL, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error(
        "API response not ok:",
        response.status,
        response.statusText
      );
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Response data:", data);

    if (!data.materials) {
      throw new Error("Failed to fetch KBOB materials");
    }

    // Transform the materials for client-side use
    const transformedMaterials: KbobMaterial[] = data.materials.map((material: any) => ({
      id: material.uuid,
      nameDE: material.nameDE,
      nameFR: material.nameFR,
      density: parseDensity(material.density),
      unit: material.unit,
      gwp: material.gwpTotal || 0,
      gwpProduction: material.gwpProduction || 0,
      gwpDisposal: material.gwpDisposal || 0,
      ubp: material.ubp21Total || 0,
      ubpProduction: material.ubp21Production || 0,
      ubpDisposal: material.ubp21Disposal || 0,
      penr: material.penrTotal || 0,
      penrProduction: material.penrProduction || 0,
      penrDisposal: material.penrDisposal || 0,
      biogenicCarbon: material.biogenicCarbon || 0,
    }));

    console.log("Transformed materials:", transformedMaterials);
    return transformedMaterials;
  } catch (error) {
    console.error("Error fetching KBOB materials:", error);
    throw error;
  }
}
