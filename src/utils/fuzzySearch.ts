import Fuse from "fuse.js";
import { KbobMaterial } from "../types/lca.types";

export interface FuseResult {
  item: KbobMaterial;
  refIndex: number;
  score?: number;
}

export const MATERIAL_MAPPINGS: Record<string, string[]> = {
  Beton: ["Hochbaubeton"],
  Concrete: ["Hochbaubeton"],
  Holz: ["Brettschichtholz"],
  Wood: ["Brettschichtholz"],
  Stahl: ["Stahlprofil"],
  Steel: ["Stahlprofil"],
  // Add common variations and misspellings
  Timber: ["Brettschichtholz"],
  Metal: ["Stahlprofil"],
  "Steel Beam": ["Stahlprofil"],
  "Steel Profile": ["Stahlprofil"],
  Glulam: ["Brettschichtholz"],
  "Glued Laminated Timber": ["Brettschichtholz"],
};

export const getFuzzyMatches = (
  searchTerm: string,
  kbobMaterials: KbobMaterial[],
  limit = 3
): KbobMaterial[] => {
  // Track used material IDs to avoid duplicates
  const usedMaterialIds = new Set<string>();
  const results: KbobMaterial[] = [];

  // First check if the search term contains any mapping keys
  const matchingKeys = Object.keys(MATERIAL_MAPPINGS).filter((key) =>
    searchTerm.toLowerCase().includes(key.toLowerCase())
  );

  // Handle exact matches first
  if (matchingKeys.length > 0) {
    const mappedTerms = new Set(
      matchingKeys.flatMap((key) => MATERIAL_MAPPINGS[key])
    );

    const mappedMatches = kbobMaterials.filter((material) =>
      Array.from(mappedTerms).some((term) =>
        material.nameDE.toLowerCase().includes(term.toLowerCase())
      )
    );

    // Add exact matches first, avoiding duplicates
    for (const match of mappedMatches) {
      if (!usedMaterialIds.has(match.id) && results.length < limit) {
        results.push(match);
        usedMaterialIds.add(match.id);
      }
    }

    // If we have enough exact matches, return them
    if (results.length >= limit) {
      return results;
    }
  }

  // Split search term into words and create a Fuse search for each word
  const searchWords = searchTerm
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .map((word) => word.toLowerCase());

  const fuse = new Fuse(kbobMaterials, {
    keys: ["nameDE"],
    threshold: 0.3,
    includeScore: true,
  });

  // Get fuzzy matches for each word
  const allMatches = searchWords.flatMap((word) => fuse.search(word));

  // Sort matches by score and filter out duplicates
  const sortedUniqueMatches = allMatches
    .sort((a, b) => (a.score || 1) - (b.score || 1))
    .filter((match) => !usedMaterialIds.has(match.item.id))
    .reduce((acc: FuseResult[], curr) => {
      if (!usedMaterialIds.has(curr.item.id)) {
        usedMaterialIds.add(curr.item.id);
        acc.push(curr);
      }
      return acc;
    }, []);

  // Add remaining fuzzy matches up to the limit
  for (const match of sortedUniqueMatches) {
    if (results.length < limit) {
      results.push(match.item);
    } else {
      break;
    }
  }

  return results;
};
