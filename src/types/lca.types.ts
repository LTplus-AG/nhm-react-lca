// Output format enums and types
export enum OutputFormats {
  GWP = 'gwp',
  UBP = 'ubp',
  PENR = 'penr'
}

export const OutputFormatLabels: Record<OutputFormats, string> = {
  [OutputFormats.GWP]: 'GWP (kg CO₂-eq)',
  [OutputFormats.UBP]: 'UBP (Punkte)',
  [OutputFormats.PENR]: 'PEnr (MJ)'
};

// Material types and interfaces
export enum MaterialTypes {
  WOOD = 'wood',
  STEEL = 'steel',
  CONCRETE = 'concrete',
  GLASS = 'glass'
}

interface ImpactFactor {
  co2: number;
  energy: number;
}

export const ImpactFactors: Record<MaterialTypes, ImpactFactor> = {
  [MaterialTypes.WOOD]: { co2: 1.6, energy: 10 },
  [MaterialTypes.STEEL]: { co2: 2.8, energy: 25 },
  [MaterialTypes.CONCRETE]: { co2: 0.9, energy: 1.5 },
  [MaterialTypes.GLASS]: { co2: 1.5, energy: 15 }
};

// Core interfaces
export interface Material {
  id: string;
  name: string;
  volume: number;
  ebkp?: string;
}

export interface UnmodelledMaterial extends Material {
  kbobId: string;
}

export interface KbobMaterial {
  id: string;
  nameDE: string;
  density: number;
  gwp: number;
  ubp: number;
  penr: number;
  unit: string;
}

export interface ImpactResults {
  gwp: number;
  ubp: number;
  penr: number;
  modelledMaterials: number;
  unmodelledMaterials: number;
}

export interface MaterialImpact {
  gwp: number;
  ubp: number;
  penr: number;
}

export interface NewMaterial {
  kbobId: string;
  name: string;
  volume: string;
  ebkp?: string;
}

// EBKP codes with descriptions
export const EBKPCodes = {
  'C': 'Konstruktion Gebäude',
  'C1': 'Fundamente, Unterboden',
  'C2': 'Wände',
  'C3': 'Stützen',
  'C4': 'Decken, Böden',
  'D': 'Technik Gebäude',
  'D1': 'Elektroanlagen',
  'D2': 'Heizung, Lüftung, Klima',
  'D3': 'Sanitäranlagen',
  'D4': 'Förderanlagen',
  'E': 'Äussere Wandbekleidung Gebäude',
  'E1': 'Aussenwandbekleidungen',
  'E2': 'Fenster, Aussentüren',
  'E3': 'Sonnenschutz',
  'E4': 'Dachbeläge'
} as const;

export type EBKPCode = keyof typeof EBKPCodes;

// Sample data for development
const AllModelledMaterials: Material[] = [
  { id: '1', name: 'Beton C25/30', volume: 125.5 },
  { id: '2', name: 'Bewehrungsstahl', volume: 12.3 },
  { id: '3', name: 'Holz (Fichte/Tanne)', volume: 45.8 },
  { id: '4', name: 'Mauerwerk (Backstein)', volume: 78.2 },
  { id: '5', name: 'Aluminium (Profil)', volume: 2.8 },
  { id: '6', name: 'Glas (Mehrscheiben-Isolierglas)', volume: 8.4 },
  { id: '7', name: 'Gipskartonplatte', volume: 34.6 },
  { id: '8', name: 'Mineralwolle', volume: 56.2 },
  { id: '9', name: 'Holzwerkstoffplatte (OSB)', volume: 23.7 },
  { id: '10', name: 'Stahlblech (verzinkt)', volume: 4.2 },
  { id: '11', name: 'Kupfer (Rohr)', volume: 1.5 },
  { id: '12', name: 'PVC (Rohr)', volume: 3.1 },
  { id: '13', name: 'Estrich (zementgebunden)', volume: 42.8 },
  { id: '14', name: 'Naturstein (Granit)', volume: 15.6 },
  { id: '15', name: 'Keramik (Fliesen)', volume: 6.9 },
  { id: '16', name: 'Holz (Eiche)', volume: 18.4 },
  { id: '17', name: 'Beton (Leichtbeton)', volume: 95.3 },
  { id: '18', name: 'Stahl (Träger)', volume: 28.7 },
  { id: '19', name: 'Dämmmaterial (EPS)', volume: 67.2 },
  { id: '20', name: 'Bitumenbahn', volume: 5.4 },
  { id: '21', name: 'Holz (Lärche)', volume: 31.8 },
  { id: '22', name: 'Aluminium (Blech)', volume: 1.9 },
  { id: '23', name: 'Glas (Einscheiben-Sicherheitsglas)', volume: 4.7 },
  { id: '24', name: 'Zink (Blech)', volume: 2.3 },
  { id: '25', name: 'Beton (Sichtbeton)', volume: 156.4 }
];

function getRandomMaterials(min = 3, max = 8): Material[] {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffled = [...AllModelledMaterials];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, count);
}

export const ModelledMaterials: Material[] = getRandomMaterials();

export const UnmodelledMaterials: UnmodelledMaterial[] = [
  {
    id: '101',
    kbobId: '',
    name: 'Aushub, nicht kontaminiert',
    volume: 123.4,
    ebkp: 'B06.01'
  }
];
