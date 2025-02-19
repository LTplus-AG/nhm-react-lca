import { FileDownload, UploadFile } from "@mui/icons-material";
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Step,
  StepLabel,
  Stepper,
  Tab,
  Tabs,
  Typography,
  useTheme,
} from "@mui/material";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactDOM from "react-dom";
import Select, { SingleValue } from "react-select";
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
// Import fuzzy search and sorting utilities
import { getFuzzyMatches } from "../utils/fuzzySearch";
import { sortMaterials } from "../utils/sortMaterials";
import axios from "axios";

// Import the new subcomponents
import MaterialList from "./LCACalculator/MaterialList";
import ModelledMaterialList from "./LCACalculator/ModelledMaterialList";
import UnmodelledMaterialForm from "./LCACalculator/UnmodelledMaterialForm";
import EditMaterialDialog from "./LCACalculator/EditMaterialDialog";

const calculator = new LCACalculator();

interface MaterialOption {
  value: string;
  label: string;
  isDisabled?: boolean;
}

// Add new type for sort options
type SortOption = "volume" | "name";

interface FuseResult {
  item: KbobMaterial;
  refIndex: number;
  score?: number;
}

interface MaterialOptionGroup {
  label: string;
  options: MaterialOption[];
}

// Update the MATERIAL_MAPPINGS to include partial matches
const MATERIAL_MAPPINGS: Record<string, string[]> = {
  Beton: ["Hochbaubeton"],
  Concrete: ["Hochbaubeton"],
  Holz: ["Brettschichtholz", "Holz"], // Changed to match partial "Holz" string
  Wood: ["Brettschichtholz", "Holz"], // Changed to match partial "Holz" string
};

interface IFCResult {
  projectId: string;
  ifcData: any; // define more specific type if available
  materialMappings: Record<string, string>;
}

export default function LCACalculatorComponent(): JSX.Element {
  const theme = useTheme();
  const [modelledMaterials, setModelledMaterials] = useState<Material[]>(
    DefaultModelledMaterials
  );
  const [unmodelledMaterials, setUnmodelledMaterials] =
    useState<UnmodelledMaterial[]>(UnmodelledMaterials);
  const [kbobMaterials, setKbobMaterials] = useState<KbobMaterial[]>([]);
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState(0);
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
  const [editingMaterial, setEditingMaterial] =
    useState<UnmodelledMaterial | null>(null);
  const [ifcResult, setIfcResult] = useState<IFCResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Assuming we have a projectId available via context or similar
  const projectId = "defaultProjectId"; // Replace with actual project id retrieval

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

  useEffect(() => {
    axios
      .get(`/api/ifc-results/${projectId}`)
      .then((response) => {
        setIfcResult(response.data);
      })
      .catch((error) => {
        console.error("Error fetching IFC results:", error);
      });
  }, [projectId]);

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

  const kbobMaterialOptions = useMemo(() => {
    const validMaterials = kbobMaterials.filter((kbob) => kbob.density > 0);

    // Create base options
    const baseOptions = validMaterials.map((kbob) => ({
      value: kbob.id,
      label: `${kbob.nameDE} (${kbob.density} ${kbob.unit})`,
    }));

    // For modelled materials tab, add suggestions
    if (activeTab === 0) {
      return (materialId: string): MaterialOption[] | MaterialOptionGroup[] => {
        const material = modelledMaterials.find((m) => m.id === materialId);
        if (!material) return baseOptions;

        // Get fuzzy matches for this material's name using the imported utility
        const suggestions = getFuzzyMatches(material.name, validMaterials);

        if (suggestions.length === 0) return baseOptions;

        // Create suggestion options with custom formatting
        const suggestionOptions = suggestions.map((kbob: KbobMaterial) => ({
          value: kbob.id,
          label: `✨ ${kbob.nameDE} (${kbob.density} ${kbob.unit})`,
          className: "suggestion-option",
        }));

        // Group the suggestions and base options
        return [
          {
            label: "🎯 Vorschläge basierend auf Name",
            options: suggestionOptions,
          },
          {
            label: "Alle Materialien",
            options: baseOptions,
          },
        ];
      };
    }

    // For unmodelled materials tab, return flat list
    return baseOptions;
  }, [kbobMaterials, activeTab, modelledMaterials]);

  const selectStyles = useMemo(
    () => ({
      control: (provided: any) => ({
        ...provided,
        borderRadius: theme.shape.borderRadius,
        borderColor: theme.palette.divider,
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        boxShadow: "none",
        "&:hover": {
          borderColor: theme.palette.primary.main,
        },
      }),
      option: (provided: any, state: any) => ({
        ...provided,
        backgroundColor: state.isSelected
          ? theme.palette.primary.main
          : theme.palette.background.paper,
        color: state.isDisabled
          ? theme.palette.text.disabled
          : theme.palette.text.primary,
        cursor: state.isDisabled ? "not-allowed" : "default",
        fontWeight: state.data.className === "suggestion-option" ? 500 : 400,
        "&:hover": {
          backgroundColor: theme.palette.action.hover,
        },
      }),
      menu: (provided: any) => ({
        ...provided,
        backgroundColor: theme.palette.background.paper,
        borderColor: theme.palette.divider,
        borderRadius: theme.shape.borderRadius,
        boxShadow: theme.shadows[1],
      }),
      singleValue: (provided: any) => ({
        ...provided,
        color: theme.palette.text.primary,
      }),
      input: (provided: any) => ({
        ...provided,
        color: theme.palette.text.primary,
      }),
      placeholder: (provided: any) => ({
        ...provided,
        color: theme.palette.text.secondary,
      }),
      group: (provided: any) => ({
        ...provided,
        padding: 0,
        "& .css-1rhbuit-multiValue": {
          backgroundColor: theme.palette.primary.light,
        },
      }),
      groupHeading: (provided: any) => ({
        ...provided,
        fontSize: "0.75rem",
        color: theme.palette.text.secondary,
        fontWeight: 600,
        textTransform: "none",
        backgroundColor: theme.palette.grey[50],
        padding: "8px 12px",
        marginBottom: 4,
      }),
    }),
    [theme]
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

  const outputFormatOptions = useMemo(
    () =>
      Object.entries(OutputFormatLabels).map(([value, label]) => ({
        value,
        label,
      })),
    []
  );

  const sortOptions = useMemo(
    () => [
      { value: "volume", label: "Volumen" },
      { value: "name", label: "Name" },
    ],
    []
  );

  const sidebarContent = (
    <Paper
      elevation={1}
      sx={{
        p: 2,
        height: "fit-content",
        backgroundColor: "background.paper",
        borderRadius: 1,
        width: "100%",
        "& > .MuiBox-root": {
          width: "100%",
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 3,
          width: "100%",
        }}
      >
        {/* File Operations Section */}
        <Box sx={{ width: "100%" }}>
          <Typography variant="subtitle1" fontWeight="600" gutterBottom>
            Dateioperationen
          </Typography>
          <Box sx={{ display: "flex", gap: 1, width: "100%" }}>
            <Button
              onClick={handleExportJSON}
              variant="contained"
              color="primary"
              disabled={getCurrentStep() < 2}
              startIcon={<FileDownload />}
              fullWidth
              sx={{
                opacity: 0.9,
                "&:hover": {
                  opacity: 1,
                },
                "&.Mui-disabled": {
                  opacity: 0.3,
                },
              }}
            >
              Export
            </Button>
            <Button
              onClick={handleUploadClick}
              variant="contained"
              color="secondary"
              startIcon={<UploadFile />}
              fullWidth
              sx={{
                opacity: 0.9,
                "&:hover": {
                  opacity: 1,
                },
              }}
            >
              Import
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json"
              style={{ display: "none" }}
            />
          </Box>
          {uploadProgress > 0 && (
            <Box sx={{ mt: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CircularProgress
                  size={16}
                  variant="determinate"
                  value={uploadProgress}
                />
                <Typography variant="caption" color="text.secondary">
                  {uploadProgress}% hochgeladen
                </Typography>
              </Box>
            </Box>
          )}
        </Box>

        {/* Progress Section */}
        {modelledMaterials.length > 0 && (
          <Box>
            <Typography variant="subtitle1" fontWeight="600" gutterBottom>
              Fortschritt
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Modellierte Materialien: {modelledMaterials.length}
                </Typography>
                <Box
                  sx={{
                    width: "100%",
                    bgcolor: "grey.200",
                    borderRadius: "9999px",
                    height: "8px",
                  }}
                >
                  <Box
                    sx={{
                      width: `${
                        (modelledMaterials.filter((m) => matches[m.id]).length /
                          modelledMaterials.length) *
                        100
                      }%`,
                      bgcolor: "primary.main",
                      borderRadius: "9999px",
                      height: "100%",
                      transition: "width 0.3s",
                    }}
                  />
                </Box>
              </Box>
              <Typography variant="caption" color="text.secondary">
                {modelledMaterials.filter((m) => matches[m.id]).length} von{" "}
                {modelledMaterials.length} zugeordnet
              </Typography>
            </Box>
          </Box>
        )}

        {/* Output Format Section */}
        <Box>
          <Typography variant="subtitle1" fontWeight="600" gutterBottom>
            Ausgabeformat
          </Typography>
          <Select
            value={outputFormatOptions.find(
              (opt) => opt.value === outputFormat
            )}
            onChange={(newValue) =>
              setOutputFormat(newValue?.value as OutputFormats)
            }
            options={outputFormatOptions}
            styles={selectStyles}
            className="w-full"
          />
        </Box>

        {/* Total Result Section */}
        <Box>
          <Typography variant="subtitle1" fontWeight="600" gutterBottom>
            Gesamtergebnis
          </Typography>
          <Box
            sx={{
              background: "linear-gradient(to right top, #F1D900, #fff176)",
              p: 2,
              borderRadius: 1,
            }}
          >
            <Typography
              variant="h4"
              component="p"
              color="common.black"
              fontWeight="bold"
            >
              {calculator.calculateGrandTotal(
                modelledMaterials,
                matches,
                kbobMaterials,
                outputFormat,
                unmodelledMaterials
              )}
              <Typography
                component="span"
                variant="h6"
                sx={{ ml: 1, opacity: 0.7, fontWeight: "normal" }}
              >
                {OutputFormatUnits[outputFormat]}
              </Typography>
            </Typography>
          </Box>
        </Box>

        {/* Process Steps Section */}
        <Box>
          <Typography variant="subtitle1" fontWeight="600" gutterBottom>
            Prozess
          </Typography>
          <Stepper
            orientation="vertical"
            activeStep={getCurrentStep()}
            sx={{ maxWidth: "320px" }}
          >
            {instructions.map((step, index) => (
              <Step key={step.label} completed={getCurrentStep() > index}>
                <StepLabel>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {step.label}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mt: 0.5 }}
                  >
                    {step.description}
                  </Typography>
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>
      </Box>
    </Paper>
  );

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleEditMaterial = (material: UnmodelledMaterial) => {
    setEditingMaterial(material);
  };

  const handleSaveEdit = (editedMaterial: UnmodelledMaterial) => {
    setUnmodelledMaterials((prev) =>
      prev.map((m) => (m.id === editedMaterial.id ? editedMaterial : m))
    );
    setEditingMaterial(null);
  };

  // Handler for the 'Abschliessen' button click
  const handleAbschliessen = () => {
    setLoading(true);
    // Prepare payload with IFC parse result and its material mappings if present
    const payload = {
      projectId: projectId,
      // If the backend expects material mappings, assume they reside in ifcResult.materialMappings
      materialMappings:
        ifcResult && ifcResult.materialMappings
          ? ifcResult.materialMappings
          : {},
      // Alternatively, you can send the whole IFC result if needed
      // ifcResult: ifcResult
    };

    axios
      .post("/api/update-material-mappings", payload)
      .then((response) => {
        setMessage("Abschliessen erfolgreich!");
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error updating material mappings:", error);
        setMessage("Fehler beim Abschliessen");
        setLoading(false);
      });
  };

  return (
    <Box sx={{ width: "100%", height: "100%" }}>
      {sidebarContainer &&
        ReactDOM.createPortal(sidebarContent, sidebarContainer)}
      <Box
        sx={{ display: "flex", flexDirection: "column", gap: 3, width: "100%" }}
      >
        <Paper elevation={1} sx={{ p: 3, width: "100%" }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 3,
            }}
          >
            <Typography variant="h5" fontWeight="bold">
              Materialien
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Sortieren nach:
              </Typography>
              <Select
                value={sortOptions.find((opt) => opt.value === sortBy)}
                onChange={(newValue) =>
                  setSortBy(newValue?.value as SortOption)
                }
                options={sortOptions}
                styles={selectStyles}
                className="w-40"
              />
            </Box>
          </Box>

          <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              sx={{
                "& .MuiTab-root": {
                  textTransform: "none",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: "text.secondary",
                  "&.Mui-selected": {
                    color: "primary.main",
                  },
                },
                "& .MuiTabs-indicator": {
                  backgroundColor: "primary.main",
                },
              }}
            >
              <Tab label="Modellierte Materialien" />
              <Tab label="Nicht modellierte Materialien" />
            </Tabs>
          </Box>

          {activeTab === 0 ? (
            <ModelledMaterialList
              modelledMaterials={modelledMaterials}
              kbobMaterials={kbobMaterials}
              matches={matches}
              handleMaterialSelect={handleMaterialSelect}
              kbobMaterialOptions={kbobMaterialOptions}
              selectStyles={selectStyles}
              sortMaterials={(materials) => sortMaterials(materials, sortBy)}
            />
          ) : (
            <>
              <UnmodelledMaterialForm
                newUnmodelledMaterial={newUnmodelledMaterial}
                setNewUnmodelledMaterial={setNewUnmodelledMaterial}
                handleAddUnmodelledMaterial={handleAddUnmodelledMaterial}
                kbobMaterials={kbobMaterials}
                kbobMaterialOptions={kbobMaterialOptions}
                selectStyles={selectStyles}
              />
              <MaterialList
                unmodelledMaterials={unmodelledMaterials}
                kbobMaterials={kbobMaterials}
                handleMaterialSelect={handleMaterialSelect}
                handleRemoveUnmodelledMaterial={handleRemoveUnmodelledMaterial}
                handleEditMaterial={handleEditMaterial}
                kbobMaterialOptions={kbobMaterialOptions}
                selectStyles={selectStyles}
              />
              <EditMaterialDialog
                open={!!editingMaterial}
                material={editingMaterial}
                onClose={() => setEditingMaterial(null)}
                onSave={handleSaveEdit}
                selectStyles={selectStyles}
                kbobMaterials={kbobMaterials}
                kbobMaterialOptions={kbobMaterialOptions}
              />
            </>
          )}
        </Paper>
        <Paper style={{ padding: "16px", margin: "16px" }}>
          <Typography variant="h5" gutterBottom>
            IFC Parsing Ergebnisse
          </Typography>
          {ifcResult ? (
            <pre style={{ backgroundColor: "#fafafa", padding: "8px" }}>
              {JSON.stringify(ifcResult, null, 2)}
            </pre>
          ) : (
            <Typography variant="body1">Keine IFC Daten verfügbar.</Typography>
          )}
          <Button
            variant="contained"
            color="primary"
            onClick={handleAbschliessen}
            disabled={loading || !ifcResult}
            style={{ marginTop: "16px" }}
          >
            Abschliessen
          </Button>
          {message && (
            <Typography variant="subtitle1" style={{ marginTop: "16px" }}>
              {message}
            </Typography>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
