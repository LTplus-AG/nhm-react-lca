import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  CircularProgress,
  Chip,
  Alert,
} from "@mui/material";

interface Element {
  id: string;
  element_type: string;
  quantity: number;
  properties: {
    level?: string;
    is_structural?: boolean;
    is_external?: boolean;
    ebkph?: string;
    classification?: {
      id: string;
      name: string;
      system: string;
    };
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

interface GroupedElement {
  element_type: string;
  material: {
    name: string;
    volume: number;
    unit: string;
  };
  count: number;
  total_volume: number;
  impact?: {
    gwp: number;
    ubp: number;
    penr: number;
  };
}

interface ReviewDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  modelledMaterials: Array<{ id: string }>;
  matches: Record<string, string>;
  currentImpact: {
    currentImpact: string;
    unit: string;
  };
  projectId?: string;
  showPerYear?: boolean;
  totalImpact: {
    gwp: number;
    ubp: number;
    penr: number;
    modelledMaterials: number;
    unmodelledMaterials: number;
    totalElementCount: number;
  };
}

const ReviewDialog: React.FC<ReviewDialogProps> = ({
  open,
  onClose,
  onSubmit,
  modelledMaterials,
  matches,
  currentImpact,
  projectId,
  showPerYear = false,
  totalImpact,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [elements, setElements] = useState<Element[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch elements data when dialog opens
  useEffect(() => {
    if (open && projectId) {
      fetchElements(projectId);
    }
  }, [open, projectId]);

  const fetchElements = async (projectId: string) => {
    setLoading(true);
    setError(null);
    try {
      // In a real implementation, this would be an actual API call
      console.log(`Fetching elements for project: ${projectId}`);

      // Call the API to get all elements for this project from QTO
      let elementsData: Element[] = [];

      try {
        // Try to fetch from real API
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
        const response = await fetch(
          `${apiUrl}/api/elements?projectId=${projectId}`
        );

        if (response.ok) {
          const data = await response.json();
          elementsData = data.elements;
          console.log(`Fetched ${elementsData.length} elements from API`);
        } else {
          console.warn("API returned error, using mock data");
          throw new Error("API error");
        }
      } catch (err) {
        console.warn("Failed to fetch from API, using mock data instead", err);
        // Fall back to mock data
        elementsData = generateMockElements(100); // Generate more elements
      }

      setElements(elementsData);
    } catch (error) {
      console.error("Error fetching elements:", error);
      setError(
        "Fehler beim Laden der Elemente. Bitte versuchen Sie es später erneut."
      );
    } finally {
      setLoading(false);
    }
  };

  const generateMockElements = (count: number = 100): Element[] => {
    // Generate different types of elements with realistic properties
    const elementTypes = [
      "IfcWall",
      "IfcSlab",
      "IfcColumn",
      "IfcBeam",
      "IfcWindow",
      "IfcDoor",
      "IfcRoof",
      "IfcStair",
      "IfcRailing",
    ];
    const levels = [
      "00.EG",
      "01.OG",
      "02.OG",
      "03.OG",
      "-01.UG",
      "-02.UG",
      "04.OG",
      "05.OG",
    ];
    const materials = [
      { name: "_Gipsfaserplatte_wg", volume: 0.17208, unit: "m³" },
      { name: "_Staenderkonstruktion_gedaemmt_wg", volume: 0.5736, unit: "m³" },
      { name: "_Cocoon_Metall_gedaemmt_wg", volume: 1.11278, unit: "m³" },
      { name: "Beton C25/30", volume: 2.5, unit: "m³" },
      { name: "Stahlbeton", volume: 1.8, unit: "m³" },
      { name: "Holz", volume: 0.75, unit: "m³" },
      { name: "Glas", volume: 0.12, unit: "m³" },
      { name: "Aluminium", volume: 0.05, unit: "m³" },
      { name: "Ziegel", volume: 1.2, unit: "m³" },
      { name: "Stahl", volume: 0.4, unit: "m³" },
      { name: "Steinwolle", volume: 0.3, unit: "m³" },
    ];

    const totalArea = 12500; // Assume 12,500 m² total building area
    const averageElementArea = totalArea / count;

    return Array.from({ length: count }, (_, i) => {
      const elementType =
        elementTypes[Math.floor(Math.random() * elementTypes.length)];
      const level = levels[Math.floor(Math.random() * levels.length)];
      const is_structural =
        elementType !== "IfcWindow" && elementType !== "IfcDoor";
      const is_external = Math.random() > 0.5;

      // Calculate a more realistic area based on element type
      let baseArea = averageElementArea * (0.5 + Math.random());
      if (elementType === "IfcWindow" || elementType === "IfcDoor") {
        baseArea = 2 + Math.random() * 3; // Windows/doors: 2-5 m²
      } else if (elementType === "IfcWall") {
        baseArea = 10 + Math.random() * 20; // Walls: 10-30 m²
      } else if (elementType === "IfcSlab") {
        baseArea = 20 + Math.random() * 40; // Slabs: 20-60 m²
      }

      const quantity = parseFloat(baseArea.toFixed(2));

      // Assign 1-3 materials to each element
      const elementMaterials = [];
      const materialCount = Math.floor(Math.random() * 3) + 1;
      for (let j = 0; j < materialCount; j++) {
        const material =
          materials[Math.floor(Math.random() * materials.length)];
        // Scale material volume based on element quantity
        const scaledVolume =
          material.volume * (quantity / 10) * (Math.random() * 0.5 + 0.75);
        elementMaterials.push({
          name: material.name,
          volume: parseFloat(scaledVolume.toFixed(4)),
          unit: material.unit,
        });
      }

      // Customize EBKP and classification based on element type
      let ebkp = "";
      let classificationName = "";

      switch (elementType) {
        case "IfcWall":
          ebkp = `C2.${Math.floor(Math.random() * 9) + 1}`;
          classificationName = "Tragende Wand";
          break;
        case "IfcSlab":
          ebkp = `C2.${Math.floor(Math.random() * 9) + 1}`;
          classificationName = "Geschossdecke";
          break;
        case "IfcColumn":
          ebkp = `C2.${Math.floor(Math.random() * 9) + 1}`;
          classificationName = "Stütze";
          break;
        case "IfcBeam":
          ebkp = `C2.${Math.floor(Math.random() * 9) + 1}`;
          classificationName = "Träger";
          break;
        case "IfcWindow":
          ebkp = `E2.${Math.floor(Math.random() * 9) + 1}`;
          classificationName = "Fenster";
          break;
        case "IfcDoor":
          ebkp = `E2.${Math.floor(Math.random() * 9) + 1}`;
          classificationName = "Tür";
          break;
        case "IfcRoof":
          ebkp = `C3.${Math.floor(Math.random() * 9) + 1}`;
          classificationName = "Dach";
          break;
        case "IfcStair":
          ebkp = `C2.${Math.floor(Math.random() * 9) + 1}`;
          classificationName = "Treppe";
          break;
        default:
          ebkp = `C9.${Math.floor(Math.random() * 9) + 1}`;
          classificationName = elementType.replace("Ifc", "");
      }

      return {
        id: `element_${i + 1}`,
        element_type: elementType,
        quantity: quantity,
        properties: {
          level,
          is_structural,
          is_external,
          ebkph: ebkp,
          classification: {
            id: ebkp,
            name: classificationName,
            system: "EBKP",
          },
        },
        materials: elementMaterials,
      };
    });
  };

  const calculateElementsImpact = (elements: Element[]): Element[] => {
    // In a real implementation, this would use actual impact factors from KBOB
    // Here we'll use simplified factors
    const impactFactors = {
      _Gipsfaserplatte_wg: { gwp: 120, ubp: 950, penr: 280 },
      _Staenderkonstruktion_gedaemmt_wg: { gwp: 85, ubp: 720, penr: 190 },
      _Cocoon_Metall_gedaemmt_wg: { gwp: 230, ubp: 1850, penr: 520 },
      "Beton C25/30": { gwp: 330, ubp: 2100, penr: 450 },
      Stahlbeton: { gwp: 420, ubp: 2800, penr: 650 },
      Holz: { gwp: 25, ubp: 380, penr: 120 },
      Glas: { gwp: 800, ubp: 5200, penr: 1200 },
      Aluminium: { gwp: 6500, ubp: 42000, penr: 8500 },
      Ziegel: { gwp: 200, ubp: 1500, penr: 350 },
      Stahl: { gwp: 1800, ubp: 12000, penr: 2200 },
      Steinwolle: { gwp: 150, ubp: 1200, penr: 280 },
    };

    return elements.map((element) => {
      let gwp = 0;
      let ubp = 0;
      let penr = 0;

      // Calculate impact for each material in the element
      element.materials.forEach((material) => {
        const normalizedName = material.name.replace(/\s*\(\d+\)\s*$/, ""); // Remove numbering like " (1)"
        const factor = impactFactors[
          normalizedName as keyof typeof impactFactors
        ] || { gwp: 100, ubp: 800, penr: 200 };

        // Assume density of 2500 kg/m³ for simplicity
        // In a real implementation, this would use the actual density from KBOB
        const density = 2500; // kg/m³
        const mass = material.volume * density; // kg

        gwp += (mass * factor.gwp) / 1000; // Convert to kg CO2-eq
        ubp += mass * factor.ubp;
        penr += (mass * factor.penr) / 1000; // Convert to kWh
      });

      return {
        ...element,
        impact: {
          gwp: parseFloat(gwp.toFixed(2)),
          ubp: parseFloat(ubp.toFixed(2)),
          penr: parseFloat(penr.toFixed(2)),
        },
      };
    });
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleSubmit = () => {
    onSubmit();
    onClose();
  };

  // Format large numbers with thousand separators
  const formatNumber = (num: number) => {
    const displayValue = showPerYear ? num / 45 : num;
    return new Intl.NumberFormat("de-CH", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
      useGrouping: true,
    }).format(displayValue);
  };

  // Function to group elements by type and material
  const getGroupedElements = (): GroupedElement[] => {
    const groupedMap = new Map<string, GroupedElement>();

    elements.forEach((element) => {
      element.materials.forEach((material) => {
        const key = `${element.element_type}-${material.name.replace(
          /\s*\(\d+\)\s*$/,
          ""
        )}`;

        if (!groupedMap.has(key)) {
          groupedMap.set(key, {
            element_type: element.element_type,
            material: {
              name: material.name.replace(/\s*\(\d+\)\s*$/, ""),
              volume: material.volume,
              unit: material.unit,
            },
            count: 0,
            total_volume: 0,
            impact: {
              gwp: 0,
              ubp: 0,
              penr: 0,
            },
          });
        }

        const grouped = groupedMap.get(key)!;
        grouped.count += 1;
        grouped.total_volume += material.volume;

        // Calculate impact for this material
        const impactFactors = {
          _Gipsfaserplatte_wg: { gwp: 120, ubp: 950, penr: 280 },
          _Staenderkonstruktion_gedaemmt_wg: { gwp: 85, ubp: 720, penr: 190 },
          _Cocoon_Metall_gedaemmt_wg: { gwp: 230, ubp: 1850, penr: 520 },
          "Beton C25/30": { gwp: 330, ubp: 2100, penr: 450 },
          Stahlbeton: { gwp: 420, ubp: 2800, penr: 650 },
          Holz: { gwp: 25, ubp: 380, penr: 120 },
          Glas: { gwp: 800, ubp: 5200, penr: 1200 },
          Aluminium: { gwp: 6500, ubp: 42000, penr: 8500 },
          Ziegel: { gwp: 200, ubp: 1500, penr: 350 },
          Stahl: { gwp: 1800, ubp: 12000, penr: 2200 },
          Steinwolle: { gwp: 150, ubp: 1200, penr: 280 },
        };

        const factor = impactFactors[
          grouped.material.name as keyof typeof impactFactors
        ] || { gwp: 100, ubp: 800, penr: 200 };

        const density = 2500; // kg/m³
        const mass = material.volume * density; // kg

        grouped.impact!.gwp += (mass * factor.gwp) / 1000;
        grouped.impact!.ubp += mass * factor.ubp;
        grouped.impact!.penr += (mass * factor.penr) / 1000;
      });
    });

    return Array.from(groupedMap.values());
  };

  // Sort grouped elements by impact for the current tab
  const getSortedGroupedElements = () => {
    return [...getGroupedElements()].sort((a, b) => {
      if (!a.impact || !b.impact) return 0;

      if (activeTab === 0) return b.impact.gwp - a.impact.gwp;
      if (activeTab === 1) return b.impact.ubp - a.impact.ubp;
      return b.impact.penr - a.impact.penr;
    });
  };

  // Function to calculate building element stats by type
  const getElementStats = () => {
    const stats: Record<string, { count: number; volume: number }> = {};

    elements.forEach((element) => {
      const type = element.element_type.replace("Ifc", "");
      if (!stats[type]) {
        stats[type] = { count: 0, volume: 0 };
      }
      stats[type].count += 1;
      stats[type].volume += element.materials.reduce(
        (sum, m) => sum + m.volume,
        0
      );
    });

    return stats;
  };

  // Get a summary of key element types
  const elementStats = getElementStats();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          <Typography variant="h6">Ökobilanz überprüfen</Typography>
          <Chip
            label={`${totalImpact.modelledMaterials} von ${
              totalImpact.modelledMaterials + totalImpact.unmodelledMaterials
            } Materialien zugeordnet`}
            color="primary"
            size="small"
            sx={{ fontWeight: 500 }}
          />
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle1" gutterBottom fontWeight="medium">
            Gesamtübersicht
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Impact Summary Cards */}
          <Box sx={{ display: "flex", gap: 2, mb: 4, flexWrap: "wrap" }}>
            <Paper
              elevation={0}
              sx={{
                flex: 1,
                minWidth: "200px",
                p: 2,
                border: "1px solid",
                borderColor: "divider",
                background: "linear-gradient(to right top, #F1D900, #fff176)",
              }}
            >
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
                Treibhauspotential (GWP)
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {formatNumber(totalImpact.gwp)} kg CO₂-eq
                {showPerYear ? "/Jahr" : ""}
              </Typography>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                flex: 1,
                minWidth: "200px",
                p: 2,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
                Umweltbelastungspunkte (UBP)
              </Typography>
              <Typography variant="h5" fontWeight="medium">
                {formatNumber(totalImpact.ubp)} UBP{showPerYear ? "/Jahr" : ""}
              </Typography>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                flex: 1,
                minWidth: "200px",
                p: 2,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
                Nicht-erneuerbare Energie (PENR)
              </Typography>
              <Typography variant="h5" fontWeight="medium">
                {formatNumber(totalImpact.penr)} kWh{showPerYear ? "/Jahr" : ""}
              </Typography>
            </Paper>
          </Box>

          {/* Element type summary */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle2" gutterBottom>
              Bauelemente Übersicht
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {Object.entries(elementStats).map(([type, data]) => (
                <Chip
                  key={type}
                  label={`${type}: ${data.count} (${
                    Math.round(data.volume * 100) / 100
                  } m³)`}
                  size="small"
                  sx={{
                    bgcolor: "grey.100",
                    "& .MuiChip-label": { fontWeight: 500 },
                  }}
                />
              ))}
            </Box>
          </Box>

          {/* Tabs for different impact types */}
          <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
            <Tabs value={activeTab} onChange={handleTabChange}>
              <Tab label="Treibhauspotential (GWP)" />
              <Tab label="Umweltbelastungspunkte (UBP)" />
              <Tab label="Nicht-erneuerbare Energie (PENR)" />
            </Tabs>
          </Box>

          {/* Element impact table */}
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer
              component={Paper}
              variant="outlined"
              sx={{ maxHeight: 400 }}
            >
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Element Typ</TableCell>
                    <TableCell>Material</TableCell>
                    <TableCell align="right">Anzahl</TableCell>
                    <TableCell align="right">Volumen (m³)</TableCell>
                    <TableCell align="right">
                      {activeTab === 0
                        ? `GWP (kg CO₂-eq${showPerYear ? "/Jahr" : ""})`
                        : activeTab === 1
                        ? `UBP${showPerYear ? "/Jahr" : ""}`
                        : `PENR (kWh${showPerYear ? "/Jahr" : ""})`}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getSortedGroupedElements().map((element, index) => (
                    <TableRow key={index} hover>
                      <TableCell>
                        {element.element_type.replace("Ifc", "")}
                      </TableCell>
                      <TableCell>{element.material.name}</TableCell>
                      <TableCell align="right">{element.count}</TableCell>
                      <TableCell align="right">
                        {element.total_volume.toFixed(3)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: "medium" }}>
                        {element.impact
                          ? formatNumber(
                              activeTab === 0
                                ? element.impact.gwp
                                : activeTab === 1
                                ? element.impact.ubp
                                : element.impact.penr
                            )
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
            Die Ökobilanz wird im Nachhaltigkeitsmonitoring Dashboard
            aktualisiert. Die Berechnung basiert auf{" "}
            {totalImpact.modelledMaterials} zugeordneten Materialien und
            berücksichtigt {totalImpact.totalElementCount} Bauelemente mit einem
            Gesamtvolumen von{" "}
            {formatNumber(
              elements.reduce(
                (sum, el) =>
                  sum + el.materials.reduce((mSum, m) => mSum + m.volume, 0),
                0
              )
            )}{" "}
            m³.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Abbrechen</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          Daten senden
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReviewDialog;
