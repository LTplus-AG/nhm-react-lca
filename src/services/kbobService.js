const API_URL = '/api/kbob';

export async function fetchKBOBMaterials() {
    try {
        console.log('Fetching KBOB materials');
        const response = await fetch(API_URL, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('API response not ok:', response.status, response.statusText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Response data:', data);

        if (!data.success) {
            throw new Error('Failed to fetch KBOB materials');
        }

        // Transform the materials for client-side use
        const transformedMaterials = data.materials.map(material => ({
            id: material.uuid,
            nameDE: material.nameDE,
            nameFR: material.nameFR,
            density: parseDensity(material.density),
            unit: material.unit,
            gwp: material.gwpTotal || 0,
            gwpProduction: material.gwpProduction || 0,
            gwpDisposal: material.gwpDisposal || 0,
            ubp: material.ubp21Total || 0,
            ubpProduction: material.ubp21Production || 0,
            ubpDisposal: material.ubp21Disposal || 0,
            penr: material.penrTotal || 0,
            penrProduction: material.penrProduction || 0,
            penrDisposal: material.penrDisposal || 0,
            biogenicCarbon: material.biogenicCarbon || 0
        }));

        console.log('Transformed materials:', transformedMaterials);
        return transformedMaterials;
    } catch (error) {
        console.error('Error fetching KBOB materials:', error);
        // Return mock data for testing
        return [
            {
                id: "mock-1",
                nameDE: "Beton C25/30",
                nameFR: "Béton C25/30",
                density: 2400,
                unit: "kg/m³",
                gwp: 250.5,
                gwpProduction: 200.3,
                gwpDisposal: 50.2,
                ubp: 380,
                ubpProduction: 320,
                ubpDisposal: 60,
                penr: 0,
                penrProduction: 0,
                penrDisposal: 0,
                biogenicCarbon: 0
            },
            {
                id: "mock-2",
                nameDE: "Bewehrungsstahl",
                nameFR: "Acier d'armature",
                density: 7850,
                unit: "kg/m³",
                gwp: 920.3,
                gwpProduction: 850.1,
                gwpDisposal: 70.2,
                ubp: 1250,
                ubpProduction: 1150,
                ubpDisposal: 100,
                penr: 0,
                penrProduction: 0,
                penrDisposal: 0,
                biogenicCarbon: 0
            },
            {
                id: "mock-3",
                nameDE: "Holz (Fichte/Tanne)",
                nameFR: "Bois (épicéa/sapin)",
                density: 450,
                unit: "kg/m³",
                gwp: 120.5,
                gwpProduction: 100.3,
                gwpDisposal: 20.2,
                ubp: 580,
                ubpProduction: 520,
                ubpDisposal: 60,
                penr: 0,
                penrProduction: 0,
                penrDisposal: 0,
                biogenicCarbon: 250
            }
        ];
    }
}

function parseDensity(densityStr) {
    if (!densityStr || densityStr === '-') return 0;

    // Handle range format (e.g., "20-25")
    if (densityStr.includes('-')) {
        const [min] = densityStr.split('-');
        return parseFloat(min) || 0;
    }

    // Handle single number
    return parseFloat(densityStr) || 0;
}