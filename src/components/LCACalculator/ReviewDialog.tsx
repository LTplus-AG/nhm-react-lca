import React, { useState } from "react";
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
  modelledMaterials: Array<{ id: string; name?: string }>;
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
  onSave?: (data: {
    ifcData: {
      elements: Element[];
      totalImpact: {
        gwp: number;
        ubp: number;
        penr: number;
      };
    };
    materialMappings: Record<string, string>;
  }) => Promise<void>;
  calculatedElements?: Element[];
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
  onSave,
  calculatedElements = [],
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleSubmit = async () => {
    try {
      if (onSave && projectId) {
        // Keep the calculated elements as they are since the server will
        // fetch the actual QTO elements from the database and calculate emissions
        const data = {
          ifcData: {
            // Include materials for reference
            materials: modelledMaterials
              .map((material) => {
                // Find if this material has a KBOB mapping
                const matchId = matches[material.id];
                // Calculate volume and impact based on elements that use this material
                let volume = 0;
                let impact = {
                  gwp: 0,
                  ubp: 0,
                  penr: 0,
                };

                // Find all elements that use this material
                calculatedElements.forEach((element) => {
                  if (element.materials && element.impact) {
                    element.materials.forEach((mat) => {
                      // Normalize the material name to remove numbering
                      const materialName = mat.name.replace(
                        /\s*\(\d+\)\s*$/,
                        ""
                      );
                      if (materialName === material.name) {
                        // Add volume
                        volume += mat.volume;

                        // Calculate impact proportion for this material within the element
                        const totalElementMaterialVolume =
                          element.materials.reduce(
                            (sum, m) => sum + m.volume,
                            0
                          );
                        const materialProportion =
                          mat.volume / totalElementMaterialVolume;

                        // Add proportional impact
                        const elemImpact = element.impact!;
                        impact.gwp += elemImpact.gwp * materialProportion;
                        impact.ubp += elemImpact.ubp * materialProportion;
                        impact.penr += elemImpact.penr * materialProportion;
                      }
                    });
                  }
                });

                return {
                  id: material.id,
                  name: material.name,
                  matchedMaterialId: matchId,
                  volume,
                  impact,
                };
              })
              .filter((m) => m.volume > 0),
            // Include calculated elements for the server to reference
            elements: calculatedElements,
            totalImpact: {
              gwp: totalImpact.gwp,
              ubp: totalImpact.ubp,
              penr: totalImpact.penr,
            },
          },
          materialMappings: matches,
        };

        await onSave(data);
      }

      onSubmit();
      onClose();
    } catch (error) {
      console.error("Error saving data:", error);
      setError(
        "Fehler beim Speichern der Daten. Bitte versuchen Sie es später erneut."
      );
    }
  };

  const formatNumber = (num: number) => {
    const displayValue = showPerYear ? num / 45 : num;
    return new Intl.NumberFormat("de-CH", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
      useGrouping: true,
    }).format(displayValue);
  };

  const getGroupedElements = (): GroupedElement[] => {
    const groupedMap = new Map<string, GroupedElement>();

    calculatedElements.forEach((element) => {
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

        if (element.impact) {
          const totalElementMaterialVolume = element.materials.reduce(
            (sum, m) => sum + m.volume,
            0
          );
          const materialProportion =
            material.volume / totalElementMaterialVolume;

          grouped.impact!.gwp += element.impact.gwp * materialProportion;
          grouped.impact!.ubp += element.impact.ubp * materialProportion;
          grouped.impact!.penr += element.impact.penr * materialProportion;
        }
      });
    });

    return Array.from(groupedMap.values());
  };

  const getSortedGroupedElements = () => {
    return [...getGroupedElements()].sort((a, b) => {
      if (!a.impact || !b.impact) return 0;

      if (activeTab === 0) return b.impact.gwp - a.impact.gwp;
      if (activeTab === 1) return b.impact.ubp - a.impact.ubp;
      return b.impact.penr - a.impact.penr;
    });
  };

  const getElementStats = () => {
    const stats: Record<string, { count: number; volume: number }> = {};

    calculatedElements.forEach((element) => {
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

          <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
            <Tabs value={activeTab} onChange={handleTabChange}>
              <Tab label="Treibhauspotential (GWP)" />
              <Tab label="Umweltbelastungspunkte (UBP)" />
              <Tab label="Nicht-erneuerbare Energie (PENR)" />
            </Tabs>
          </Box>

          {calculatedElements.length === 0 ? (
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ py: 4, textAlign: "center" }}
            >
              Keine Elemente verfügbar. Bitte wählen Sie ein Projekt mit
              IFC-Daten.
            </Typography>
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
              calculatedElements.reduce(
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
