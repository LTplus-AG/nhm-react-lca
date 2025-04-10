import React, { useState } from "react";
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
import { Material, KbobMaterial, OutputFormats } from "../../types/lca.types";
import { BUILDING_LIFETIME_YEARS } from "../../utils/constants";
import { LCACalculator } from "../../utils/lcaCalculator";
import { DisplayMode } from "../../utils/lcaDisplayHelper";

interface ReviewDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  modelledMaterials: Material[];
  matches: Record<string, string>;
  currentImpact: { currentImpact: string; unit: string };
  projectId?: string;
  displayMode: DisplayMode;
  ebfNumeric: number | null;
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
  outputFormat?: OutputFormats;
  calculator?: LCACalculator;
}

const ReviewDialog: React.FC<ReviewDialogProps> = ({
  open,
  onClose,
  onSubmit,
  modelledMaterials,
  matches,
  currentImpact,
  projectId,
  displayMode,
  ebfNumeric,
  totalImpact,
  calculatedElements,
  onSave,
  outputFormat,
  calculator,
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const formatNumber = (
    num: number | null | undefined,
    decimals: number = 0
  ) => {
    if (num === null || num === undefined) return "N/A";
    return new Intl.NumberFormat("de-CH", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping: true,
    }).format(num);
  };

  const getDisplayValue = (value: number): number => {
    if (displayMode === "relative" && ebfNumeric !== null && ebfNumeric > 0) {
      return value / (BUILDING_LIFETIME_YEARS * ebfNumeric);
    }
    return value;
  };

  const getUnitSuffix = (): string => {
    return displayMode === "relative" ? "/m²·Jahr" : "";
  };

  const getDecimalPrecision = (value: number): number => {
    if (displayMode === "relative" || Math.abs(value) < 1) {
      return 2;
    } else if (Math.abs(value) < 100) {
      return 1;
    }
    return 0;
  };

  const formatDisplayValue = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return "N/A";
    const displayValue = getDisplayValue(value);
    const decimals = getDecimalPrecision(displayValue);
    return formatNumber(displayValue, decimals);
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
        // Include EBF value if available
        ebfValue: ebfNumeric !== null ? ebfNumeric.toString() : undefined,
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

  // Summary content to show impact results
  const summaryContent = (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 3,
        backgroundColor: "background.paper",
        borderRadius: 1,
        p: 3,
      }}
    >
      <Typography variant="h6" component="h3" gutterBottom>
        Gesamtbilanz
      </Typography>

      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Box sx={{ width: "30%" }}>
          <Typography
            variant="subtitle2"
            sx={{ color: "text.secondary", mb: 0.5 }}
          >
            CO₂-eq
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: "bold" }}>
            {formatDisplayValue(totalImpact.gwp)} kg{getUnitSuffix()}
          </Typography>
        </Box>

        <Box sx={{ width: "30%" }}>
          <Typography
            variant="subtitle2"
            sx={{ color: "text.secondary", mb: 0.5 }}
          >
            UBP
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: "bold" }}>
            {formatDisplayValue(totalImpact.ubp)} UBP{getUnitSuffix()}
          </Typography>
        </Box>

        <Box sx={{ width: "30%" }}>
          <Typography
            variant="subtitle2"
            sx={{ color: "text.secondary", mb: 0.5 }}
          >
            Primärenergie nicht erneuerbar
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: "bold" }}>
            {formatDisplayValue(totalImpact.penr)} kWh{getUnitSuffix()}
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          bgcolor: "background.default",
          p: 2,
          borderRadius: 1,
          mt: 2,
        }}
      >
        <Typography variant="subtitle2" sx={{ mb: 2 }}>
          Übersicht
        </Typography>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Zugeordnete Materialien:
          </Typography>
          <Typography variant="body2" fontWeight="medium">
            {totalImpact.modelledMaterials}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Elemente:
          </Typography>
          <Typography variant="body2" fontWeight="medium">
            {totalImpact.totalElementCount}
          </Typography>
        </Box>
        {ebfNumeric !== null && (
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              EBF:
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {formatNumber(ebfNumeric, 0)} m²
            </Typography>
          </Box>
        )}
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="body2" color="text.secondary">
            Anzeigemodus:
          </Typography>
          <Typography variant="body2" fontWeight="medium">
            {displayMode === "relative"
              ? `pro m²·Jahr (gem. SIA 2032)`
              : "Absolut"}
          </Typography>
        </Box>
      </Box>
    </Box>
  );

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
        {tabValue === 0 && summaryContent}

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
                        ? formatDisplayValue(element.impact.gwp)
                        : "-"}
                    </TableCell>
                    <TableCell align="right">
                      {element.impact
                        ? formatDisplayValue(element.impact.ubp)
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
