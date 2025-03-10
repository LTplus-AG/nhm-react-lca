export const mockProjectData = {
  "juch-areal": {
    projectId: "juch-areal",
    ifcData: {
      materials: [
        {
          name: "Beton",
          volume: 945.5,
        },
        {
          name: "Bewehrungsstahl",
          volume: 64.8,
        },
        {
          name: "Holz",
          volume: 345.3,
        },
        {
          name: "Dämmung Glaswolle",
          volume: 123.6,
        },
        {
          name: "OSB Platte",
          volume: 22.4,
        },
        {
          name: "Vollholz",
          volume: 124.5,
        },
        {
          name: "Stahlblech",
          volume: 33.2,
        },
        {
          name: "Weichfaser",
          volume: 66.8,
        },
      ],
    },
    materialMappings: {
      // Add mappings to KBOB material IDs
      Beton: "2.1.01", // Beton/Normalbeton
      Bewehrungsstahl: "3.1.01", // Stahl/Bewehrungsstahl
      Holz: "4.1.01", // Holz/Vollholz
      "Dämmung Glaswolle": "7.1.02", // Dämmung/Glaswolle
      "OSB Platte": "4.2.02", // Holzwerkstoffe/OSB-Platte
      Vollholz: "4.1.01", // Holz/Vollholz
      Stahlblech: "3.1.02", // Stahl/Stahlblech
      Weichfaser: "4.2.03", // Holzwerkstoffe/Weichfaserplatte
    },
  },
  // Add more projects as needed
  stadthausanlage: {
    projectId: "stadthausanlage",
    ifcData: {
      materials: [
        {
          name: "Beton",
          volume: 1245.7,
        },
        {
          name: "Stahl",
          volume: 84.2,
        },
        {
          name: "Glas",
          volume: 34.8,
        },
      ],
    },
    materialMappings: {
      Beton: "2.1.01", // Beton/Normalbeton
      Stahl: "3.1.01", // Stahl/Bewehrungsstahl
      Glas: "6.1.01", // Glas/Normalglas
    },
  },
};
