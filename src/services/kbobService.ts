import rawMaterials from '../data/indicatorsKBOB_v6.json';

interface RawKbobMaterial {
  KBOB_ID: string | number;
  Name: string;
  GWP: number;
  UBP: number;
  PENRE: number;
  "kg/unit": string | number | null;
  uuid: string | { $binary: { base64: string; subType: string; } };
}

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

// Helper function to parse density
function parseDensity(densityStr: string | number | null | undefined): number {
  if (densityStr === null || densityStr === undefined || densityStr === "-") return 0;
  if (typeof densityStr === "number") return densityStr;
  const numericValue = parseFloat(densityStr.toString().replace(/[^\d.]/g, ""));
  return isNaN(numericValue) ? 0 : numericValue;
}

// Helper to get UUID from the complex object structure
function getUUID(uuidField: string | { $binary: { base64: string; subType: string; } }): string {
  if (typeof uuidField === 'string') return uuidField;
  return uuidField.$binary.base64;
}

// Convert raw material to KbobMaterial format
function convertToKbobMaterial(raw: RawKbobMaterial): KbobMaterial {
  return {
    id: raw.KBOB_ID.toString(),
    nameDE: raw.Name,
    density: parseDensity(raw["kg/unit"]),
    unit: typeof raw["kg/unit"] === "number" ? "kg" : (raw["kg/unit"] || "kg"),
    gwp: raw.GWP || 0,
    gwpProduction: raw.GWP || 0, // Assuming GWP is production value
    gwpDisposal: 0,
    ubp: raw.UBP || 0,
    ubpProduction: raw.UBP || 0, // Assuming UBP is production value
    ubpDisposal: 0,
    penr: raw.PENRE || 0,
    biogenicCarbon: 0
  };
}

// Simulates the original fetchKBOBMaterials function
export async function fetchKBOBMaterials(): Promise<KbobMaterial[]> {
  // Filter out any items that don't have required fields
  const validMaterials = (rawMaterials as RawKbobMaterial[])
    .filter(item => item.KBOB_ID && item.Name)
    .map(convertToKbobMaterial);
  
  return validMaterials;
}

// Simulates fetching a single material by ID
export async function fetchKBOBMaterialById(id: string): Promise<KbobMaterial | null> {
  const material = (rawMaterials as RawKbobMaterial[])
    .find(item => item.KBOB_ID.toString() === id);
  
  return material ? convertToKbobMaterial(material) : null;
}

// Simulates search functionality
export async function searchKBOBMaterials(searchTerm: string): Promise<KbobMaterial[]> {
  const normalizedSearch = searchTerm.toLowerCase();
  
  const filteredMaterials = (rawMaterials as RawKbobMaterial[])
    .filter(item => 
      item.Name.toLowerCase().includes(normalizedSearch) ||
      item.KBOB_ID.toString().includes(normalizedSearch)
    )
    .map(convertToKbobMaterial);

  return filteredMaterials;
}