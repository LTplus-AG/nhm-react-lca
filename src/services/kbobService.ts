// import rawMaterials from '../data/indicatorsKBOB_v6.json';

const API_BASE_URL = import.meta.env.VITE_API_URL || "";


export interface KbobMaterial {
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



// Simulates the original fetchKBOBMaterials function
// Modify fetchKBOBMaterials to use the new API endpoint
export async function fetchKBOBMaterials(): Promise<KbobMaterial[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/kbob/materials`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const materials = await response.json();
    // The backend now returns data already in the desired KbobMaterial format (or close)
    // Perform any necessary minor transformations if needed, otherwise return directly.
    // Assuming the backend returns objects matching the MaterialLibraryItem structure
    // from dbSeeder, which is very close to KbobMaterial.
    // We might need to adjust field names slightly if they differ.
    // For now, let's assume direct compatibility or minimal adjustment needed.
    return materials as KbobMaterial[]; // Cast or map if necessary
  } catch (error) {
    console.error("Failed to fetch KBOB materials from API:", error);
    // Return empty array or re-throw error based on desired handling
    return [];
  }
}

// Simulates fetching a single material by ID
// This would ideally also use an API endpoint like /api/kbob/materials/:id
// For now, we'll filter the results from the main fetch
export async function fetchKBOBMaterialById(
  id: string
): Promise<KbobMaterial | null> {
  try {
    const allMaterials = await fetchKBOBMaterials(); // Reuse the main fetch
    return allMaterials.find((m) => m.id === id) || null;
  } catch (error) {
    console.error("Failed to fetch KBOB material by ID:", error);
    return null;
  }
}

// Simulates search functionality
// This could also be a backend endpoint /api/kbob/materials?search=term
// For now, we'll filter the results from the main fetch
export async function searchKBOBMaterials(
  searchTerm: string
): Promise<KbobMaterial[]> {
  try {
    const allMaterials = await fetchKBOBMaterials();
    const normalizedSearch = searchTerm.toLowerCase();
    return allMaterials.filter(
      (item) =>
        item.nameDE.toLowerCase().includes(normalizedSearch) ||
        item.id.toString().includes(normalizedSearch)
    );
  } catch (error) {
    console.error("Failed to search KBOB materials:", error);
    return [];
  }
}
