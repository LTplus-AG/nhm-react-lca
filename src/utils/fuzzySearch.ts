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
  Holz: ["Brettschichtholz", "Holz"],
  Wood: ["Brettschichtholz", "Holz"],
};

export const getFuzzyMatches = (
  searchTerm: string,
  kbobMaterials: KbobMaterial[],
  limit = 3
): KbobMaterial[] => {
  // First check if the search term contains any mapping keys
  const matchingKey = Object.keys(MATERIAL_MAPPINGS).find((key) =>
    searchTerm.toLowerCase().includes(key.toLowerCase())
  );

  if (matchingKey) {
    const mappedTerms = MATERIAL_MAPPINGS[matchingKey];
    const mappedMatches = kbobMaterials.filter((material) =>
      mappedTerms.some((term) =>
        material.nameDE.toLowerCase().includes(term.toLowerCase())
      )
    );
    if (mappedMatches.length > 0) {
      return mappedMatches;
    }
  }

  // Split search term into words and create a Fuse search for each word
  const searchWords = searchTerm.split(/\s+/).filter((word) => word.length > 0);

  const matches = searchWords.flatMap((word) => {
    const fuse = new Fuse(kbobMaterials, {
      keys: ["nameDE"],
      threshold: 0.3, // stricter threshold for individual words
      includeScore: true,
    });
    return fuse.search(word);
  });

  // Remove duplicate matches (keeping the best score) and sort
  const uniqueMatches = Array.from(
    matches.reduce((map, match) => {
      const existingMatch = map.get(match.item.id);
      if (!existingMatch || existingMatch.score! > match.score!) {
        map.set(match.item.id, match);
      }
      return map;
    }, new Map<string, FuseResult>())
  ).map(([_, match]) => match);

  return uniqueMatches
    .sort((a, b) => (a.score || 1) - (b.score || 1))
    .slice(0, limit)
    .map((result) => result.item);
};
