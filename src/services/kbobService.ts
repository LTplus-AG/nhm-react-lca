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

function parseDensity(densityStr: string | number | null | undefined): number {
  if (densityStr === null || densityStr === undefined || densityStr === "-")
    return 0;
  if (typeof densityStr === "number") return densityStr;
  const numericValue = parseFloat(densityStr.toString().replace(/[^\d.]/g, ""));
  return isNaN(numericValue) ? 0 : numericValue;
}

// Compute the API base URL using a runtime value if available
const runtimeApiUrl =
  (window as any).__env?.API_URL ||
  (window as any).__env?.VITE_API_URL ||
  "";
const buildtimeApiUrl = import.meta.env.VITE_API_URL || "";

const API_BASE_URL =
  runtimeApiUrl && runtimeApiUrl.trim() !== ""
    ? runtimeApiUrl.trim()
    : buildtimeApiUrl && buildtimeApiUrl.trim() !== ""
    ? buildtimeApiUrl.trim()
    : "http://localhost:5000";

export async function fetchKBOBMaterials(): Promise<KbobMaterial[]> {
  try {
    console.log("Fetching KBOB materials from local DB");
    const url = `${API_BASE_URL}/backend/kbob`;
    console.log("Fetching from URL:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    console.log("Response status:", response.status);
    console.log(
      "Response headers:",
      Object.fromEntries(response.headers.entries())
    );

    if (!response.ok) {
      console.error("KBOB fetch failed:", response.status, response.statusText);
      const errorText = await response.text();
      console.error("Error response body:", errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Get the raw response text first for debugging
    const responseText = await response.text();
    console.log("Raw response text:", responseText);

    // Try to parse the JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (error) {
      console.error("JSON parsing error:", error);
      throw new Error("Failed to parse response as JSON");
    }

    console.log("Raw KBOB response:", data);

    if (!data || !Array.isArray(data.materials)) {
      console.error("Invalid KBOB data format:", data);
      throw new Error("Invalid KBOB data format");
    }

    const transformedMaterials: KbobMaterial[] = data.materials
      .map((material: RawKbobMaterial) => {
        try {
          if (!material || typeof material !== "object") {
            console.warn("Invalid material object:", material);
            return null;
          }

          return {
            id: material.id,
            nameDE: material.nameDE,
            density: parseDensity(material.density),
            unit: material.unit || "kg",
            gwp: material.gwpTotal || 0,
            gwpProduction: material.gwpProduction || 0,
            gwpDisposal: material.gwpDisposal || 0,
            ubp: material.ubp21Total || 0,
            ubpProduction: material.ubpProduction || 0,
            ubpDisposal: material.ubpDisposal || 0,
            penr: material.primaryEnergyNonRenewableTotal || 0,
            biogenicCarbon: material.biogenicCarbon || 0,
          };
        } catch (error) {
          console.error("Error transforming material:", material, error);
          return null;
        }
      })
      .filter(
        (material: KbobMaterial | null): material is KbobMaterial =>
          material !== null && Boolean(material.nameDE?.trim())
      );

    if (transformedMaterials.length === 0) {
      console.warn("No valid KBOB materials found after transformation");
    } else {
      console.log(`Transformed ${transformedMaterials.length} KBOB materials`);
      console.log("Sample transformed material:", transformedMaterials[0]);
    }

    return transformedMaterials;
  } catch (error) {
    console.error("Failed to fetch KBOB materials:", error);
    throw error;
  }
}
