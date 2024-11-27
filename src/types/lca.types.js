// Define the structure of LCA input data
export const MaterialTypes = {
  WOOD: "wood",
  STEEL: "steel",
  CONCRETE: "concrete",
  GLASS: "glass",
  // Add more materials as needed
};

// Example environmental impact factors (simplified)
export const ImpactFactors = {
  [MaterialTypes.WOOD]: { co2: 1.6, energy: 10 }, // kg CO2/kg, MJ/kg
  [MaterialTypes.STEEL]: { co2: 2.8, energy: 25 },
  [MaterialTypes.CONCRETE]: { co2: 0.9, energy: 1.5 },
  [MaterialTypes.GLASS]: { co2: 1.5, energy: 15 },
};

export const OutputFormats = {
  GWP: "GWP",
  UBP: "UBP",
  PENR: "PENR",
};

export const OutputFormatLabels = {
  [OutputFormats.GWP]: "GWP (kg CO₂-eq)",
  [OutputFormats.UBP]: "UBP (Punkte)",
  [OutputFormats.PENR]: "PEnr (MJ)",
};

const AllModelledMaterials = [
  { id: 1, name: "Beton C25/30", volume: 125.5 },
  { id: 2, name: "Bewehrungsstahl", volume: 12.3 },
  { id: 3, name: "Holz (Fichte/Tanne)", volume: 45.8 },
  { id: 4, name: "Mauerwerk (Backstein)", volume: 78.2 },
  { id: 5, name: "Aluminium (Profil)", volume: 2.8 },
  { id: 6, name: "Glas (Mehrscheiben-Isolierglas)", volume: 8.4 },
  { id: 7, name: "Gipskartonplatte", volume: 34.6 },
  { id: 8, name: "Mineralwolle", volume: 56.2 },
  { id: 9, name: "Holzwerkstoffplatte (OSB)", volume: 23.7 },
  { id: 10, name: "Stahlblech (verzinkt)", volume: 4.2 },
  { id: 11, name: "Kupfer (Rohr)", volume: 1.5 },
  { id: 12, name: "PVC (Rohr)", volume: 3.1 },
  { id: 13, name: "Estrich (zementgebunden)", volume: 42.8 },
  { id: 14, name: "Naturstein (Granit)", volume: 15.6 },
  { id: 15, name: "Keramik (Fliesen)", volume: 6.9 },
  { id: 16, name: "Holz (Eiche)", volume: 18.4 },
  { id: 17, name: "Beton (Leichtbeton)", volume: 95.3 },
  { id: 18, name: "Stahl (Träger)", volume: 28.7 },
  { id: 19, name: "Dämmmaterial (EPS)", volume: 67.2 },
  { id: 20, name: "Bitumenbahn", volume: 5.4 },
  { id: 21, name: "Holz (Lärche)", volume: 31.8 },
  { id: 22, name: "Aluminium (Blech)", volume: 1.9 },
  { id: 23, name: "Glas (Einscheiben-Sicherheitsglas)", volume: 4.7 },
  { id: 24, name: "Zink (Blech)", volume: 2.3 },
  { id: 25, name: "Beton (Sichtbeton)", volume: 156.4 },
];

function getRandomMaterials(min = 3, max = 8) {
  // Get random number of materials between min and max
  const count = Math.floor(Math.random() * (max - min + 1)) + min;

  // Create a copy of the array to shuffle
  const shuffled = [...AllModelledMaterials];

  // Fisher-Yates shuffle algorithm
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Take the first 'count' elements
  return shuffled.slice(0, count);
}

export const ModelledMaterials = getRandomMaterials();

export const UnmodelledMaterials = [
  {
    id: 101,
    kbobId: "",
    name: "Aushub, nicht kontaminiert",
    volume: 123.4,
    ebkp: "B06.01",
  },
];

// EBKP codes for materials
export const EBKPCodes = {
  C01: "C01",
  "C02.01": "C02.01",
  "C02.02": "C02.02",
  C03: "C03",
  "C04.01": "C04.01",
  "C04.08": "C04.08",
  D01: "D01",
  D05: "D05",
  D08: "D08",
  E01: "E01",
  E02: "E02",
  E03: "E03",
};

// KBOB materials database with all impact types
export const KBOBMaterials = [
  {
    id: 1,
    name: "B- und K-Schichten WHS",
    thg: 250, // kg CO2-eq
    ubp: 180000, // UBP (scaled to 1000 in display)
    energy: 1500, // MJ
  },
  {
    id: 2,
    name: "2-Komponenten Klebstoff",
    thg: 180,
    ubp: 150000,
    energy: 1200,
  },
  {
    id: 3,
    name: "unassigned",
    thg: 0,
    ubp: 0,
    energy: 0,
  },
];
