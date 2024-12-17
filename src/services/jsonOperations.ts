import { Material, UnmodelledMaterial, KbobMaterial } from "../types/lca.types";
import { JsonTransformService } from "./jsonTransformService";

interface ExportMaterial {
  ifc_material: string;
  kbob_material: string;
  kbob_id: string;
  type: "modelled" | "unmodelled";
  is_modelled: boolean;
  ebkp: string;
  quantity: number;
}

export const jsonOperations = {
  handleExportJSON: (
    modelledMaterials: Material[],
    unmodelledMaterials: UnmodelledMaterial[],
    matches: Record<string, string>,
    kbobMaterials: KbobMaterial[]
  ) => {
    const modelledData = modelledMaterials.map((material) => {
      const kbobMaterial = kbobMaterials.find(
        (k) => k.id === matches[material.id]
      );
      return {
        ifc_material: material.name,
        kbob_material: kbobMaterial?.nameDE || "",
        kbob_id: matches[material.id] || "",
        type: "modelled",
        is_modelled: true,
        ebkp: "", // Empty for modelled materials as requested
        quantity: material.volume,
      } as ExportMaterial;
    });

    const unmodelledData = unmodelledMaterials.map((material) => {
      const kbobMaterial = kbobMaterials.find((k) => k.id === material.kbobId);
      return {
        ifc_material: material.name,
        kbob_material: kbobMaterial?.nameDE || "",
        kbob_id: material.kbobId || "",
        type: "unmodelled",
        is_modelled: false,
        ebkp: material.ebkp || "",
        quantity: material.volume,
      } as ExportMaterial;
    });

    const jsonData = [...modelledData, ...unmodelledData];
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
      type: "application/json",
    });

    const timestamp = new Date().toISOString().replace(/[-:]/g, "").split("T");
    const date = timestamp[0];
    const time = timestamp[1].split(".")[0].replace(/:/g, "");
    const filename = `juch_p31_${date}_${time}.json`;

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  handleFileUpload: async (
    file: File,
    onProgress: (progress: number) => void
  ): Promise<Material[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        try {
          const materials = await JsonTransformService.processJsonStream(
            text,
            onProgress
          );

          // Convert materials to your existing format
          const modelledMaterials = materials
            .filter((m) => m.isModelled)
            .map((m) => ({
              id: m.id,
              name: m.mat_ifc,
              volume: m.netvolume,
              ebkp: m.ebkph,
            }));

          resolve(modelledMaterials);
        } catch (error) {
          console.error("Error processing JSON file:", error);
          reject(error);
        }
      };
      reader.readAsText(file, "UTF-8");
    });
  },
};
