interface MaterialVolume {
  fraction: number;
  volume: number | null;
  width: number | null;
}

interface Quantities {
  volume?: {
    net: number | null;
    gross: number | null;
  };
  area?: {
    net?: number;
    gross?: number;
  };
  dimensions?: {
    length: number | null;
    width: number | null;
    height: number | null;
  };
}

interface Element {
  id: string;
  ifc_class: string;
  object_type: string;
  properties: {
    loadBearing: boolean | null;
    isExternal: boolean | null;
  };
  quantities: Quantities;
  materials: string[];
  material_volumes: {
    [key: string]: MaterialVolume;
  };
}

interface JsonResponse {
  metadata: {
    total_elements: number;
    total_pages: number;
    current_page: number;
    page_size: number;
    ifc_classes: string[];
    units: {
      length: string;
      area: string;
      volume: string;
    };
  };
  elements: Element[];
}

export interface MaterialRow {
  id: string;
  ebkph: string;
  mat_ifc: string;
  netvolume: number;
  isModelled: boolean;
  kbobId?: string;
  kbobName?: string;
}

export class JsonTransformService {
  private static materialTypeToEBKP: Record<string, string> = {
    IfcWall: "C2",
    IfcSlab: "C4",
    IfcColumn: "C3",
    IfcBeam: "C4",
    IfcWindow: "E2",
    IfcDoor: "E2",
    IfcRoof: "E4",
  };

  private static generateMaterialId(index: number): string {
    return `M${String(index + 1).padStart(3, "0")}`;
  }

  private static removeTrailingNumber(name: string): string {
    return name.replace(/ \(\d+\)$/, "");
  }

  static transformToMaterials(jsonData: JsonResponse): MaterialRow[] {
    if (!jsonData?.elements) {
      throw new Error("Invalid JSON data: missing elements array");
    }

    const materialMap = new Map<
      string,
      {
        volume: number;
        ebkp: string;
        type: string;
      }
    >();

    for (const element of jsonData.elements) {
      if (!element?.material_volumes) continue;

      try {
        const netVolume = element.quantities?.volume?.net;

        const totalFraction = Object.values(element.material_volumes).reduce(
          (sum, mat) => sum + (mat?.fraction || 0),
          0
        );

        for (const [materialName, materialData] of Object.entries(
          element.material_volumes
        )) {
          if (!materialData) continue;

          let actualVolume: number;
          if (
            netVolume !== null &&
            netVolume !== undefined &&
            totalFraction > 0
          ) {
            actualVolume = (materialData.fraction / totalFraction) * netVolume;
          } else if (materialData.volume) {
            actualVolume = materialData.volume;
          } else {
            continue;
          }

          if (actualVolume === 0) continue;

          const groupingName = this.removeTrailingNumber(materialName);
          const existing = materialMap.get(groupingName);

          if (existing) {
            existing.volume = Number(
              (existing.volume + actualVolume).toFixed(5)
            );
            if (existing.type !== element.ifc_class) {
              existing.ebkp = "C2.1";
            }
          } else {
            materialMap.set(groupingName, {
              volume: Number(actualVolume.toFixed(5)),
              ebkp: `${this.materialTypeToEBKP[element.ifc_class] || "C2"}.1`,
              type: element.ifc_class,
            });
          }
        }
      } catch (error) {
        console.error("Error processing element:", element, error);
        continue;
      }
    }

    console.log(
      "Material volumes:",
      Array.from(materialMap.entries()).map(
        ([name, data]) => `${name}: ${data.volume}`
      )
    );

    const materials: MaterialRow[] = Array.from(materialMap.entries())
      .sort(([nameA], [nameB]) => nameA.localeCompare(nameB))
      .map(([name, data], index) => ({
        id: this.generateMaterialId(index),
        ebkph: data.ebkp,
        mat_ifc: name,
        netvolume: Number(data.volume.toFixed(3)),
        isModelled: true,
      }));

    return materials;
  }

  static async processJsonStream(
    jsonString: string,
    onProgress?: (progress: number) => void
  ): Promise<MaterialRow[]> {
    try {
      let jsonData: JsonResponse;
      try {
        jsonData = JSON.parse(jsonString) as JsonResponse;
      } catch (error) {
        console.error("JSON Parse Error:", error);
        throw new Error("Invalid JSON format: failed to parse");
      }

      if (!jsonData?.metadata || !Array.isArray(jsonData?.elements)) {
        console.error("Invalid JSON structure:", jsonData);
        throw new Error(
          "Invalid JSON structure: missing metadata or elements array"
        );
      }

      if (onProgress) {
        onProgress(100);
      }

      return this.transformToMaterials(jsonData);
    } catch (error) {
      console.error("Error processing JSON:", error);
      throw error;
    }
  }
}
