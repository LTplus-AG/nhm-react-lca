import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  ModelledMaterials as DefaultModelledMaterials,
  UnmodelledMaterials,
  OutputFormats,
  OutputFormatLabels,
  EBKPCodes,
  Material,
  UnmodelledMaterial,
  KbobMaterial,
  NewMaterial,
  ImpactResults,
  MaterialCSVImport,
} from "../types/lca.types.ts";
import { LCACalculator } from "../utils/lcaCalculator";
import { fetchKBOBMaterials } from "../services/kbobService";
import Select, { SingleValue } from "react-select";
import {
  IFCTransformService,
  MaterialCSVRow,
} from "../services/ifcTransformService";
import { JsonTransformService } from "../services/jsonTransformService";

const calculator = new LCACalculator();

interface MaterialOption {
  value: string;
  label: string;
  isDisabled?: boolean;
}

export default function LCACalculatorComponent(): JSX.Element {
  const [modelledMaterials, setModelledMaterials] = useState<Material[]>(
    DefaultModelledMaterials
  );
  const [unmodelledMaterials, setUnmodelledMaterials] =
    useState<UnmodelledMaterial[]>(UnmodelledMaterials);
  const [kbobMaterials, setKbobMaterials] = useState<KbobMaterial[]>([]);
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<"modelled" | "unmodelled">(
    "modelled"
  );
  const [newMaterial, setNewMaterial] = useState<NewMaterial>({
    kbobId: "",
    name: "",
    volume: "",
    ebkp: "",
  });
  const [newUnmodelledMaterial, setNewUnmodelledMaterial] =
    useState<UnmodelledMaterial>({
      id: "",
      name: "",
      volume: 0,
      ebkp: "",
      kbobId: "",
    });
  const [results, setResults] = useState<ImpactResults>({
    gwp: 0,
    ubp: 0,
    penr: 0,
    modelledMaterials: 0,
    unmodelledMaterials: 0,
  });
  const [outputFormat, setOutputFormat] = useState<OutputFormats>(
    OutputFormats.GWP
  );
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  useEffect(() => {
    const loadKBOBMaterials = async () => {
      const materials = await fetchKBOBMaterials();
      setKbobMaterials(materials);
    };
    loadKBOBMaterials();
  }, []);

  useEffect(() => {
    const newResults = calculator.calculateImpact(
      modelledMaterials,
      matches,
      kbobMaterials,
      unmodelledMaterials
    );
    setResults(newResults);
  }, [matches, modelledMaterials, kbobMaterials, unmodelledMaterials]);

  const handleMatch = useCallback((modelId: string, kbobId?: string): void => {
    setMatches((prev) => {
      const newMatches = { ...prev };
      if (kbobId === undefined) {
        delete newMatches[modelId];
      } else {
        newMatches[modelId] = kbobId;
      }
      return newMatches;
    });
  }, []);

  const getKbobMaterial = useCallback(
    (materialId: string): KbobMaterial | undefined => {
      return kbobMaterials.find((k) => k.id === matches[materialId]);
    },
    [kbobMaterials, matches]
  );

  const calculateMaterialImpacts = useCallback(
    (material: Material) => {
      const kbobMaterial = getKbobMaterial(material.id);
      return calculator.calculateMaterialImpact(material, kbobMaterial);
    },
    [getKbobMaterial]
  );

  const handleAddMaterial = useCallback(
    (e: React.FormEvent<HTMLFormElement>): void => {
      e.preventDefault();
      if (newMaterial.kbobId && parseFloat(newMaterial.volume) > 0) {
        const newId =
          Math.max(...unmodelledMaterials.map((m) => parseInt(m.id)), 100) + 1;
        const kbobMaterial = kbobMaterials.find(
          (k) => k.id === newMaterial.kbobId
        );
        setUnmodelledMaterials((prev) => [
          ...prev,
          {
            id: newId.toString(),
            kbobId: newMaterial.kbobId,
            name: kbobMaterial?.nameDE || newMaterial.name,
            volume: parseFloat(newMaterial.volume),
            ebkp: newMaterial.ebkp,
          },
        ]);
        setNewMaterial({ kbobId: "", name: "", volume: "", ebkp: "" });
      }
    },
    [newMaterial, unmodelledMaterials, kbobMaterials]
  );

  const handleAddUnmodelledMaterial = useCallback(
    (e: React.FormEvent<HTMLFormElement>): void => {
      e.preventDefault();
      if (
        newUnmodelledMaterial.name &&
        newUnmodelledMaterial.ebkp &&
        newUnmodelledMaterial.volume > 0
      ) {
        const newId =
          Math.max(...unmodelledMaterials.map((m) => parseInt(m.id)), 100) + 1;
        setUnmodelledMaterials((prev) => [
          ...prev,
          {
            id: newId.toString(),
            name: newUnmodelledMaterial.name,
            volume: newUnmodelledMaterial.volume,
            ebkp: newUnmodelledMaterial.ebkp,
            kbobId: newUnmodelledMaterial.kbobId,
          },
        ]);
        setNewUnmodelledMaterial({
          id: "",
          name: "",
          volume: 0,
          ebkp: "",
          kbobId: "",
        });
      }
    },
    [newUnmodelledMaterial, unmodelledMaterials]
  );

  const handleMaterialSelect = useCallback(
    (selectedOption: SingleValue<MaterialOption>, materialId: string): void => {
      handleMatch(materialId, selectedOption?.value);
    },
    [handleMatch]
  );

  const handleNewMaterialSelect = useCallback(
    (selectedOption: SingleValue<MaterialOption>): void => {
      setNewMaterial((prev) => ({
        ...prev,
        kbobId: selectedOption?.value || "",
        name: selectedOption?.label || "",
      }));
    },
    []
  );

  const handleRemoveUnmodelledMaterial = useCallback(
    (index: number): void => {
      setUnmodelledMaterials((prev) => prev.filter((_, i) => i !== index));
    },
    [unmodelledMaterials]
  );

  const kbobMaterialOptions = useMemo(
    () =>
      kbobMaterials.map((kbob) => ({
        value: kbob.id,
        label: `${kbob.nameDE} (${kbob.density} ${kbob.unit})`,
        isDisabled: kbob.density <= 0,
      })),
    [kbobMaterials]
  );

  const selectStyles = useMemo(
    () => ({
      control: (provided: any) => ({
        ...provided,
        borderRadius: "0.375rem",
        borderColor: "var(--border)",
        backgroundColor: "hsl(var(--background))",
        color: "hsl(var(--foreground))",
        boxShadow: "none",
        "&:hover": {
          borderColor: "hsl(var(--input))",
        },
      }),
      option: (provided: any, state: any) => ({
        ...provided,
        backgroundColor: state.isSelected
          ? "hsl(var(--accent))"
          : "hsl(var(--background))",
        color: state.isDisabled
          ? "hsl(var(--muted-foreground))"
          : "hsl(var(--foreground))",
        cursor: state.isDisabled ? "not-allowed" : "default",
        "&:hover": {
          backgroundColor: "hsl(var(--accent))",
        },
      }),
      menu: (provided: any) => ({
        ...provided,
        backgroundColor: "hsl(var(--background))",
        borderColor: "hsl(var(--border))",
        borderRadius: "0.375rem",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
      }),
      singleValue: (provided: any) => ({
        ...provided,
        color: "hsl(var(--foreground))",
      }),
      input: (provided: any) => ({
        ...provided,
        color: "hsl(var(--foreground))",
      }),
      placeholder: (provided: any) => ({
        ...provided,
        color: "hsl(var(--muted-foreground))",
      }),
    }),
    []
  );

  const getOptionLabel = useCallback((kbob: KbobMaterial): string => {
    const densityText =
      kbob.density <= 0
        ? "keine Dichte verfügbar"
        : `${kbob.density} ${kbob.unit}`;
    return `${kbob.nameDE} (${densityText})`;
  }, []);

  const handleExportCSV = useCallback(() => {
    const escapeCSV = (field: string) => {
      if (!field) return "";
      const stringField = String(field);
      if (stringField.match(/[",\n\r]/)) {
        return `"${stringField.replace(/"/g, '""')}"`;
      }
      return stringField;
    };

    const header =
      ["IFC Material", "KBOB Material", "KBOB ID", "Type", "isModelled"].join(
        ","
      ) + "\n";

    const modelledRows = modelledMaterials.map((material) => {
      const kbobMaterial = getKbobMaterial(material.id);
      return [
        escapeCSV(material.name),
        escapeCSV(kbobMaterial?.nameDE || ""),
        escapeCSV(matches[material.id] || ""),
        "modelled",
        "true",
      ].join(",");
    });

    const unmodelledRows = unmodelledMaterials.map((material) => {
      const kbobMaterial = kbobMaterials.find((k) => k.id === material.kbobId);
      return [
        escapeCSV(material.name),
        escapeCSV(kbobMaterial?.nameDE || ""),
        escapeCSV(material.kbobId),
        "unmodelled",
        "false",
      ].join(",");
    });

    const csvContent = header + [...modelledRows, ...unmodelledRows].join("\n");

    const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvContent], {
      type: "text/csv;charset=utf-8",
    });

    const timestamp = new Date().toISOString().replace(/[-:]/g, "").split("T");
    const date = timestamp[0];
    const time = timestamp[1].split(".")[0].replace(/:/g, "");
    const filename = `juch_p31_${date}_${time}.csv`;

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [
    modelledMaterials,
    unmodelledMaterials,
    matches,
    kbobMaterials,
    getKbobMaterial,
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      try {
        const materials = await JsonTransformService.processJsonStream(
          text,
          (progress) => setUploadProgress(progress)
        );

        // Convert materials to your existing format and update state
        const modelledMaterials = materials
          .filter((m) => m.isModelled)
          .map((m) => ({
            id: m.id,
            name: m.mat_ifc,
            volume: m.netvolume,
            ebkp: m.ebkph,
          }));

        setModelledMaterials(modelledMaterials);
        setUploadProgress(0);

        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } catch (error) {
        console.error("Error processing JSON file:", error);
        // Add error handling UI if needed
        alert("Fehler beim Verarbeiten der JSON-Datei");
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6">
      <div className="bg-card rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4 text-foreground">
          Projektübersicht
        </h2>
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2 text-foreground">Juch-Areal</h3>
            <p className="text-muted-foreground">Phase: 31 Vorprojekt</p>
          </div>

          <div>
            <h3 className="font-semibold mb-2 text-foreground">
              Ausgabeformat
            </h3>
            <select
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value as OutputFormats)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {Object.entries(OutputFormatLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <h3 className="font-semibold mb-2 text-foreground">
              Gesamtergebnis
            </h3>
            <div className="bg-secondary/50 p-4 rounded-md">
              <p className="text-3xl font-bold text-foreground">
                {calculator.calculateGrandTotal(
                  modelledMaterials,
                  matches,
                  kbobMaterials,
                  outputFormat,
                  unmodelledMaterials
                )}
                <span className="text-lg ml-2 font-normal text-muted-foreground">
                  {OutputFormatLabels[outputFormat]}
                </span>
              </p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2 text-foreground">Statistik</h3>
            <p className="text-sm text-muted-foreground">
              Modellierte Materialien: {modelledMaterials.length}
            </p>
            <p className="text-sm text-muted-foreground">
              Nicht modellierte Materialien: {unmodelledMaterials.length}
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2 text-foreground">Aktionen</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex gap-4 items-center">
                  <button
                    onClick={handleUploadClick}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md flex items-center gap-2"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    JSON hochladen
                  </button>
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {uploadProgress.toFixed(0)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={handleExportCSV}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md transition-colors"
              >
                Export CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-foreground">Materialien</h2>
        </div>

        <div className="space-x-2 mb-6">
          <button
            onClick={() => setActiveTab("modelled")}
            className={`px-4 py-2 rounded-md transition-colors ${
              activeTab === "modelled"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            Modellierte Materialien ({modelledMaterials.length})
          </button>
          <button
            onClick={() => setActiveTab("unmodelled")}
            className={`px-4 py-2 rounded-md transition-colors ${
              activeTab === "unmodelled"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            Nicht modellierte Materialien ({unmodelledMaterials.length})
          </button>
        </div>

        {activeTab === "modelled" ? (
          <div className="grid grid-cols-1 gap-4 w-full">
            {modelledMaterials.map((material, index) => (
              <div
                key={index}
                className="bg-card border border-border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow w-full"
              >
                <div className="flex justify-between items-center w-full mb-4">
                  <div className="flex items-center gap-4 flex-1">
                    <h3 className="font-medium text-foreground">
                      {material.name}
                    </h3>
                    <span className="bg-secondary/50 px-2 py-1 rounded text-sm">
                      {material.volume.toFixed(2)} m³
                    </span>
                  </div>
                </div>
                <div className="w-full">
                  <Select
                    value={
                      matches[material.id]
                        ? {
                            value: matches[material.id],
                            label: kbobMaterials.find(
                              (k) => k.id === matches[material.id]
                            )?.nameDE,
                          }
                        : null
                    }
                    onChange={(newValue) =>
                      handleMaterialSelect(newValue, material.id)
                    }
                    options={kbobMaterialOptions}
                    styles={selectStyles}
                    className="w-full"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="mb-6 bg-card border border-border rounded-lg p-4">
              <h3 className="text-lg font-medium mb-4">
                Neues Material hinzufügen
              </h3>
              <form
                onSubmit={handleAddUnmodelledMaterial}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={newUnmodelledMaterial.name}
                      onChange={(e) =>
                        setNewUnmodelledMaterial({
                          ...newUnmodelledMaterial,
                          name: e.target.value,
                        })
                      }
                      className="w-full rounded-md border border-border bg-background px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      EBKP
                    </label>
                    <input
                      type="text"
                      value={newUnmodelledMaterial.ebkp}
                      onChange={(e) =>
                        setNewUnmodelledMaterial({
                          ...newUnmodelledMaterial,
                          ebkp: e.target.value,
                        })
                      }
                      className="w-full rounded-md border border-border bg-background px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Volumen (m³)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newUnmodelledMaterial.volume}
                      onChange={(e) =>
                        setNewUnmodelledMaterial({
                          ...newUnmodelledMaterial,
                          volume: parseFloat(e.target.value),
                        })
                      }
                      className="w-full rounded-md border border-border bg-background px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      KBOB Material
                    </label>
                    <Select
                      value={
                        newUnmodelledMaterial.kbobId
                          ? {
                              value: newUnmodelledMaterial.kbobId,
                              label: kbobMaterials.find(
                                (k) => k.id === newUnmodelledMaterial.kbobId
                              )?.nameDE,
                            }
                          : null
                      }
                      onChange={(newValue) =>
                        setNewUnmodelledMaterial({
                          ...newUnmodelledMaterial,
                          kbobId: newValue?.value,
                        })
                      }
                      options={kbobMaterialOptions}
                      styles={selectStyles}
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md transition-colors"
                  >
                    Hinzufügen
                  </button>
                </div>
              </form>
            </div>
            <div className="grid grid-cols-1 gap-4 w-full">
              {unmodelledMaterials.map((material, index) => (
                <div
                  key={index}
                  className="bg-card border border-border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow w-full"
                >
                  <div className="flex justify-between items-center w-full mb-4">
                    <div className="flex items-center gap-4 flex-1">
                      <h3 className="font-medium text-foreground flex items-center gap-2">
                        {material.name}
                        <span className="text-xs bg-yellow-200/10 text-yellow-600 dark:text-yellow-400 px-2 py-1 rounded">
                          Nicht modelliert
                        </span>
                      </h3>
                      <span className="bg-secondary/50 px-2 py-1 rounded text-sm">
                        {material.volume.toFixed(2)} m³
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveUnmodelledMaterial(index)}
                      className="text-destructive hover:text-destructive/90 transition-colors ml-4"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                  <div className="w-full">
                    <Select
                      value={
                        material.kbobId
                          ? {
                              value: material.kbobId,
                              label: kbobMaterials.find(
                                (k) => k.id === material.kbobId
                              )?.nameDE,
                            }
                          : null
                      }
                      onChange={(newValue) =>
                        handleMaterialSelect(newValue, material.id)
                      }
                      options={kbobMaterialOptions}
                      styles={selectStyles}
                      className="w-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".json"
        className="hidden"
      />
    </div>
  );
}
