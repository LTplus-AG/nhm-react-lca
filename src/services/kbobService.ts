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

  const numericValue = parseFloat(densityStr.replace(/[^\d.]/g, ""));
  return isNaN(numericValue) ? 0 : numericValue;
}

// Add retry logic and delay between requests
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchKBOBMaterials(): Promise<KbobMaterial[]> {
  const maxRetries = 3;
  const retryDelay = 1000; // 1 second delay between retries

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `Fetching all KBOB materials (attempt ${attempt}/${maxRetries})`
      );

      // Single request with pageSize=all
      const response = await fetch(`${API_URL}?pageSize=all`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        if (response.status === 429) {
          console.log(`Rate limited, waiting ${retryDelay}ms before retry...`);
          await delay(retryDelay);
          continue;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.materials || !Array.isArray(data.materials)) {
        throw new Error("Invalid response format");
      }

      // Transform and return materials
      const transformedMaterials: KbobMaterial[] = data.materials
        .map((material: any) => ({
          id: material.uuid,
          nameDE: material.nameDE || "",
          density: parseDensity(material.density),
          unit: material.unit || "",
          gwp: material.gwpTotal || 0,
          ubp: material.ubp21Total || 0,
          penr: material.primaryEnergyNonRenewableTotal || 0,
        }))
        .filter((material) => material.nameDE);

      console.log(
        `Successfully fetched ${transformedMaterials.length} KBOB materials`
      );
      return transformedMaterials;
    } catch (error) {
      if (attempt === maxRetries) {
        console.error("Error fetching KBOB materials:", error);
        throw error;
      }
      console.log(`Attempt ${attempt} failed, retrying in ${retryDelay}ms...`);
      await delay(retryDelay);
    }
  }

  throw new Error("Failed to fetch KBOB materials after all retries");
}
