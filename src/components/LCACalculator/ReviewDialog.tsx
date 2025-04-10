import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
} from "@mui/material";
import { Material, KbobMaterial } from "../../types/lca.types";

interface ReviewDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  modelledMaterials: Material[];
  matches: Record<string, string>;
  currentImpact: { currentImpact: string; unit: string };
  projectId?: string;
  showPerYear: boolean;
  totalImpact: {
    gwp: number;
    ubp: number;
    penr: number;
    modelledMaterials: number;
    unmodelledMaterials: number;
    totalElementCount: number;
  };
  calculatedElements: {
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
  }[];
  onSave: (data: any) => Promise<void>;
}

const ReviewDialog: React.FC<ReviewDialogProps> = ({
  open,
  onClose,
  onSubmit,
  modelledMaterials,
  matches,
  currentImpact,
  projectId,
  showPerYear,
  totalImpact,
  calculatedElements,
  onSave,
}) => {
  const [tabValue, setTabValue] = React.useState(0);
  const [saving, setSaving] = React.useState(false);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const formatNumber = (num: number, decimals: number = 0) => {
    return new Intl.NumberFormat("de-CH", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping: true,
    }).format(num);
  };

  const formatImpactValue = (value: number, unit: string) => {
    const displayValue = showPerYear ? value / 45 : value;
    const formattedValue = showPerYear
      ? formatNumber(displayValue, 2)
      : formatNumber(displayValue);
    return `${formattedValue} ${unit}${showPerYear ? "/Jahr" : ""}`;
  };

  const handleSaveAndSubmit = async () => {
    if (!projectId) {
      alert("Kein Projekt ausgewählt.");
      return;
    }

    try {
      setSaving(true);

      // Create a simplified data structure for saving
      const dataToSave = {
        ifcData: {
          elements: calculatedElements,
          totalImpact: {
            gwp: totalImpact.gwp,
            ubp: totalImpact.ubp,
            penr: totalImpact.penr,
          },
        },
      };

      // Save the data
      await onSave(dataToSave);

      // Execute the submit action after saving
      onSubmit();
      onClose();
    } catch (error) {
      console.error("Error saving and submitting LCA data:", error);
      alert(
        "Fehler beim Speichern und Senden der Ökobilanz: " +
          (error instanceof Error ? error.message : String(error))
      );
    } finally {
      setSaving(false);
    }
  };

  // Count how many materials are matched
  const matchedCount = modelledMaterials.filter((m) => matches[m.id]).length;
  const totalCount = modelledMaterials.length;
  const matchPercentage =
    totalCount > 0 ? (matchedCount / totalCount) * 100 : 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6">Ökobilanz überprüfen</Typography>
          <Chip
            label={`${formatNumber(matchPercentage, 0)}% zugeordnet`}
            color={
              matchPercentage >= 80
                ? "success"
                : matchPercentage >= 50
                ? "warning"
                : "error"
            }
            size="small"
          />
        </Box>
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
        >
          <Tab label="Übersicht" />
          <Tab label="Bauteile" />
          <Tab label="Materialien" />
        </Tabs>

        {/* Summary tab */}
        {tabValue === 0 && (
          <Box>
            <Paper
              elevation={0}
              sx={{ p: 3, mb: 3, border: "1px solid", borderColor: "divider" }}
            >
              <Typography variant="h6" gutterBottom>
                Gesamtbilanz
              </Typography>

              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: "flex", mb: 1 }}>
                  <Typography variant="body1" sx={{ flex: 1 }}>
                    Treibhauspotential (GWP):
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {formatImpactValue(totalImpact.gwp, "kg CO₂-eq")}
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", mb: 1 }}>
                  <Typography variant="body1" sx={{ flex: 1 }}>
                    Umweltbelastungspunkte (UBP):
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {formatImpactValue(totalImpact.ubp, "UBP")}
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", mb: 1 }}>
                  <Typography variant="body1" sx={{ flex: 1 }}>
                    Primärenergie nicht erneuerbar (PENR):
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {formatImpactValue(totalImpact.penr, "kWh")}
                  </Typography>
                </Box>
              </Box>
            </Paper>

            <Paper
              elevation={0}
              sx={{ p: 3, border: "1px solid", borderColor: "divider" }}
            >
              <Typography variant="h6" gutterBottom>
                Zusammenfassung
              </Typography>

              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: "flex", mb: 1 }}>
                  <Typography variant="body1" sx={{ flex: 1 }}>
                    Gesamtanzahl Bauteile:
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {calculatedElements.length}
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", mb: 1 }}>
                  <Typography variant="body1" sx={{ flex: 1 }}>
                    Zugeordnete Materialien:
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {matchedCount} von {totalCount} (
                    {formatNumber(matchPercentage, 0)}%)
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Box>
        )}

        {/* Elements tab */}
        {tabValue === 1 && (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Element Typ</TableCell>
                  <TableCell>Materials</TableCell>
                  <TableCell align="right">Volume</TableCell>
                  <TableCell align="right">GWP (kg CO₂-eq)</TableCell>
                  <TableCell align="right">UBP</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {calculatedElements.slice(0, 100).map((element) => (
                  <TableRow key={element.id}>
                    <TableCell>{element.element_type}</TableCell>
                    <TableCell>
                      {element.materials.map((m) => m.name).join(", ")}
                    </TableCell>
                    <TableCell align="right">
                      {formatNumber(element.quantity, 2)} m³
                    </TableCell>
                    <TableCell align="right">
                      {element.impact
                        ? formatNumber(
                            showPerYear
                              ? element.impact.gwp / 45
                              : element.impact.gwp,
                            showPerYear ? 2 : 0
                          )
                        : "-"}
                    </TableCell>
                    <TableCell align="right">
                      {element.impact
                        ? formatNumber(
                            showPerYear
                              ? element.impact.ubp / 45
                              : element.impact.ubp,
                            showPerYear ? 2 : 0
                          )
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
                {calculatedElements.length > 100 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" color="text.secondary">
                        {calculatedElements.length - 100} weitere Elemente
                        (insgesamt {calculatedElements.length})
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Materials tab */}
        {tabValue === 2 && (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Material</TableCell>
                  <TableCell>Zuordnung</TableCell>
                  <TableCell align="right">Volume</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {modelledMaterials.map((material) => (
                  <TableRow key={material.id}>
                    <TableCell>{material.name}</TableCell>
                    <TableCell>
                      {matches[material.id] ? (
                        <Chip
                          size="small"
                          label="Zugeordnet"
                          color="success"
                          variant="outlined"
                        />
                      ) : (
                        <Chip
                          size="small"
                          label="Nicht zugeordnet"
                          color="error"
                          variant="outlined"
                        />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {typeof material.volume === "number"
                        ? formatNumber(material.volume, 2)
                        : material.volume}{" "}
                      m³
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} color="inherit" variant="outlined">
          Abbrechen
        </Button>
        <Button
          onClick={handleSaveAndSubmit}
          color="primary"
          variant="contained"
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} /> : undefined}
        >
          {saving ? "Wird gespeichert..." : "Ans Dashboard senden"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReviewDialog;
