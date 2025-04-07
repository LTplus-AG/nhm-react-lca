import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  IconButton,
  MenuItem,
  Select as MuiSelect,
  Paper,
  Radio,
  RadioGroup,
  Step,
  StepLabel,
  Stepper,
  Tab,
  Tabs,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { getFuzzyMatches } from "../utils/fuzzySearch";
// Import icons
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";

// Import the new subcomponents
import EditMaterialDialog from "./LCACalculator/EditMaterialDialog";
import ModelledMaterialList from "./LCACalculator/ModelledMaterialList";
import ReviewDialog from "./LCACalculator/ReviewDialog";
import UnmodelledMaterialForm from "./LCACalculator/UnmodelledMaterialForm";
import YearToggle from "./LCACalculator/YearToggle";

// Import WebSocket service
import {
  ConnectionStatus,
  getProjectMaterials,
  getProjects,
  initWebSocket,
  onStatusChange,
  saveProjectMaterials,
} from "../services/websocketService";

const calculator = new LCACalculator();

interface MaterialOption {
  value: string;
  label: string;
  isDisabled?: boolean;
}

// Add new type for sort options
type SortOption = "volume" | "name";

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
    materials?: IFCMaterial[];
    elements?: Element[];
    totalImpact?: {
      gwp: number;
      ubp: number;
      penr: number;
    };
  };
  materialMappings: Record<string, string>;
}

// Element type for ReviewDialog
interface Element {
  id: string;
  element_type: string;
  quantity: number;
  properties: {
    level?: string;
    is_structural?: boolean;
    is_external?: boolean;
  };
  materials: {
    name: string;
    volume: number;
    unit: string;
  }[];
  impact?: {
    gwp: number;
    ubp: number;
    penr: number;
  };
}
interface ProjectOption {
  value: string;
  label: string;
}

const Instructions = [
  {
    label: "Daten hochladen",
    description:
      "Laden Sie Ihre IFC-Datei hoch oder bearbeiten Sie Materialien manuell.",
  },
  {
    label: "Materialien zuordnen",
    description:
      "Ordnen Sie die erkannten Materialien den entsprechenden KBOB-Materialien zu.",
  },
  {
    label: "Ökobilanz überprüfen",
    description:
      "Überprüfen Sie die berechnete Ökobilanz und senden Sie die Daten.",
  },
];

const DEFAULT_PROJECT_OPTIONS: ProjectOption[] = [
  { value: "67e391836c096bf72bc23d97", label: "Recyclingzentrum Juch-Areal" },
  {
    value: "67e392836c096bf72bc23d98",
    label: "Gesamterneuerung Stadthausanlage",
  },
  { value: "67e393836c096bf72bc23d99", label: "Amtshaus Walche" },
  {
    value: "67e394836c096bf72bc23d9a",
    label: "Gemeinschaftszentrum Wipkingen",
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
    ifcData: {
      materials: [],
      elements: [],
      totalImpact: { gwp: 0, ubp: 0, penr: 0 },
    },
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

  // Add new state for calculated elements
  const [calculatedElements, setCalculatedElements] = useState<Element[]>([]);

  // Add new state for selected project
  const [selectedProject, setSelectedProject] = useState<ProjectOption | null>(
    null
  );

  // First, let's add some missing state definitions
  const [showMatchedMaterials, setShowMatchedMaterials] = useState(true);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

  // Add new state for project options
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);

  // Add new state for per year toggle
  const [showPerYear, setShowPerYear] = useState(false);

  // Add state for total impact
  const [totalImpact, setTotalImpact] = useState({
    gwp: 0,
    ubp: 0,
    penr: 0,
    modelledMaterials: 0,
    unmodelledMaterials: 0,
    totalElementCount: 0,
  });

  // Add formatNumber function first
  const formatNumber = (num: number, decimals: number = 0) => {
    return new Intl.NumberFormat("de-CH", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping: true,
    }).format(num);
  };

  // Then add formatImpactValue function
  const formatImpactValue = (value: number, unit: string) => {
    const displayValue = showPerYear ? value / 45 : value;
    // For per-year values, keep 2 decimal places, otherwise remove trailing zeros
    const formattedValue = showPerYear
      ? formatNumber(displayValue, 2)
      : formatNumber(displayValue);
    return `${formattedValue} ${unit}${showPerYear ? "/Jahr" : ""}`;
  };

  // Update the calculateGrandTotal function
  const calculateGrandTotal = (
    materials: Material[],
    matches: Record<string, string>,
    kbobMaterials: KbobMaterial[],
    outputFormat: OutputFormats
  ) => {
    console.log("Calculate Grand Total with:", {
      materials: materials.length,
      matches: Object.keys(matches).length,
      kbobMaterials: kbobMaterials.length,
    });

    // Directly use the calculator's built-in function with showPerYear support
    return calculator.calculateGrandTotal(
      materials,
      matches,
      kbobMaterials,
      outputFormat,
      unmodelledMaterials,
      materialDensities,
      undefined,
      showPerYear
    );
  };

  // Update the currentImpact calculation
  const currentImpact = useMemo(() => {
    if (kbobMaterials.length === 0) return { currentImpact: "0", unit: "" };

    const formattedValue = calculator.calculateGrandTotal(
      modelledMaterials,
      matches,
      kbobMaterials,
      outputFormat,
      unmodelledMaterials,
      materialDensities,
      undefined,
      showPerYear
    );

    return {
      currentImpact: formattedValue,
      unit: "", // Unit is now included in the formatted value
    };
  }, [
    modelledMaterials,
    matches,
    kbobMaterials,
    unmodelledMaterials,
    materialDensities,
    outputFormat,
    showPerYear, // Add showPerYear to dependencies
  ]);

  // Initialize WebSocket connection
  useEffect(() => {
    initWebSocket();

    // Set up status change handler
    const handleStatusChange = (status: ConnectionStatus) => {
      console.log("WebSocket status changed:", status);
    };

    onStatusChange(handleStatusChange);

    return () => {
      // Cleanup if needed
    };
  }, []);

  // Load project materials when a project is selected
  useEffect(() => {
    const loadProjectMaterials = async () => {
      if (!selectedProject) {
        console.log("No project selected");
        // Clear state if no project is selected
        setModelledMaterials([]);
        setMatches({});
        setCalculatedElements([]);
        setIfcResult({
          projectId: "",
          ifcData: {
            materials: [],
            elements: [],
            totalImpact: { gwp: 0, ubp: 0, penr: 0 },
          },
          materialMappings: {},
        });
        setTotalImpact({
          gwp: 0,
          ubp: 0,
          penr: 0,
          modelledMaterials: 0,
          unmodelledMaterials: 0,
          totalElementCount: 0,
        });
        setLoading(false);
        setMessage("");
        return;
      }

      // Reset state before loading new project data
      console.log(`Resetting state for new project: ${selectedProject.label}`);
      setModelledMaterials([]);
      setMatches({});
      setCalculatedElements([]);
      setIfcResult({
        projectId: "",
        ifcData: {
          materials: [],
          elements: [],
          totalImpact: { gwp: 0, ubp: 0, penr: 0 },
        },
        materialMappings: {},
      });
      setTotalImpact({
        gwp: 0,
        ubp: 0,
        penr: 0,
        modelledMaterials: 0,
        unmodelledMaterials: 0,
        totalElementCount: 0,
      });
      setLoading(true); // Set loading state
      setMessage(""); // Clear any previous messages

      try {
        console.log("Loading materials for project:", selectedProject.value);
        const projectData = await getProjectMaterials(selectedProject.value);
        console.log("Received project data:", projectData);

        if (projectData && projectData.ifcData) {
          // Store the full result as is
          setIfcResult({
            projectId: selectedProject.value,
            ifcData: projectData.ifcData,
            materialMappings: projectData.materialMappings || {},
          });

          // Check if we have elements data (new format) or materials data (old format)
          let materialsArray: {
            id: string;
            name: string;
            volume: number;
            unit: string;
          }[] = [];

          if (
            projectData.ifcData.elements &&
            projectData.ifcData.elements.length > 0
          ) {
            console.log("Processing elements data");

            // Extract unique materials from elements
            const materialMap = new Map<string, number>();

            projectData.ifcData.elements.forEach((element: any) => {
              if (element.materials && element.materials.length > 0) {
                element.materials.forEach(
                  (material: { name: string; volume: number }) => {
                    const name = material.name;
                    // Check if we already have this material, if yes - add volumes
                    if (materialMap.has(name)) {
                      materialMap.set(
                        name,
                        materialMap.get(name)! + material.volume
                      );
                    } else {
                      materialMap.set(name, material.volume);
                    }
                  }
                );
              }
            });

            // Convert the map to array of materials
            materialsArray = Array.from(materialMap.entries()).map(
              ([name, volume]) => ({
                id: name, // Use name as id
                name: name,
                volume: volume,
                unit: "m³",
              })
            );

            console.log("Extracted materials from elements:", materialsArray);

            // Also set the calculated elements for the review dialog
            setCalculatedElements(projectData.ifcData.elements);
          } else if (projectData.ifcData.materials) {
            console.log("Using direct materials data");
            const materials = projectData.ifcData.materials || [];
            materialsArray = materials.map((material) => ({
              id: material.name,
              name: material.name,
              volume: material.volume,
              unit: "m³",
            }));
          } else {
            console.warn("No materials or elements data found");
          }

          // Update modelled materials
          setModelledMaterials(materialsArray);

          // Update matches from saved mappings
          if (projectData.materialMappings) {
            setMatches(projectData.materialMappings);
          }
        } else {
          console.warn("No valid data received from server");
          setModelledMaterials([]);
          setMatches({});
        }
      } catch (error) {
        console.error("Error loading project materials:", error);
        setMessage("Error loading project materials. Please try again.");
        // Reset materials to empty arrays on error
        setModelledMaterials([]);
        setMatches({});
      } finally {
        setLoading(false); // Ensure loading is set to false even on error
      }
    };

    loadProjectMaterials();
  }, [selectedProject]);

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

    // Cleanup function
    return () => {
      // No event listeners to remove anymore
    };
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

  const handleRemoveUnmodelledMaterial = (id: string) => {
    setUnmodelledMaterials((prev) => prev.filter((m) => m.id !== id));
  };

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
        minWidth: "120px",
        minHeight: "40px",
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
        fontSize: "0.875rem",
        padding: "8px",
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
        zIndex: 1500,
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
    if (Object.keys(matches).length < modelledMaterials.length) return 1;
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
    // Debug logging outside of render
    console.log("Calculating total with:", {
      matchedMaterials: modelledMaterials.filter((m) => matches[m.id]),
      matches,
      kbobMaterials,
      outputFormat,
      unmodelledMaterials,
      materialDensities,
    });

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

  // Use this instead of the missing method
  const showCalculationPreview = () => {
    // Only calculate with matched materials
    const matchedMaterials = modelledMaterials.filter((m) => matches[m.id]);

    // Get the correctly formatted grand total from the calculator
    const currentTotal = calculator.calculateGrandTotal(
      matchedMaterials,
      matches,
      kbobMaterials,
      outputFormat,
      unmodelledMaterials,
      materialDensities,
      undefined,
      showPerYear
    );

    setImpactPreview({
      currentImpact: currentTotal,
      newImpact: currentTotal,
      savings: currentTotal,
      unit: "", // Unit is included in the formatted value
    });
    setConfirmationOpen(true);
  };

  // Simplify the findBestMatchesForAll function to just open the matching dialog
  const findBestMatchesForAll = useCallback(() => {
    console.log("=== findBestMatchesForAll STARTED ===");
    console.log("Finding best matches for all materials");

    // Check if KBOB materials are loaded
    if (kbobLoading) {
      console.log("KBOB materials are still loading, showing alert");
      alert(
        "Die KBOB-Materialien werden noch geladen. Bitte warten Sie einen Moment."
      );
      return;
    }

    if (kbobMaterials.length === 0) {
      console.error("No KBOB materials loaded for matching!");
      alert(
        "Keine KBOB-Materialien geladen. Bitte warten Sie, bis die Materialien geladen sind."
      );
      return;
    }

    console.log("Current matches:", matches);
    console.log("Modelled materials:", modelledMaterials);
    console.log("KBOB materials loaded:", kbobMaterials.length);

    // Get all materials that need matching
    const materialsToMatch = modelledMaterials;
    console.log(
      `Found ${materialsToMatch.length} materials to match:`,
      materialsToMatch
    );

    if (materialsToMatch.length === 0) {
      console.log("No materials to match, showing alert");
      alert(
        "Es sind keine Materialien vorhanden. Bitte wählen Sie zuerst ein Projekt aus."
      );
      return;
    }

    const suggestions: Record<string, KbobMaterial[]> = {};

    // Filter valid materials (non-zero density or has density range)
    const validMaterials = kbobMaterials.filter(
      (kbob) => kbob.densityRange || (!kbob.densityRange && kbob.density > 0)
    );
    console.log(
      `Using ${validMaterials.length} valid KBOB materials for matching`
    );

    // Find matches for each material
    materialsToMatch.forEach((material) => {
      const materialMatches = getFuzzyMatches(material.name, validMaterials, 1);
      console.log(
        `Found ${materialMatches.length} matches for ${material.name}:`,
        materialMatches.map((m) => m.nameDE)
      );
      suggestions[material.id] = materialMatches;
    });

    console.log("Setting suggested matches:", suggestions);
    setSuggestedMatches(suggestions);
    console.log("Opening bulk match dialog");
    setBulkMatchDialogOpen(true);
    console.log("=== findBestMatchesForAll COMPLETED ===");
  }, [modelledMaterials, matches, kbobMaterials, kbobLoading]);

  // Add function to apply selected matches
  const applyBulkMatches = useCallback(() => {
    console.log("=== applyBulkMatches STARTED ===");
    console.log("Applying bulk matches");
    console.log("Current matches:", matches);
    console.log("Suggested matches:", suggestedMatches);

    const newMatches = { ...matches };
    let matchCount = 0;

    Object.entries(suggestedMatches).forEach(([materialId, suggestions]) => {
      console.log(
        `Processing material ${materialId} with ${suggestions.length} suggestions`
      );
      if (suggestions.length > 0) {
        console.log(
          `Applying match: ${materialId} -> ${suggestions[0].id} (${suggestions[0].nameDE})`
        );
        newMatches[materialId] = suggestions[0].id;
        matchCount++;
      }
    });

    console.log(`Applied ${matchCount} new matches`);
    console.log("New matches object:", newMatches);
    setMatches(newMatches);
    setBulkMatchDialogOpen(false);

    // Show a success message
    if (matchCount > 0) {
      console.log(`Showing success alert for ${matchCount} matches`);
      alert(`${matchCount} Materialien wurden erfolgreich zugeordnet.`);
    }
    console.log("=== applyBulkMatches COMPLETED ===");
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
            flexDirection: { xs: "column", sm: "row" },
            gap: { xs: 1, sm: 0 },
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
          {Object.entries(suggestedMatches).length === 0 ? (
            <Typography variant="body1" align="center" sx={{ py: 4 }}>
              Keine Materialien zum Zuordnen gefunden.
            </Typography>
          ) : (
            Object.entries(suggestedMatches).map(
              ([materialId, suggestions]) => {
                const material = modelledMaterials.find(
                  (m) => m.id === materialId
                );
                const suggestion =
                  suggestions.length > 0 ? suggestions[0] : null;

                console.log(`Rendering material ${materialId}:`, material);
                console.log(`Suggestion for ${materialId}:`, suggestion);

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
                          {material?.name || materialId}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mt: 0.5 }}
                        >
                          Volumen: {material?.volume.toLocaleString()} m³
                        </Typography>
                      </Box>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 2 }}
                      >
                        {suggestion ? (
                          <>
                            <Box sx={{ textAlign: "right" }}>
                              <Typography variant="subtitle2" color="primary">
                                {suggestion.nameDE}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {suggestion.densityRange
                                  ? `${suggestion.densityRange.min}-${suggestion.densityRange.max} kg/m³`
                                  : `${suggestion.density} kg/m³`}
                              </Typography>
                            </Box>
                            <Button
                              size="small"
                              color="inherit"
                              onClick={() => {
                                console.log(
                                  `Rejecting match for ${materialId}`
                                );
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
              }
            )
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={() => {
            console.log("Closing bulk match dialog");
            setBulkMatchDialogOpen(false);
          }}
          variant="outlined"
          color="inherit"
        >
          Abbrechen
        </Button>
        <Button
          onClick={() => {
            console.log("Applying bulk matches");
            applyBulkMatches();
          }}
          variant="contained"
          color="primary"
          disabled={Object.entries(suggestedMatches).every(
            ([_, suggestions]) => suggestions.length === 0
          )}
        >
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
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      mt: 2,
                      mb: 2,
                    }}
                  >
                    <Button
                      onClick={() => {
                        console.log(
                          "Automatische Zuordnung vorschlagen button clicked"
                        );
                        findBestMatchesForAll();
                      }}
                      variant="outlined"
                      color="secondary"
                      startIcon={
                        <Box component="span" sx={{ fontSize: "1.1em" }}>
                          ✨
                        </Box>
                      }
                      sx={{
                        textTransform: "none",
                        borderColor: "rgba(0, 0, 0, 0.23)",
                        color: "text.secondary",
                        fontWeight: 400,
                        borderRadius: "20px",
                        px: 2,
                        py: 0.75,
                        "&:hover": {
                          borderColor: "rgba(0, 0, 0, 0.5)",
                          backgroundColor: "rgba(0, 0, 0, 0.04)",
                        },
                      }}
                    >
                      Automatische Zuordnung vorschlagen
                    </Button>
                  </Box>
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
                    {impactPreview.currentImpact}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography color="text.secondary">Update:</Typography>
                  <Typography fontWeight="medium" color="primary.main">
                    {impactPreview.newImpact}
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
                    {impactPreview.savings}
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
          (modelledMaterials.filter((material) => {
            const matchId = matches[material.id];
            return (
              matchId &&
              matchId.trim() !== "" &&
              kbobMaterials.some((m) => m.id === matchId)
            );
          }).length /
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

  // Update the calculation button text - remove duplicate button
  const calculationButton = (
    <Box sx={{ mt: 3 }}>
      {modelledMaterials.filter((material) => {
        const matchId = matches[material.id];
        return (
          matchId &&
          matchId.trim() !== "" &&
          kbobMaterials.some((m) => m.id === matchId)
        );
      }).length === 0 ? (
        <>
          <Box sx={{ mb: 2, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Keine Materialien zugeordnet
            </Typography>
          </Box>
        </>
      ) : null}
      <Box sx={{ display: "flex", justifyContent: "center", mt: 2, mb: 2 }}>
        <Button
          onClick={() => {
            console.log("Automatische Zuordnung vorschlagen button clicked");
            findBestMatchesForAll();
          }}
          variant="outlined"
          color="secondary"
          startIcon={
            <Box component="span" sx={{ fontSize: "1.1em" }}>
              ✨
            </Box>
          }
          sx={{
            textTransform: "none",
            borderColor: "rgba(0, 0, 0, 0.23)",
            color: "text.secondary",
            fontWeight: 400,
            borderRadius: "20px",
            px: 2,
            py: 0.75,
            "&:hover": {
              borderColor: "rgba(0, 0, 0, 0.5)",
              backgroundColor: "rgba(0, 0, 0, 0.04)",
            },
          }}
        >
          Automatische Zuordnung vorschlagen
        </Button>
      </Box>
    </Box>
  );

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleEditMaterial = (material: UnmodelledMaterial) => {
    setEditingMaterial(material);
  };

  const handleSaveEdit = (updatedMaterial: UnmodelledMaterial) => {
    setUnmodelledMaterials((prev) =>
      prev.map((m) => (m.id === updatedMaterial.id ? updatedMaterial : m))
    );
    setEditingMaterial(null);
  };

  const handleAbschliessen = async () => {
    if (!selectedProject) {
      setMessage("Please select a project first");
      return;
    }

    try {
      setLoading(true);

      // Save current state to database
      await saveProjectMaterials(selectedProject.value, {
        ifcData: ifcResult.ifcData,
        materialMappings: matches,
      });

      setMessage("Data saved successfully");
      setConfirmationOpen(false);
    } catch (error) {
      console.error("Error saving project materials:", error);
      setMessage("Error saving project materials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleMaterialMappingUpdate = (materialId: string, kbobId: string) => {
    setMatches((prev) => ({
      ...prev,
      [materialId]: kbobId,
    }));
  };

  const handleDensityUpdate = (materialId: string, density: number) => {
    setMaterialDensities((prev) => ({
      ...prev,
      [materialId]: density,
    }));
  };

  const handleRemoveMaterial = (materialId: string) => {
    setModelledMaterials((prev) =>
      prev.filter((material) => material.id !== materialId)
    );
    setMatches((prev) => {
      const newMatches = { ...prev };
      delete newMatches[materialId];
      return newMatches;
    });
  };

  // Add logging to verify KBOB materials are loaded
  useEffect(() => {
    console.log("KBOB materials loaded:", kbobMaterials.length);
    if (kbobMaterials.length > 0) {
      console.log("Sample KBOB material:", kbobMaterials[0]);
    }
  }, [kbobMaterials]);

  // Generate calculated elements from modelled materials
  const generateCalculatedElements = useCallback(() => {
    if (modelledMaterials.length === 0 || kbobMaterials.length === 0) {
      return [];
    }

    // Convert modelled materials to elements
    const elements: Element[] = modelledMaterials
      .filter((material) => matches[material.id]) // Only include matched materials
      .map((material, index) => {
        const matchedKbobId = matches[material.id];
        const kbobMaterial = kbobMaterials.find((m) => m.id === matchedKbobId);

        if (!kbobMaterial) {
          return null;
        }

        // Calculate impact
        const volume =
          typeof material.volume === "number" ? material.volume : 0;
        const density = materialDensities[material.id] || kbobMaterial.density;
        const mass = volume * density;

        const gwp = mass * kbobMaterial.gwp;
        const ubp = mass * kbobMaterial.ubp;
        const penr = mass * kbobMaterial.penr;

        return {
          id: `element_${index + 1}`,
          element_type: "IfcMaterial",
          quantity: volume,
          properties: {
            is_structural: true,
            is_external: false,
          },
          materials: [
            {
              name: material.name,
              volume: volume,
              unit: "m³",
            },
          ],
          impact: {
            gwp: parseFloat(gwp.toFixed(2)),
            ubp: parseFloat(ubp.toFixed(2)),
            penr: parseFloat(penr.toFixed(2)),
          },
        };
      })
      .filter(Boolean) as Element[];

    return elements;
  }, [modelledMaterials, matches, kbobMaterials, materialDensities]);

  // Update calculated elements when dependencies change
  useEffect(() => {
    const elements = generateCalculatedElements();
    setCalculatedElements(elements);
  }, [generateCalculatedElements, modelledMaterials, matches, kbobMaterials]);

  // Add a new function for automatic bulk matching without dialog
  const autoBulkMatch = useCallback(() => {
    console.log("Auto bulk matching all unmatched materials");
    console.log("Current matches:", matches);
    console.log("Modelled materials:", modelledMaterials);

    if (modelledMaterials.length === 0) {
      alert(
        "Es sind keine Materialien vorhanden. Bitte wählen Sie zuerst ein Projekt aus."
      );
      return;
    }

    // Get unmatched materials - a material is unmatched if it doesn't have a valid match in the matches object
    // Force a fresh check by iterating through all modelled materials
    const unmatched: Material[] = [];
    modelledMaterials.forEach((material) => {
      const matchId = matches[material.id];
      // Check if the match exists, is not empty, and corresponds to a valid KBOB material
      const hasValidMatch =
        matchId &&
        matchId.trim() !== "" &&
        kbobMaterials.some((m) => m.id === matchId);

      console.log(
        `Material ${material.id} (${
          material.name
        }): has match = ${hasValidMatch}, match value = "${
          matchId || "undefined"
        }"`
      );

      if (!hasValidMatch) {
        unmatched.push(material);
      }
    });

    console.log(`Found ${unmatched.length} unmatched materials:`, unmatched);

    if (unmatched.length === 0) {
      alert("Alle Materialien sind bereits korrekt zugeordnet.");
      return;
    }

    // Filter valid materials (non-zero density or has density range)
    const validMaterials = kbobMaterials.filter(
      (kbob) => kbob.densityRange || (!kbob.densityRange && kbob.density > 0)
    );
    console.log(
      `Using ${validMaterials.length} valid KBOB materials for matching`
    );

    // Create new matches
    const newMatches = { ...matches };
    let matchCount = 0;

    // Find best match for each unmatched material and apply it immediately
    unmatched.forEach((material) => {
      const bestMatches = getFuzzyMatches(material.name, validMaterials, 1);
      if (bestMatches.length > 0) {
        newMatches[material.id] = bestMatches[0].id;
        matchCount++;
        console.log(`Matched ${material.name} with ${bestMatches[0].nameDE}`);
      } else {
        console.log(`No match found for ${material.name}`);
      }
    });

    // Update matches
    setMatches(newMatches);

    // Show success message
    if (matchCount > 0) {
      alert(`${matchCount} Materialien wurden automatisch zugeordnet.`);
    } else {
      alert("Es konnten keine passenden Materialien gefunden werden.");
    }
  }, [modelledMaterials, matches, kbobMaterials]);

  // Update the fetchProjects function
  const fetchProjects = async () => {
    try {
      setProjectsLoading(true);
      const projects = await getProjects();

      // Transform projects into options format
      const options = projects.map((project) => ({
        value: project.id,
        label: project.name,
      }));

      // If no projects from server, use default options
      if (options.length === 0) {
        setProjectOptions(DEFAULT_PROJECT_OPTIONS);
      } else {
        setProjectOptions(options);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      // Use default options on error
      setProjectOptions(DEFAULT_PROJECT_OPTIONS);
    } finally {
      setProjectsLoading(false);
    }
  };

  // Fetch projects on component mount
  useEffect(() => {
    fetchProjects();
  }, []);

  // Calculate total impact based on modelled materials
  useEffect(() => {
    if (kbobMaterials.length === 0) return;

    const results = calculator.calculateImpact(
      modelledMaterials,
      matches,
      kbobMaterials,
      unmodelledMaterials,
      materialDensities
    );

    // Adjust values based on showPerYear setting
    const adjustedResults = {
      gwp: showPerYear ? results.gwp / 45 : results.gwp,
      ubp: showPerYear ? results.ubp / 45 : results.ubp,
      penr: showPerYear ? results.penr / 45 : results.penr,
      modelledMaterials: results.modelledMaterials,
      unmodelledMaterials: results.unmodelledMaterials,
      totalElementCount: modelledMaterials.filter((m) => matches[m.id]).length, // Count matched elements
    };

    setTotalImpact(adjustedResults);
  }, [
    modelledMaterials,
    matches,
    kbobMaterials,
    unmodelledMaterials,
    materialDensities,
    showPerYear,
  ]);

  // Add handleSubmitReview function
  const handleSubmitReview = () => {
    // Implement your submit logic here
    alert("Ökobilanz gesendet!");
    setReviewDialogOpen(false);
  };

  return (
    <Box
      className="w-full flex flex-col md:flex-row"
      sx={{
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Sidebar - Appears above on small screens, to the left on medium and larger screens */}
      <Box
        sx={{
          width: { xs: "100%", md: "25%" },
          minWidth: { md: "350px" },
          maxWidth: { xs: "100%", md: "400px" },
          minHeight: { xs: "250px", md: 0 },
          maxHeight: { xs: "40vh", md: "100%" },
          height: { xs: "auto", md: "100%" },
          overflow: "auto",
          bgcolor: "grey.100",
          color: "primary.main",
          display: "flex",
          flexDirection: "column",
          borderBottom: { xs: 1, md: 0 },
          borderRight: 0,
          borderColor: "grey.200",
        }}
      >
        {/* Match plugin-cost padding */}
        <div className="flex flex-col flex-grow p-8">
          <Typography
            variant="h3"
            color="primary"
            className="text-5xl mb-2"
            sx={{
              fontSize: "2.5rem",
              fontWeight: 300,
              mb: 4,
              mt: 2,
              color: "#0D0599",
            }}
          >
            Ökobilanz
          </Typography>

          <Box sx={{ mb: 2 }}>
            <FormLabel focused htmlFor="select-project">
              Projekt:
            </FormLabel>
            <FormControl variant="outlined" fullWidth focused>
              <MuiSelect
                id="select-project"
                size="small"
                value={selectedProject?.value || ""}
                onChange={(e) => {
                  const selectedValue = e.target.value;
                  const projectOption = projectOptions.find(
                    (op) => op.value === selectedValue
                  );
                  if (projectOption) {
                    setSelectedProject(projectOption);
                  }
                }}
                labelId="select-project"
              >
                {projectsLoading ? (
                  <MenuItem disabled>Loading projects...</MenuItem>
                ) : projectOptions.length === 0 ? (
                  <MenuItem disabled>No projects available</MenuItem>
                ) : (
                  projectOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))
                )}
              </MuiSelect>
            </FormControl>
          </Box>

          {/* Project-dependent content */}
          {selectedProject && (
            <>
              {/* Total Result - Restore original gradient */}
              <Box
                sx={{
                  mb: 3,
                  mt: 2,
                  p: 2,
                  background: "linear-gradient(to right top, #F1D900, #fff176)",
                  borderRadius: "4px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  minHeight: "80px",
                }}
              >
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
                    materialDensities,
                    undefined,
                    showPerYear
                  )}
                </Typography>
              </Box>

              {/* Output Format */}
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{ mb: 1, fontWeight: 600, fontSize: "0.875rem" }}
                >
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

              {/* Progress */}
              <Box sx={{ pt: 0, mt: 3 }}>
                <Typography
                  variant="subtitle2"
                  sx={{ mb: 1.5, fontWeight: 600, fontSize: "0.875rem" }}
                >
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
                        bgcolor: "rgba(0,0,0,0.05)",
                        borderRadius: "9999px",
                        height: "8px",
                        mt: 0.5,
                      }}
                    >
                      {progressBar}
                    </Box>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {
                      modelledMaterials.filter((material) => {
                        const matchId = matches[material.id];
                        return (
                          matchId &&
                          matchId.trim() !== "" &&
                          kbobMaterials.some((m) => m.id === matchId)
                        );
                      }).length
                    }{" "}
                    von {modelledMaterials.length} zugeordnet
                  </Typography>
                </Box>
              </Box>

              {/* Calculation Button */}
              {calculationButton}
            </>
          )}

          {/* Process Steps Section - Always show, regardless of project selection */}
          <Box
            sx={{
              mt: "auto",
              pt: 3,
            }}
          >
            <Typography
              variant="subtitle1"
              className="font-bold mb-2"
              color="primary"
              sx={{
                fontWeight: 700,
                mb: 1,
                fontSize: "0.875rem",
                color: "#0D0599",
              }}
            >
              Anleitung
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Stepper
              orientation="vertical"
              nonLinear
              className="max-w-xs"
              activeStep={-1}
              sx={{
                "& .MuiStepLabel-label": {
                  color: "#0D0599",
                },
                "& .MuiStepIcon-root": {
                  color: "#0D0599",
                },
              }}
            >
              {Instructions.map((step, index) => (
                <Step key={step.label} active>
                  <StepLabel>
                    <span
                      className="leading-tight font-bold"
                      style={{ color: "#0D0599" }}
                    >
                      {step.label}
                    </span>
                  </StepLabel>
                  <div className="ml-8 -mt-2">
                    <span
                      className="text-sm leading-none"
                      style={{ color: "#0D0599" }}
                    >
                      {step.description}
                    </span>
                  </div>
                </Step>
              ))}
            </Stepper>
          </Box>
        </div>
      </Box>

      {/* Main Content - Match plugin-cost styling */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "auto",
          height: { xs: "calc(100vh - 40vh - 64px)", md: "100%" },
          minHeight: { xs: "300px", md: "auto" },
        }}
      >
        <Box sx={{ flexGrow: 1, p: { xs: 2, md: 5 } }}>
          {selectedProject ? (
            <>
              {/* Header with title and review button in top right */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 6,
                }}
              >
                <Typography
                  variant="h2"
                  sx={{
                    fontWeight: 400,
                    fontSize: "2.5rem",
                    color: "#333",
                  }}
                >
                  Ökobilanz berechnen
                </Typography>

                {/* Add per year toggle in top right */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <YearToggle
                    showPerYear={showPerYear}
                    onChange={(value) => setShowPerYear(value)}
                  />

                  {/* "Ökobilanz überprüfen" button */}
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => setReviewDialogOpen(true)}
                    disabled={
                      modelledMaterials.length === 0 &&
                      unmodelledMaterials.length === 0
                    }
                    sx={{
                      fontWeight: 500,
                      textTransform: "none",
                      backgroundColor: "#0D0599",
                      "&:hover": {
                        backgroundColor: "#0A0477",
                      },
                    }}
                  >
                    Ökobilanz überprüfen
                  </Button>
                </Box>
              </Box>

              {/* Existing tabs and content */}
              <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
                <Tabs
                  value={activeTab}
                  onChange={handleTabChange}
                  sx={{
                    borderBottom: 1,
                    borderColor: "divider",
                    mb: 2,
                    "& .MuiTabs-indicator": {
                      backgroundColor: "#0D0599",
                    },
                    "& .Mui-selected": {
                      color: "#0D0599",
                    },
                  }}
                >
                  <Tab
                    label="IFC-Materialien"
                    sx={{
                      textTransform: "none",
                      fontWeight: 500,
                    }}
                  />
                  <Tab
                    label="Weitere Materialien"
                    sx={{
                      textTransform: "none",
                      fontWeight: 500,
                    }}
                  />
                </Tabs>

                {activeTab === 0 ? (
                  <div className="modelled-materials-section">
                    {/* Header with action buttons */}
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 2,
                      }}
                    >
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 600,
                          fontSize: "1.125rem",
                        }}
                      >
                        Modellierte Materialien
                      </Typography>
                      <Box>
                        <Button
                          onClick={() => {
                            autoBulkMatch();
                          }}
                          variant="outlined"
                          color="secondary"
                          sx={{
                            mr: 1,
                            textTransform: "none",
                            fontWeight: 400,
                            borderColor: "rgba(0, 0, 0, 0.23)",
                            color: "text.secondary",
                            "&:hover": {
                              borderColor: "rgba(0, 0, 0, 0.5)",
                              backgroundColor: "rgba(0, 0, 0, 0.04)",
                            },
                          }}
                        >
                          Bulk-Zuordnung
                        </Button>
                      </Box>
                    </Box>

                    {kbobLoading ? (
                      <Box
                        sx={{ display: "flex", justifyContent: "center", p: 3 }}
                      >
                        <CircularProgress size={40} />
                      </Box>
                    ) : modelledMaterials.length === 0 ? (
                      <Typography>Keine Materialien verfügbar.</Typography>
                    ) : (
                      <ModelledMaterialList
                        modelledMaterials={modelledMaterials}
                        kbobMaterials={kbobMaterials}
                        matches={matches}
                        setMatches={setMatches}
                        kbobMaterialOptions={kbobMaterialOptions}
                        selectStyles={selectStyles}
                        onDeleteMaterial={handleRemoveMaterial}
                        materialDensities={materialDensities}
                        handleDensityUpdate={handleDensityUpdate}
                        outputFormat={outputFormat}
                      />
                    )}
                  </div>
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

                    {/* Simplified material list */}
                    <Box sx={{ mt: 3 }}>
                      <Typography
                        variant="h6"
                        sx={{
                          mb: 2,
                          fontWeight: 600,
                          fontSize: "1.125rem",
                        }}
                      >
                        Manuell hinzugefügte Materialien
                      </Typography>
                      {unmodelledMaterials.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                          Keine manuellen Materialien hinzugefügt.
                        </Typography>
                      ) : (
                        <Grid container spacing={2}>
                          {unmodelledMaterials.map((material) => {
                            const matchedKbobMaterial = material.kbobId
                              ? kbobMaterials.find(
                                  (m) => m.id === material.kbobId
                                )
                              : null;

                            // Calculate emission value if KBOB material is matched
                            let emissionValue = null;
                            if (
                              matchedKbobMaterial &&
                              typeof material.volume === "number"
                            ) {
                              const volume = material.volume;
                              const density = matchedKbobMaterial.density;
                              const mass = volume * density;

                              switch (outputFormat) {
                                case OutputFormats.GWP:
                                  emissionValue =
                                    mass * matchedKbobMaterial.gwp;
                                  break;
                                case OutputFormats.UBP:
                                  emissionValue =
                                    mass * matchedKbobMaterial.ubp;
                                  break;
                                case OutputFormats.PENR:
                                  emissionValue =
                                    mass * matchedKbobMaterial.penr;
                                  break;
                              }
                            }

                            // Get emission unit based on output format
                            const getEmissionUnit = () => {
                              switch (outputFormat) {
                                case OutputFormats.GWP:
                                  return "kg CO₂-eq";
                                case OutputFormats.UBP:
                                  return "UBP";
                                case OutputFormats.PENR:
                                  return "kWh";
                                default:
                                  return "";
                              }
                            };

                            return (
                              <Grid
                                item
                                xs={12}
                                sm={6}
                                md={4}
                                key={material.id}
                              >
                                <Paper
                                  elevation={0}
                                  sx={{
                                    p: 2,
                                    border: 1,
                                    borderColor: "divider",
                                    borderRadius: 2,
                                    height: "100%",
                                    display: "flex",
                                    flexDirection: "column",
                                    "&:hover": {
                                      boxShadow: (theme) => theme.shadows[2],
                                      borderColor: "transparent",
                                    },
                                    transition: "all 0.3s ease",
                                  }}
                                >
                                  {/* Header with Material Name and Actions */}
                                  <Box
                                    sx={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      mb: 2,
                                    }}
                                  >
                                    <Typography
                                      variant="h6"
                                      sx={{
                                        fontWeight: 600,
                                        color: "text.primary",
                                        fontSize: { xs: "1rem", sm: "1.1rem" },
                                      }}
                                    >
                                      {material.name}
                                    </Typography>
                                    <Box>
                                      <Tooltip title="Bearbeiten">
                                        <IconButton
                                          size="small"
                                          onClick={() =>
                                            setEditingMaterial(material)
                                          }
                                        >
                                          <EditIcon
                                            sx={{ color: "grey.500" }}
                                          />
                                        </IconButton>
                                      </Tooltip>
                                      <Tooltip title="Löschen">
                                        <IconButton
                                          size="small"
                                          color="default"
                                          onClick={() =>
                                            handleRemoveUnmodelledMaterial(
                                              material.id
                                            )
                                          }
                                        >
                                          <DeleteIcon
                                            sx={{ color: "grey.500" }}
                                          />
                                        </IconButton>
                                      </Tooltip>
                                    </Box>
                                  </Box>

                                  {/* Volume Badge */}
                                  <Box
                                    sx={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      bgcolor: "secondary.lighter",
                                      color: "secondary.dark",
                                      px: 1.5,
                                      py: 0.75,
                                      borderRadius: 1.5,
                                      mb: 2,
                                      alignSelf: "flex-start",
                                    }}
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      width="16"
                                      height="16"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      style={{ marginRight: "6px" }}
                                    >
                                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                                    </svg>
                                    <Typography
                                      variant="body2"
                                      sx={{ fontWeight: 600, lineHeight: 1 }}
                                    >
                                      {typeof material.volume === "number"
                                        ? material.volume.toFixed(2)
                                        : material.volume}{" "}
                                      m³
                                    </Typography>
                                  </Box>

                                  {/* EBKP Badge if available */}
                                  {material.ebkp && (
                                    <Box
                                      sx={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        bgcolor: "info.lighter",
                                        color: "info.dark",
                                        px: 1.5,
                                        py: 0.75,
                                        borderRadius: 1.5,
                                        mb: 2,
                                        alignSelf: "flex-start",
                                      }}
                                    >
                                      <Typography
                                        variant="body2"
                                        sx={{ fontWeight: 600, lineHeight: 1 }}
                                      >
                                        EBKP: {material.ebkp}
                                      </Typography>
                                    </Box>
                                  )}

                                  {/* KBOB Material Information */}
                                  <Box sx={{ mb: 2 }}>
                                    <Typography
                                      variant="body2"
                                      sx={{ mb: 1, fontWeight: 500 }}
                                    >
                                      KBOB-Material:
                                    </Typography>
                                    {matchedKbobMaterial ? (
                                      <Typography
                                        variant="body2"
                                        color="text.secondary"
                                      >
                                        {matchedKbobMaterial.nameDE}
                                      </Typography>
                                    ) : (
                                      <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        fontStyle="italic"
                                      >
                                        Kein KBOB-Material zugeordnet
                                      </Typography>
                                    )}
                                  </Box>

                                  {/* Emission Value (if matched) */}
                                  {matchedKbobMaterial &&
                                    emissionValue !== null && (
                                      <Box sx={{ mt: "auto", pt: 1 }}>
                                        <Chip
                                          label={`${emissionValue.toLocaleString(
                                            "de-CH",
                                            {
                                              maximumFractionDigits: 2,
                                            }
                                          )} ${getEmissionUnit()}`}
                                          size="small"
                                          sx={{
                                            bgcolor: "success.lighter",
                                            color: "success.dark",
                                            fontWeight: 500,
                                            "& .MuiChip-label": {
                                              px: 1,
                                            },
                                          }}
                                        />
                                      </Box>
                                    )}
                                </Paper>
                              </Grid>
                            );
                          })}
                        </Grid>
                      )}
                    </Box>

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
            </>
          ) : (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100%",
              }}
            >
              <Typography
                variant="h6"
                color="text.secondary"
                align="center"
                sx={{ fontWeight: 500 }}
              >
                Bitte wählen Sie ein Projekt aus, um die Ökobilanz zu berechnen.
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Replace the Review Dialog with the new component */}
      <ReviewDialog
        open={reviewDialogOpen}
        onClose={() => setReviewDialogOpen(false)}
        onSubmit={handleSubmitReview}
        modelledMaterials={modelledMaterials}
        matches={matches}
        currentImpact={currentImpact}
        projectId={selectedProject?.value}
        showPerYear={showPerYear}
        totalImpact={totalImpact}
        calculatedElements={calculatedElements}
        onSave={async (data) => {
          if (!selectedProject?.value) {
            throw new Error("No project selected");
          }

          // Convert the elements format to match the required interface
          const formattedData = {
            ifcData: {
              elements: data.ifcData.elements,
              totalImpact: data.ifcData.totalImpact,
              // Include materials for backwards compatibility
              materials: calculatedElements.flatMap((element) =>
                element.materials.map((m) => ({
                  name: m.name,
                  volume: m.volume,
                }))
              ),
            },
            materialMappings: matches,
          };

          await saveProjectMaterials(selectedProject.value, formattedData);
        }}
      />

      {/* Add the bulk matching dialog to the component */}
      {bulkMatchingDialog}
    </Box>
  );
}
