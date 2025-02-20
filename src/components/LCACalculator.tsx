import {
  Box,
  Button,
  Paper,
  Step,
  StepLabel,
  Stepper,
  Tab,
  Tabs,
  Typography,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from "@mui/material";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom";
import Select, { SingleValue } from "react-select";
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
import axios from "axios";
import { sortMaterials } from "../utils/sortMaterials";
import { getFuzzyMatches } from "../utils/fuzzySearch";

// Import the new subcomponents
import EditMaterialDialog from "./LCACalculator/EditMaterialDialog";
import MaterialList from "./LCACalculator/MaterialList";
import ModelledMaterialList from "./LCACalculator/ModelledMaterialList";
import UnmodelledMaterialForm from "./LCACalculator/UnmodelledMaterialForm";

// Add import at the top
import { mockProjectData } from "../data/mockProjectData";

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
  Wood: ["Brettschichtholz", "Holz"],
};

interface IFCMaterial {
  name: string;
  volume: number;
}

interface IFCResult {
  projectId: string;
  ifcData: {
    materials: IFCMaterial[];
  };
  materialMappings: Record<string, string>;
}

// Update API configuration to use import.meta.env
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Add new interface for project options
interface ProjectOption {
  value: string;
  label: string;
}

// Add project options constant
const PROJECT_OPTIONS: ProjectOption[] = [
  {
    value: "juch-areal",
    label: "Recyclingzentrum Juch-Areal",
  },
];

export default function LCACalculatorComponent(): JSX.Element {
  const theme = useTheme();
  const [modelledMaterials, setModelledMaterials] = useState<Material[]>(
    DefaultModelledMaterials
  );
  const [unmodelledMaterials, setUnmodelledMaterials] =
    useState<UnmodelledMaterial[]>(UnmodelledMaterials);
  const [kbobMaterials, setKbobMaterials] = useState<KbobMaterial[]>([]);
  const [kbobLoading, setKbobLoading] = useState(true);
  const [kbobError, setKbobError] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState(0);
  const [materialDensities, setMaterialDensities] = useState<
    Record<string, number>
  >({});
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
  const [sortBy, setSortBy] = useState<SortOption>("volume");
  const [sidebarContainer, setSidebarContainer] = useState<HTMLElement | null>(
    null
  );
  const [editingMaterial, setEditingMaterial] =
    useState<UnmodelledMaterial | null>(null);
  const [ifcResult, setIfcResult] = useState<IFCResult>({
    projectId: "",
    ifcData: { materials: [] },
    materialMappings: {},
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [impactPreview, setImpactPreview] = useState<{
    currentImpact: string;
    newImpact: string;
    savings: string;
    unit: string;
  }>({
    currentImpact: "",
    newImpact: "",
    savings: "",
    unit: "",
  });
  const [bulkMatchDialogOpen, setBulkMatchDialogOpen] = useState(false);
  const [suggestedMatches, setSuggestedMatches] = useState<
    Record<string, KbobMaterial[]>
  >({});

  // Add new state for selected project
  const [selectedProject, setSelectedProject] = useState<ProjectOption | null>(
    null
  );

  // Remove DEMO_PROJECT_ID constant since we'll use selectedProject instead

  // Modify the useEffect for fetching IFC data to depend on selectedProject
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedProject?.value) {
        // Reset state when no project is selected
        setIfcResult({
          projectId: "",
          ifcData: { materials: [] },
          materialMappings: {},
        });
        setModelledMaterials([]);
        return;
      }

      try {
        // Instead of API call, use mock data
        const mockResponse = mockProjectData[selectedProject.value];

        if (!mockResponse) {
          console.log("No mock data found for project:", selectedProject.value);
          setIfcResult({
            projectId: selectedProject.value,
            ifcData: { materials: [] },
            materialMappings: {},
          });
          return;
        }

        console.log("Mock API response:", mockResponse);

        const processedResult = {
          projectId: selectedProject.value,
          ifcData: {
            materials: Array.isArray(mockResponse.ifcData?.materials)
              ? mockResponse.ifcData.materials
              : [],
          },
          materialMappings: mockResponse.materialMappings || {},
        };

        console.log("Setting processed IFC result:", processedResult);
        setIfcResult(processedResult);

        if (Array.isArray(mockResponse.ifcData?.materials)) {
          const materials = mockResponse.ifcData.materials.map((material) => ({
            id: material.name,
            name: material.name,
            volume: material.volume,
            ebkp: "",
            kbobId: mockResponse.materialMappings?.[material.name] || "",
          }));
          console.log("Setting modelled materials:", materials);
          setModelledMaterials(materials);
        }
      } catch (error) {
        console.error("Error processing mock data:", error);
        setIfcResult({
          projectId: selectedProject.value,
          ifcData: { materials: [] },
          materialMappings: {},
        });
      }
    };

    fetchData();
  }, [selectedProject]); // Changed dependency from DEMO_PROJECT_ID to selectedProject

  useEffect(() => {
    const loadKBOBMaterials = async () => {
      try {
        setKbobLoading(true);
        setKbobError(null);
        const materials = await fetchKBOBMaterials();
        console.log("Loaded KBOB materials:", materials); // Add detailed logging
        setKbobMaterials(materials);
      } catch (error) {
        console.error("Error loading KBOB materials:", error);
        setKbobError(
          error instanceof Error
            ? error.message
            : "Failed to load KBOB materials"
        );
      } finally {
        setKbobLoading(false);
      }
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
    if (ifcResult && ifcResult.materialMappings) {
      setMatches(ifcResult.materialMappings);
    }
  }, [ifcResult]);

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
    if (kbobLoading) {
      return [
        { value: "", label: "Loading KBOB materials...", isDisabled: true },
      ];
    }

    if (kbobError) {
      return [
        { value: "", label: "Error loading KBOB materials", isDisabled: true },
      ];
    }

    if (kbobMaterials.length === 0) {
      return [
        { value: "", label: "No KBOB materials available", isDisabled: true },
      ];
    }

    // Filter out materials with 0 density unless they have a density range
    const validMaterials = kbobMaterials.filter(
      (kbob) => kbob.densityRange || (!kbob.densityRange && kbob.density > 0)
    );

    // Create base options with density information
    const baseOptions = validMaterials.map((kbob) => ({
      value: kbob.id,
      label: `${kbob.nameDE} ${
        kbob.densityRange
          ? `(${kbob.densityRange.min}-${kbob.densityRange.max} kg/m³)`
          : `(${kbob.density} kg/m³)`
      }`,
    }));

    // For modelled materials tab, add suggestions
    if (activeTab === 0) {
      return (materialId: string): MaterialOption[] | MaterialOptionGroup[] => {
        const material = modelledMaterials.find((m) => m.id === materialId);
        if (!material) return baseOptions;

        // Get fuzzy matches for this material's name
        const suggestions = getFuzzyMatches(material.name, validMaterials, 1);

        if (suggestions.length === 0) return baseOptions;

        // Create suggestion options with custom formatting
        const suggestionOptions = suggestions.map((kbob) => ({
          value: kbob.id,
          label: `✨ ${kbob.nameDE} ${
            kbob.densityRange
              ? `(${kbob.densityRange.min}-${kbob.densityRange.max} kg/m³)`
              : `(${kbob.density} kg/m³)`
          }`,
          className: "suggestion-option",
        }));

        // Group the suggestions and base options
        return [
          {
            label: "Vorschläge basierend auf Name",
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
  }, [kbobMaterials, kbobLoading, kbobError, activeTab, modelledMaterials]);

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

  const instructions = [
    {
      label: "1. BIM-Daten laden",
      description:
        "Wählen Sie das Projekt um Materialdaten aus dem IFC Modell zu laden.",
    },
    {
      label: "2. KBOB-Referenzen zuordnen",
      description:
        "Ordnen Sie die Materialien den passenden KBOB-Referenzen zu.",
    },
    {
      label: "3. Ökobilanz berechnen",
      description:
        "Berechnen Sie die Umweltauswirkungen Ihres Projekts und senden Sie die Resultate ans Dashboard.",
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

  // Add handler for confirmation
  const handleConfirmCalculation = async () => {
    setLoading(true);
    try {
      await handleAbschliessen();
      setConfirmationOpen(false);
      // Show success message
    } catch (error) {
      console.error("Error updating LCA:", error);
      // Show error message
    } finally {
      setLoading(false);
    }
  };

  // Update the showCalculationPreview function to only use matched materials
  const showCalculationPreview = () => {
    // Only calculate with matched materials
    const matchedMaterials = modelledMaterials.filter((m) => matches[m.id]);
    const currentTotal = calculator.calculateGrandTotal(
      matchedMaterials,
      matches,
      kbobMaterials,
      outputFormat,
      unmodelledMaterials,
      materialDensities
    );

    // Calculate previous total using the same formatting
    const currentTotalValue =
      parseFloat(currentTotal.replace(/[^\d.-]|Mio\./g, "")) *
      (currentTotal.includes("Mio.") ? 1_000_000 : 1);
    const previousTotalValue = currentTotalValue * 1.2;
    const savingsValue = previousTotalValue - currentTotalValue;

    setImpactPreview({
      currentImpact: calculator.calculateGrandTotal(
        matchedMaterials,
        matches,
        kbobMaterials,
        outputFormat,
        unmodelledMaterials,
        materialDensities,
        previousTotalValue
      ),
      newImpact: currentTotal,
      savings: calculator.calculateGrandTotal(
        matchedMaterials,
        matches,
        kbobMaterials,
        outputFormat,
        unmodelledMaterials,
        materialDensities,
        savingsValue
      ),
      unit: OutputFormatUnits[outputFormat],
    });
    setConfirmationOpen(true);
  };

  // Update the findBestMatchesForAll function
  const findBestMatchesForAll = useCallback(() => {
    const unmatched = modelledMaterials.filter((m) => !matches[m.id]);
    const suggestions: Record<string, KbobMaterial[]> = {};

    // Filter valid materials (non-zero density or has density range)
    const validMaterials = kbobMaterials.filter(
      (kbob) => kbob.densityRange || (!kbob.densityRange && kbob.density > 0)
    );

    unmatched.forEach((material) => {
      suggestions[material.id] = getFuzzyMatches(
        material.name,
        validMaterials,
        1
      );
    });

    setSuggestedMatches(suggestions);
    setBulkMatchDialogOpen(true);
  }, [modelledMaterials, matches, kbobMaterials]);

  // Add function to apply selected matches
  const applyBulkMatches = useCallback(() => {
    const newMatches = { ...matches };
    Object.entries(suggestedMatches).forEach(([materialId, suggestions]) => {
      if (suggestions.length > 0) {
        newMatches[materialId] = suggestions[0].id;
      }
    });
    setMatches(newMatches);
    setBulkMatchDialogOpen(false);
  }, [matches, suggestedMatches]);

  // Update the bulk matching dialog content
  const bulkMatchingDialog = (
    <Dialog
      open={bulkMatchDialogOpen}
      onClose={() => setBulkMatchDialogOpen(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="h6">
            Vorgeschlagene Zuordnungen überprüfen
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {Object.keys(suggestedMatches).length} Materialien
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {Object.entries(suggestedMatches).map(([materialId, suggestions]) => {
            const material = modelledMaterials.find((m) => m.id === materialId);
            const suggestion = suggestions[0];

            return (
              <Paper
                key={materialId}
                sx={{
                  p: 2,
                  mb: 2,
                  bgcolor: "background.default",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Box>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {material?.name}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                    >
                      Volumen: {material?.volume.toLocaleString()} m³
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    {suggestion ? (
                      <>
                        <Box sx={{ textAlign: "right" }}>
                          <Typography variant="subtitle2" color="primary">
                            {suggestion.nameDE}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {suggestion.densityRange
                              ? `${suggestion.densityRange.min}-${suggestion.densityRange.max} kg/m³`
                              : `${suggestion.density} kg/m³`}
                          </Typography>
                        </Box>
                        <Button
                          size="small"
                          color="inherit"
                          onClick={() => {
                            setSuggestedMatches((prev) => ({
                              ...prev,
                              [materialId]: [],
                            }));
                          }}
                        >
                          Ablehnen
                        </Button>
                      </>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Keine Übereinstimmung
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Paper>
            );
          })}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={() => setBulkMatchDialogOpen(false)}
          variant="outlined"
          color="inherit"
        >
          Abbrechen
        </Button>
        <Button onClick={applyBulkMatches} variant="contained" color="primary">
          Zuordnungen übernehmen
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Update the confirmation dialog content
  const [confirmationStep, setConfirmationStep] = useState<1 | 2>(1);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const confirmationContent = (
    <Dialog
      open={confirmationOpen}
      onClose={() => {
        setConfirmationOpen(false);
        setConfirmationStep(1);
      }}
      maxWidth="sm"
      fullWidth
    >
      {confirmationStep === 1 ? (
        <>
          <DialogTitle sx={{ pb: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="h6">Ökobilanz überprüfen</Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ py: 2 }}>
              {modelledMaterials.filter((m) => !matches[m.id]).length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    {modelledMaterials.filter((m) => !matches[m.id]).length} von{" "}
                    {modelledMaterials.length} Materialien sind nicht zugeordnet
                    und werden nicht berücksichtigt.
                  </Typography>
                  <Button
                    onClick={findBestMatchesForAll}
                    variant="text"
                    color="primary"
                    startIcon={
                      <Box component="span" sx={{ fontSize: "1.1em" }}>
                        ✨
                      </Box>
                    }
                    sx={{ mt: 1, textTransform: "none" }}
                  >
                    Automatische Zuordnung vorschlagen
                  </Button>
                </Box>
              )}
              <Typography variant="body1" gutterBottom>
                Ihre Materialzuordnungen führen zu folgenden Änderungen:
              </Typography>
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  bgcolor: "grey.50",
                  borderRadius: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography color="text.secondary">
                    Bisherige Emissionen:
                  </Typography>
                  <Typography fontWeight="medium">
                    {impactPreview.currentImpact} {impactPreview.unit}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography color="text.secondary">Update:</Typography>
                  <Typography fontWeight="medium" color="primary.main">
                    {impactPreview.newImpact} {impactPreview.unit}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    mt: 1,
                    pt: 1,
                    borderTop: 1,
                    borderColor: "divider",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography fontWeight="medium">
                    Potentielle Einsparung:
                  </Typography>
                  <Typography fontWeight="bold" color="primary.main">
                    {impactPreview.savings} {impactPreview.unit}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button
              onClick={() => {
                setConfirmationOpen(false);
                setConfirmationStep(1);
              }}
              variant="outlined"
              color="inherit"
            >
              Zurück
            </Button>
            <Button
              onClick={() => setConfirmationStep(2)}
              variant="contained"
              color="primary"
            >
              Weiter
            </Button>
          </DialogActions>
        </>
      ) : (
        <>
          <DialogTitle sx={{ pb: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="h6">
                Ökobilanz ans Dashboard senden
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ py: 2 }}>
              <Typography variant="body1" paragraph>
                Bitte beachten Sie:
              </Typography>
              <Box component="ul" sx={{ pl: 2, mb: 2 }}>
                <Typography
                  component="li"
                  variant="body2"
                  color="text.secondary"
                  gutterBottom
                >
                  Die Ökobilanz wird im Nachhaltigkeitsmonitoring Dashboard
                  aktualisiert
                </Typography>
                <Typography
                  component="li"
                  variant="body2"
                  color="text.secondary"
                  gutterBottom
                >
                  Änderungen sind nur durch neue Materialzuordnungen oder ein
                  IFC-Update möglich
                </Typography>
                <Typography
                  component="li"
                  variant="body2"
                  color="text.secondary"
                >
                  Die Aktualisierung im Dashboard kann einige Minuten dauern
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ mt: 2 }}>
                Möchten Sie die neue Ökobilanz jetzt ans Dashboard senden?
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button
              onClick={() => setConfirmationStep(1)}
              variant="outlined"
              color="inherit"
            >
              Zurück
            </Button>
            <Button
              onClick={async () => {
                await handleConfirmCalculation();
                setShowSuccessMessage(true);
              }}
              variant="contained"
              color="primary"
            >
              Ans Dashboard senden
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );

  // Add success message dialog
  const successDialog = (
    <Dialog
      open={showSuccessMessage}
      onClose={() => setShowSuccessMessage(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              bgcolor: "success.light",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "success.dark",
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </Box>
          <Typography variant="h6">Erfolgreich gesendet</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" paragraph>
          Die Ökobilanz wurde erfolgreich im Nachhaltigkeitsmonitoring
          registriert.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Das Dashboard wird in Kürze aktualisiert. Sie können diese Ansicht
          jetzt schliessen.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={() => {
            setShowSuccessMessage(false);
            setConfirmationOpen(false);
            setConfirmationStep(1);
          }}
          variant="contained"
          color="primary"
        >
          Schliessen
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Add progress bar component
  const progressBar = (
    <Box
      sx={{
        width: `${
          (modelledMaterials.filter((m) => matches[m.id]).length /
            modelledMaterials.length) *
          100
        }%`,
        bgcolor: theme.palette.primary.main,
        borderRadius: "9999px",
        height: "100%",
        transition: "width 0.3s ease",
      }}
    />
  );

  // Update the calculation button text
  const calculationButton = (
    <Box sx={{ mt: 3 }}>
      {modelledMaterials.filter((m) => matches[m.id]).length === 0 ? (
        <>
          <Box sx={{ mb: 2, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Keine Materialien zugeordnet
            </Typography>
            <Button
              variant="outlined"
              color="primary"
              onClick={findBestMatchesForAll}
              startIcon={
                <Box component="span" sx={{ fontSize: "1.1em" }}>
                  ✨
                </Box>
              }
              sx={{
                textTransform: "none",
                bgcolor: "background.paper",
                "&:hover": {
                  bgcolor: "background.paper",
                },
              }}
            >
              Automatische Zuordnung vorschlagen
            </Button>
          </Box>
        </>
      ) : null}
      <Button
        variant="contained"
        color="primary"
        fullWidth
        size="large"
        onClick={showCalculationPreview}
        disabled={loading}
        sx={{
          py: 1.5,
          textTransform: "none",
          fontWeight: 500,
          letterSpacing: "0.3px",
          boxShadow: "none",
          bgcolor: "primary.main",
          "&:hover": {
            bgcolor: "primary.main",
          },
        }}
      >
        Ökobilanz ans Dashboard senden
      </Button>
    </Box>
  );

  // Update the sidebar content
  const sidebarContent = (
    <>
      <Paper
        elevation={1}
        sx={{
          p: 2,
          height: "fit-content",
          backgroundColor: "background.paper",
          borderRadius: 1,
          width: "100%",
          "& > .MuiBox-root": { width: "100%" },
        }}
      >
        {/* Project Selection */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Projekt auswählen
          </Typography>
          <Select
            value={selectedProject}
            onChange={(newValue) =>
              setSelectedProject(newValue as ProjectOption)
            }
            options={PROJECT_OPTIONS}
            styles={selectStyles}
            placeholder="Wählen Sie ein Projekt..."
            isClearable
          />
        </Box>

        {/* Process Steps Section - Always visible */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight="600" gutterBottom>
            Anleitung
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

        {/* Project-dependent content */}
        {selectedProject ? (
          <Box sx={{ mb: 3 }}>
            {/* Total Result and Output Format Group */}
            <Box sx={{ mb: 2 }}>
              {/* Total Result */}
              <Box
                sx={{
                  p: 2,
                  mb: 1.5,
                  background: "linear-gradient(to right top, #F1D900, #fff176)",
                  borderRadius: 1,
                }}
              >
                {/* Add debug logging */}
                {console.log("Calculating total with:", {
                  matchedMaterials: modelledMaterials.filter(
                    (m) => matches[m.id]
                  ),
                  matches,
                  kbobMaterials,
                  outputFormat,
                  unmodelledMaterials,
                  materialDensities,
                })}
                <Typography
                  variant="h4"
                  component="p"
                  color="common.black"
                  fontWeight="bold"
                >
                  {calculator.calculateGrandTotal(
                    modelledMaterials.filter((m) => matches[m.id]),
                    matches,
                    kbobMaterials,
                    outputFormat,
                    unmodelledMaterials,
                    materialDensities
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

              {/* Output Format */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  Öko-Indikator
                </Typography>
                <Select
                  value={outputFormatOptions.find(
                    (opt) => opt.value === outputFormat
                  )}
                  onChange={(newValue) =>
                    setOutputFormat(newValue?.value as OutputFormats)
                  }
                  options={outputFormatOptions}
                  styles={{
                    ...selectStyles,
                    control: (base) => ({
                      ...base,
                      backgroundColor: "white",
                      borderColor: theme.palette.divider,
                      "&:hover": {
                        borderColor: theme.palette.primary.main,
                      },
                    }),
                  }}
                  className="w-full"
                />
              </Box>
            </Box>

            {/* Separator */}
            <Box
              sx={{
                height: "1px",
                bgcolor: "divider",
                my: 2,
                width: "100%",
              }}
            />

            {/* Progress */}
            <Box sx={{ pt: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
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
                      bgcolor: theme.palette.grey[100],
                      borderRadius: "9999px",
                      height: "8px",
                      mt: 0.5,
                    }}
                  >
                    {progressBar}
                  </Box>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {modelledMaterials.filter((m) => matches[m.id]).length} von{" "}
                  {modelledMaterials.length} zugeordnet
                </Typography>
              </Box>
            </Box>

            {/* Calculation Button */}
            {calculationButton}
          </Box>
        ) : (
          <Typography color="text.secondary" align="center">
            Bitte wählen Sie ein Projekt aus, um fortzufahren.
          </Typography>
        )}
      </Paper>
      {confirmationContent}
      {successDialog}
    </>
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

  // Replace handleAbschliessen with mock version
  const handleAbschliessen = () => {
    if (!selectedProject?.value) return;

    setLoading(true);
    // Simulate API delay
    setTimeout(() => {
      try {
        // Update local mock data
        if (mockProjectData[selectedProject.value]) {
          mockProjectData[selectedProject.value].materialMappings = matches;
        }
        setMessage("Material mappings updated successfully!");
      } catch (error) {
        console.error("Error updating material mappings:", error);
        setMessage("Error updating material mappings");
      } finally {
        setLoading(false);
      }
    }, 1000);
  };

  // Remove or update handleMaterialMappingUpdate to use mock data
  const handleMaterialMappingUpdate = async (
    mappings: Record<string, string>
  ) => {
    setLoading(true);
    setTimeout(() => {
      try {
        if (mockProjectData[ifcResult.projectId]) {
          mockProjectData[ifcResult.projectId].materialMappings = mappings;
          setMessage("Material mappings updated successfully");
          // Update local state
          setIfcResult((prev) => ({
            ...prev,
            materialMappings: mappings,
          }));
        }
      } catch (error) {
        console.error("Error updating material mappings:", error);
        setMessage("Error updating material mappings");
      } finally {
        setLoading(false);
      }
    }, 1000);
  };

  // Add handler for density updates
  const handleDensityUpdate = (materialId: string, newDensity: number) => {
    setMaterialDensities((prev) => ({
      ...prev,
      [materialId]: newDensity,
    }));
  };

  return (
    <Box sx={{ width: "100%", height: "100%" }}>
      {sidebarContainer &&
        ReactDOM.createPortal(sidebarContent, sidebarContainer)}
      {bulkMatchingDialog}
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
              outputFormat={outputFormat}
              handleDensityUpdate={handleDensityUpdate}
              materialDensities={materialDensities}
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
      </Box>

      {/* Floating Info Panel */}
      <Paper
        elevation={2}
        sx={{
          position: "fixed",
          bottom: 24,
          right: 24,
          maxWidth: { xs: 280, sm: 320 },
          borderRadius: 2,
          overflow: "visible",
          bgcolor: "background.paper",
          transform: "translate3d(0,0,0)",
          willChange: "transform",
          transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          cursor: "default",
          "&:hover": {
            transform: "translate3d(0,-4px,0)",
            "& .expandable-content": {
              opacity: 1,
              transform: "translate3d(0,0,0)",
              visibility: "visible",
              transition:
                "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), visibility 0s",
            },
          },
        }}
      >
        <Box
          className="expandable-content"
          sx={{
            position: "absolute",
            bottom: "100%",
            left: 0,
            right: 0,
            visibility: "hidden",
            transform: "translate3d(0,20px,0)",
            opacity: 0,
            willChange: "transform, opacity",
            transition:
              "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), visibility 0s linear 0.2s",
            bgcolor: "background.paper",
            borderTopLeftRadius: 2,
            borderTopRightRadius: 2,
            boxShadow: theme.shadows[8],
            border: 1,
            borderColor: "primary.main",
            "&::before": {
              content: '""',
              position: "absolute",
              bottom: -8,
              left: 0,
              right: 0,
              height: 8,
              bgcolor: "transparent",
            },
          }}
        >
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              KBOB Ökobilanzdaten sind die offizielle Datenquelle für die
              Bewertung der Umweltwirkungen von Bauprodukten und -prozessen in
              der Schweiz. Sie ermöglichen eine fundierte und vergleichbare
              Beurteilung der Nachhaltigkeit von Bauprojekten. Mehr Infos unter
              👇
            </Typography>
          </Box>
        </Box>
        <Box
          sx={{
            p: 1.5,
            bgcolor: "background.paper",
            border: 1,
            borderColor: "primary.main",
            color: "primary.main",
            display: "flex",
            alignItems: "center",
            gap: 1,
            borderRadius: 2,
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 500, fontSize: "0.875rem" }}
          >
            KBOB Ökobilanzdaten 6.2
          </Typography>
          <Box sx={{ ml: "auto", display: "flex", gap: 1 }}>
            <Button
              component="a"
              href="https://www.kbob.admin.ch/de/oekobilanzdaten-im-baubereich"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                minWidth: "auto",
                p: 0.5,
                color: "primary.main",
                opacity: 0.8,
                "&:hover": { opacity: 1 },
              }}
            >
              <svg
                height="18"
                width="18"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
              </svg>
            </Button>
            <Button
              component="a"
              href="https://github.com/LTplus-AG/nhm-react-lca"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                minWidth: "auto",
                p: 0.5,
                color: "primary.main",
                opacity: 0.8,
                "&:hover": { opacity: 1 },
              }}
            >
              <svg
                height="18"
                width="18"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
              </svg>
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
