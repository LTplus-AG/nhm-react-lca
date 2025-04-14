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
  Grid,
} from "@mui/material";
import { Material, OutputFormats, KbobMaterial } from "../../types/lca.types";
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
  calculator: LCACalculator;
  materialDensities: Record<string, number>;
  outputFormat: OutputFormats;
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
  kbobMaterials: KbobMaterial[];
}

const ReviewDialog: React.FC<ReviewDialogProps> = ({
  open,
  onClose,
  modelledMaterials,
  matches,
  projectId,
  displayMode,
  ebfNumeric,
  calculator,
  materialDensities,
  calculatedElements,
  onSave,
  kbobMaterials,
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
        },
        // Include EBF value if available
        ebfValue: ebfNumeric !== null ? ebfNumeric.toString() : undefined,
      };

      // Save the data
      await onSave(dataToSave);

      // Execute the submit action after saving
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

  // Calculate required values inside the component
  const totalElementCount = modelledMaterials.filter(
    (m) => matches[m.id]
  ).length;

  // Use calculateGrandTotal for each indicator
  // Note: calculateGrandTotal returns a formatted string. We might need raw numbers later.
  const gwpFormatted = calculator.calculateGrandTotal(
    modelledMaterials,
    matches,
    kbobMaterials,
    OutputFormats.GWP,
    materialDensities,
    undefined,
    displayMode,
    ebfNumeric
  );
  const ubpFormatted = calculator.calculateGrandTotal(
    modelledMaterials,
    matches,
    kbobMaterials,
    OutputFormats.UBP,
    materialDensities,
    undefined,
    displayMode,
    ebfNumeric
  );
  const penrFormatted = calculator.calculateGrandTotal(
    modelledMaterials,
    matches,
    kbobMaterials,
    OutputFormats.PENR,
    materialDensities,
    undefined,
    displayMode,
    ebfNumeric
  );

  // Summary content to show impact results
  const summaryContent = (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: (theme) => theme.spacing(3),
        p: (theme) => theme.spacing(3),
        bgcolor: "background.paper",
      }}
    >
      <Typography variant="h6" component="h3">
        Gesamtbilanz
      </Typography>

      <Grid
        container
        spacing={2}
        sx={{ borderBottom: 1, borderColor: "divider", pb: 3, mb: 2 }}
      >
        <Grid item xs={12} sm={4}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            CO₂-eq
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: "bold" }}>
            {gwpFormatted}
          </Typography>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            UBP
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: "bold" }}>
            {ubpFormatted}
          </Typography>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Primärenergie nicht erneuerbar
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: "bold" }}>
            {penrFormatted}
          </Typography>
        </Grid>
      </Grid>

      <Paper
        elevation={0}
        sx={{
          bgcolor: (theme) => theme.palette.grey[50],
          p: 2,
          borderRadius: 1,
        }}
      >
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: "medium" }}>
          Übersicht
        </Typography>
        <Grid container spacing={1} rowSpacing={1.5}>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Zugeordnete Materialien:
            </Typography>
          </Grid>
          <Grid item xs={6} sx={{ textAlign: "right" }}>
            <Typography variant="body2" fontWeight="medium">
              {totalElementCount}
            </Typography>
          </Grid>

          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Elemente:
            </Typography>
          </Grid>
          <Grid item xs={6} sx={{ textAlign: "right" }}>
            <Typography variant="body2" fontWeight="medium">
              {totalElementCount}
            </Typography>
          </Grid>

          {ebfNumeric !== null && (
            <>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  EBF:
                </Typography>
              </Grid>
              <Grid item xs={6} sx={{ textAlign: "right" }}>
                <Typography variant="body2" fontWeight="medium">
                  {formatNumber(ebfNumeric, 0)} m²
                </Typography>
              </Grid>
            </>
          )}

          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Anzeigemodus:
            </Typography>
          </Grid>
          <Grid item xs={6} sx={{ textAlign: "right" }}>
            <Typography variant="body2" fontWeight="medium">
              {displayMode === "relative"
                ? `pro m²·Jahr (gem. SIA 2032)`
                : "Absolut"}
            </Typography>
          </Grid>
        </Grid>
      </Paper>
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
            label={`${formatNumber(totalElementCount, 0)} Elemente`}
            color={
              totalElementCount >= 80
                ? "success"
                : totalElementCount >= 50
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
