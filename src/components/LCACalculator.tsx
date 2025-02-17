import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Select, { SingleValue } from "react-select";
import { ebkpData } from "../data/ebkpData";
import { jsonOperations } from "../services/jsonOperations";
import { fetchKBOBMaterials } from "../services/kbobService";
import {
  ModelledMaterials as DefaultModelledMaterials,
  KbobMaterial,
  Material,
  OutputFormatLabels,
  OutputFormats,
  OutputFormatUnits,
  UnmodelledMaterial,
  UnmodelledMaterials,
} from "../types/lca.types.ts";
import { LCACalculator } from "../utils/lcaCalculator";
import { FileDown } from "lucide-react";
import ReactDOM from "react-dom";
import { UploadFile, FileDownload } from "@mui/icons-material";
import {
  CircularProgress,
  IconButton,
  Typography,
  Stepper,
  Step,
  StepLabel,
} from "@mui/material";

const calculator = new LCACalculator();

interface MaterialOption {
  value: string;
  label: string;
  isDisabled?: boolean;
}

// Add new type for sort options
type SortOption = "volume" | "name";

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
  const [newUnmodelledMaterial, setNewUnmodelledMaterial] =
    useState<UnmodelledMaterial>({
      id: "",
      name: "",
      volume: "",
      ebkp: "",
      kbobId: "",
    });
  const [outputFormat, setOutputFormat] = useState<OutputFormats>(
    OutputFormats.GWP
  );
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [sortBy, setSortBy] = useState<SortOption>("volume");
  const [sidebarContainer, setSidebarContainer] = useState<HTMLElement | null>(
    null
  );

  useEffect(() => {
    const loadKBOBMaterials = async () => {
      const materials = await fetchKBOBMaterials();
      setKbobMaterials(materials);
    };
    loadKBOBMaterials();
  }, []);

  useEffect(() => {
    let container = document.getElementById("sidebar");
    if (!container) {
      container = document.createElement("div");
      container.id = "sidebar";
      document.body.appendChild(container);
    }
    setSidebarContainer(container);
  }, []);

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

  const handleAddUnmodelledMaterial = useCallback(
    (e: React.FormEvent<HTMLFormElement>): void => {
      e.preventDefault();
      if (
        newUnmodelledMaterial.name &&
        newUnmodelledMaterial.ebkp &&
        typeof newUnmodelledMaterial.volume === "number" &&
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
          volume: "",
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

  const handleExportJSON = useCallback(() => {
    jsonOperations.handleExportJSON(
      modelledMaterials,
      unmodelledMaterials,
      matches,
      kbobMaterials
    );
  }, [modelledMaterials, unmodelledMaterials, matches, kbobMaterials]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const modelledMaterials = await jsonOperations.handleFileUpload(
        file,
        (progress) => setUploadProgress(progress)
      );

      setModelledMaterials(modelledMaterials);
      setUploadProgress(0);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error processing JSON file:", error);
      alert("Fehler beim Verarbeiten der JSON-Datei");
    }
  };

  // Add sort function
  const sortMaterials = <T extends { volume: number | ""; name: string }>(
    materials: T[]
  ) => {
    return [...materials].sort((a, b) => {
      if (sortBy === "volume") {
        const volA = typeof a.volume === "number" ? a.volume : 0;
        const volB = typeof b.volume === "number" ? b.volume : 0;
        return volB - volA;
      }
      return a.name.localeCompare(b.name);
    });
  };

  // Add instructions array
  const instructions = [
    {
      label: "Daten importieren",
      description: "Laden Sie die JSON-Datei mit den Materialdaten hoch.",
    },
    {
      label: "Materialien zuordnen",
      description: "Ordnen Sie die Materialien den KBOB-Referenzen zu.",
    },
    {
      label: "Ergebnis exportieren",
      description: "Exportieren Sie die zugeordneten Materialien als JSON.",
    },
  ];

  // Calculate current step
  const getCurrentStep = () => {
    if (modelledMaterials.length === 0) return 0;
    if (
      modelledMaterials.filter((m) => matches[m.id]).length <
      modelledMaterials.length
    )
      return 1;
    return 2;
  };

  const sidebarContent = (
    <div className="bg-card rounded-lg shadow p-6 h-fit">
      <div className="space-y-6">
        {/* File Operations Section */}
        <div>
          <h3 className="font-semibold mb-2 text-foreground">
            Dateioperationen
          </h3>
          <div className="flex gap-2">
            <IconButton
              onClick={handleExportJSON}
              className="flex-1 bg-primary/10 hover:bg-primary/20"
              size="large"
              disabled={getCurrentStep() < 2}
            >
              <div className="flex flex-col items-center">
                <FileDownload className="text-primary" />
                <Typography variant="caption" className="text-primary text-xs">
                  Export
                </Typography>
              </div>
            </IconButton>
            <IconButton
              onClick={handleUploadClick}
              className="flex-1 bg-secondary/10 hover:bg-secondary/20"
              size="large"
            >
              <div className="flex flex-col items-center">
                <UploadFile className="text-secondary" />
                <Typography
                  variant="caption"
                  className="text-secondary text-xs"
                >
                  Import
                </Typography>
              </div>
            </IconButton>
          </div>
          {uploadProgress > 0 && (
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <CircularProgress
                  size={16}
                  variant="determinate"
                  value={uploadProgress}
                />
                <Typography variant="caption" className="text-muted-foreground">
                  {uploadProgress}% hochgeladen
                </Typography>
              </div>
            </div>
          )}
        </div>

        {/* Progress Indicators */}
        {modelledMaterials.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2 text-foreground">Fortschritt</h3>
            <div className="space-y-2">
              <div>
                <Typography variant="caption" color="textSecondary">
                  Modellierte Materialien: {modelledMaterials.length}
                </Typography>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary rounded-full h-2 transition-all"
                    style={{
                      width: `${
                        (modelledMaterials.filter((m) => matches[m.id]).length /
                          modelledMaterials.length) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>
              <Typography variant="caption" color="textSecondary">
                {modelledMaterials.filter((m) => matches[m.id]).length} von{" "}
                {modelledMaterials.length} zugeordnet
              </Typography>
            </div>
          </div>
        )}

        <div>
          <h3 className="font-semibold mb-2 text-foreground">Ausgabeformat</h3>
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
          <h3 className="font-semibold mb-2 text-foreground">Gesamtergebnis</h3>
          <div className="bg-gradient-to-tr from-[#F1D900] to-[#fff176] p-4 rounded-md">
            <p className="text-3xl font-bold text-black">
              {calculator.calculateGrandTotal(
                modelledMaterials,
                matches,
                kbobMaterials,
                outputFormat,
                unmodelledMaterials
              )}
              <span className="text-lg ml-2 font-normal text-black/70">
                {OutputFormatUnits[outputFormat]}
              </span>
            </p>
          </div>
        </div>

        {/* Process Steps */}
        <div>
          <h3 className="font-semibold mb-4 text-foreground">Prozess</h3>
          <Stepper
            orientation="vertical"
            activeStep={getCurrentStep()}
            className="max-w-xs"
          >
            {instructions.map((step, index) => (
              <Step key={step.label} completed={getCurrentStep() > index}>
                <StepLabel>
                  <Typography variant="subtitle2" className="font-semibold">
                    {step.label}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="textSecondary"
                    className="block mt-1"
                  >
                    {step.description}
                  </Typography>
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full h-full">
      {sidebarContainer &&
        ReactDOM.createPortal(sidebarContent, sidebarContainer)}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-card rounded-lg shadow p-6 w-full">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-foreground">Materialien</h2>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">
                Sortieren nach:
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="rounded-md border border-input bg-background px-2 py-1 text-sm"
              >
                <option value="volume">Volumen</option>
                <option value="name">Name</option>
              </select>
            </div>
          </div>

          <div className="flex w-full mb-6 bg-white border border-border p-1 rounded-lg gap-1">
            <button
              onClick={() => setActiveTab("modelled")}
              className={`flex-1 py-3 px-6 text-sm font-medium transition-all rounded-md ${
                activeTab === "modelled"
                  ? "bg-gradient-to-tr from-[#93B1E4] to-[#c5d8f5] text-black shadow-sm"
                  : "bg-white text-gray-600 hover:bg-gradient-to-tr hover:from-[#F1D900] hover:to-[#fff176] hover:text-black"
              }`}
            >
              Modellierte Materialien
            </button>
            <button
              onClick={() => setActiveTab("unmodelled")}
              className={`flex-1 py-3 px-6 text-sm font-medium transition-all rounded-md ${
                activeTab === "unmodelled"
                  ? "bg-gradient-to-tr from-[#93B1E4] to-[#c5d8f5] text-black shadow-sm"
                  : "bg-white text-gray-600 hover:bg-gradient-to-tr hover:from-[#F1D900] hover:to-[#fff176] hover:text-black"
              }`}
            >
              Nicht modellierte Materialien
            </button>
          </div>

          {activeTab === "modelled" ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
              {sortMaterials(modelledMaterials).map((material, index) => (
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
                        {typeof material.volume === "number"
                          ? material.volume.toFixed(2)
                          : "0.00"}{" "}
                        m³
                      </span>
                    </div>
                  </div>
                  <div className="w-full">
                    <Select
                      value={
                        matches[material.id]
                          ? ({
                              value: matches[material.id],
                              label:
                                kbobMaterials.find(
                                  (k) => k.id === matches[material.id]
                                )?.nameDE || "",
                              isDisabled: false,
                            } as MaterialOption)
                          : null
                      }
                      onChange={(newValue: SingleValue<MaterialOption>) =>
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
                      <Select
                        value={
                          newUnmodelledMaterial.ebkp
                            ? {
                                value: newUnmodelledMaterial.ebkp,
                                label: `${newUnmodelledMaterial.ebkp} - ${
                                  ebkpData.find(
                                    (item) =>
                                      item.code === newUnmodelledMaterial.ebkp
                                  )?.bezeichnung || ""
                                }`,
                              }
                            : null
                        }
                        onChange={(newValue) =>
                          setNewUnmodelledMaterial({
                            ...newUnmodelledMaterial,
                            ebkp: newValue?.value || "",
                          })
                        }
                        options={ebkpData.map((item) => ({
                          value: item.code,
                          label: `${item.code} - ${item.bezeichnung}`,
                        }))}
                        styles={selectStyles}
                        className="w-full"
                        placeholder="Wählen Sie einen EBKP-Code"
                        isClearable
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Volumen (m³)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={
                          newUnmodelledMaterial.volume === ""
                            ? ""
                            : newUnmodelledMaterial.volume
                        }
                        onChange={(e) =>
                          setNewUnmodelledMaterial({
                            ...newUnmodelledMaterial,
                            volume:
                              e.target.value === ""
                                ? ""
                                : parseFloat(e.target.value),
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
                            ? ({
                                value: newUnmodelledMaterial.kbobId,
                                label:
                                  kbobMaterials.find(
                                    (k) => k.id === newUnmodelledMaterial.kbobId
                                  )?.nameDE || "",
                                isDisabled: false,
                              } as MaterialOption)
                            : null
                        }
                        onChange={(newValue: SingleValue<MaterialOption>) =>
                          setNewUnmodelledMaterial({
                            ...newUnmodelledMaterial,
                            kbobId: newValue?.value || "",
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
                {sortMaterials(unmodelledMaterials).map((material, index) => (
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
                          {material.ebkp && (
                            <span className="text-xs bg-blue-200/10 text-blue-600 dark:text-blue-400 px-2 py-1 rounded">
                              {material.ebkp}
                            </span>
                          )}
                        </h3>
                        <span className="bg-secondary/50 px-2 py-1 rounded text-sm">
                          {typeof material.volume === "number"
                            ? material.volume.toFixed(2)
                            : "0.00"}{" "}
                          m³
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
                            ? ({
                                value: material.kbobId,
                                label:
                                  kbobMaterials.find(
                                    (k) => k.id === material.kbobId
                                  )?.nameDE || "",
                                isDisabled: false,
                              } as MaterialOption)
                            : null
                        }
                        onChange={(newValue: SingleValue<MaterialOption>) =>
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
