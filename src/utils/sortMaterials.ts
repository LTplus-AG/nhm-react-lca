export const sortMaterials = <T extends { volume: number | ""; name: string }>(
  materials: T[],
  sortBy: "volume" | "name" = "volume"
): T[] => {
  return [...materials].sort((a, b) => {
    if (sortBy === "volume") {
      const volA = typeof a.volume === "number" ? a.volume : 0;
      const volB = typeof b.volume === "number" ? b.volume : 0;
      return volB - volA;
    }
    return a.name.localeCompare(b.name);
  });
};
