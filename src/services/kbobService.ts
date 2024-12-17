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

export async function fetchKBOBMaterials(): Promise<KbobMaterial[]> {
  try {
    console.log("Fetching all KBOB materials");
    let allMaterials: any[] = [];
    let currentPage = 1;
    const pageSize = 10; // API enforces this limit

    const firstResponse = await fetch(
      `${API_URL}?page=${currentPage}&page_size=${pageSize}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    if (!firstResponse.ok) {
      throw new Error(`HTTP error! status: ${firstResponse.status}`);
    }

    const firstData = await firstResponse.json();
    const totalPages = firstData.totalPages || 1;
    allMaterials = [...firstData.materials];

    // Fetch remaining pages
    const remainingPages = Array.from(
      { length: totalPages - 1 },
      (_, i) => i + 2
    );
    const pagePromises = remainingPages.map((page) =>
      fetch(`${API_URL}?page=${page}&page_size=${pageSize}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }).then((response) => {
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
      })
    );

    console.log(`Fetching remaining ${totalPages - 1} pages...`);
    const results = await Promise.all(pagePromises);

    // Combine all materials
    results.forEach((data) => {
      if (data.materials && Array.isArray(data.materials)) {
        allMaterials = [...allMaterials, ...data.materials];
      }
    });

    console.log(
      `Received ${allMaterials.length} materials from ${totalPages} pages`
    );

    // Transform the materials for client-side use
    const transformedMaterials: KbobMaterial[] = allMaterials
      .map((material: any) => ({
        id: material.uuid,
        nameDE: material.nameDE || "",
        nameFR: material.nameFR || "",
        density: parseDensity(material.density),
        unit: material.unit || "",
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
      }))
      .filter((material) => material.nameDE);

    console.log(`Transformed ${transformedMaterials.length} KBOB materials`);
    return transformedMaterials;
  } catch (error) {
    console.error("Error fetching KBOB materials:", error);
    throw error;
  }
}
