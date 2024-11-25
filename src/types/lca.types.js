// Define the structure of LCA input data
export const MaterialTypes = {
    WOOD: 'wood',
    STEEL: 'steel',
    CONCRETE: 'concrete',
    GLASS: 'glass',
    // Add more materials as needed
};

// Example environmental impact factors (simplified)
export const ImpactFactors = {
    [MaterialTypes.WOOD]: { co2: 1.6, energy: 10 },     // kg CO2/kg, MJ/kg
    [MaterialTypes.STEEL]: { co2: 2.8, energy: 25 },
    [MaterialTypes.CONCRETE]: { co2: 0.9, energy: 1.5 },
    [MaterialTypes.GLASS]: { co2: 1.5, energy: 15 },
};

export const OutputFormats = {
    GWP: 'GWP',
    UBP: 'UBP',
    PENR: 'PENR'
};

export const OutputFormatLabels = {
    [OutputFormats.GWP]: 'GWP (kg CO₂-eq)',
    [OutputFormats.UBP]: 'UBP (Punkte)',
    [OutputFormats.PENR]: 'PEnr (MJ)'
};

// Demo materials for initial state
export const ModelledMaterials = [
    {
        id: 1,
        name: 'Beton C25/30',
        volume: 125.5
    },
    {
        id: 2,
        name: 'Bewehrungsstahl',
        volume: 12.3
    },
    {
        id: 3,
        name: 'Holz (Fichte/Tanne)',
        volume: 45.8
    },
    {
        id: 4,
        name: 'Mauerwerk (Backstein)',
        volume: 78.2
    }
];

export const UnmodelledMaterials = [
    {
        id: 101,
        kbobId: '',
        name: 'Aushub, nicht kontaminiert',
        volume: 123.4,
        ebkp: 'B06.01'
    },

];

// EBKP codes for materials
export const EBKPCodes = {
    C01: 'C01',
    'C02.01': 'C02.01',
    'C02.02': 'C02.02',
    C03: 'C03',
    'C04.01': 'C04.01',
    'C04.08': 'C04.08',
    D01: 'D01',
    D05: 'D05',
    D08: 'D08',
    E01: 'E01',
    E02: 'E02',
    E03: 'E03'
};

// KBOB materials database with all impact types
export const KBOBMaterials = [
    {
        id: 1,
        name: 'B- und K-Schichten WHS',
        thg: 250,    // kg CO2-eq
        ubp: 180000, // UBP (scaled to 1000 in display)
        energy: 1500 // MJ
    },
    {
        id: 2,
        name: '2-Komponenten Klebstoff',
        thg: 180,
        ubp: 150000,
        energy: 1200
    },
    {
        id: 3,
        name: 'unassigned',
        thg: 0,
        ubp: 0,
        energy: 0
    }
];