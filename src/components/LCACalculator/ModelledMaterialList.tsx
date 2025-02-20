import React, { useState } from "react";
import {
  Grid,
  Paper,
  Box,
  Typography,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import Select from "react-select";
import { Material, KbobMaterial, OutputFormats } from "../../types/lca.types";
import EditIcon from "@mui/icons-material/Edit";

interface ModelledMaterialListProps {
  modelledMaterials: Material[];
  kbobMaterials: KbobMaterial[];
  matches: Record<string, string>;
  handleMaterialSelect: (selectedOption: any, materialId: string) => void;
  kbobMaterialOptions: any;
  selectStyles: any;
  sortMaterials: (materials: Material[]) => Material[];
  outputFormat: OutputFormats;
  handleDensityUpdate: (materialId: string, newDensity: number) => void;
  materialDensities: Record<string, number>;
}

interface DensityDialogProps {
  open: boolean;
  onClose: () => void;
  materialId: string;
  materialName: string;
  currentDensity: number;
  densityRange: { min: number; max: number };
  onSave: (density: number) => void;
}

const DensityDialog: React.FC<DensityDialogProps> = ({
  open,
  onClose,
  materialId,
  materialName,
  currentDensity,
  densityRange,
  onSave,
}) => {
  const [density, setDensity] = useState(currentDensity);
  const [error, setError] = useState("");

  const handleDensityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setDensity(value);
    if (value < densityRange.min || value > densityRange.max) {
      setError(
        `Dichte muss zwischen ${densityRange.min} und ${densityRange.max} kg/m³ liegen`
      );
    } else {
      setError("");
    }
  };

  const handleSave = () => {
    if (!error) {
      onSave(density);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          <Typography variant="h6">Dichte bearbeiten</Typography>
          <Typography variant="subtitle2" color="text.secondary">
            {materialName}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Gültige Dichte: {densityRange.min} - {densityRange.max} kg/m³
          </Typography>
          <TextField
            fullWidth
            type="number"
            label="Dichte (kg/m³)"
            value={density}
            onChange={handleDensityChange}
            error={!!error}
            helperText={error}
            sx={{ mt: 1 }}
            InputProps={{
              inputProps: {
                min: densityRange.min,
                max: densityRange.max,
                step: "0.1",
              },
            }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Abbrechen
        </Button>
        <Button onClick={handleSave} color="primary" disabled={!!error}>
          Speichern
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const ModelledMaterialList: React.FC<ModelledMaterialListProps> = ({
  modelledMaterials,
  kbobMaterials,
  matches,
  handleMaterialSelect,
  kbobMaterialOptions,
  selectStyles,
  sortMaterials,
  outputFormat,
  handleDensityUpdate,
  materialDensities,
}) => {
  const [editingDensity, setEditingDensity] = useState<string | null>(null);

  const getEmissionValue = (
    material: Material,
    kbobMaterial: KbobMaterial | undefined
  ) => {
    if (!kbobMaterial) return null;
    const density = materialDensities[material.id] || kbobMaterial.density;
    const volume = typeof material.volume === "number" ? material.volume : 0;
    const mass = volume * density;

    switch (outputFormat) {
      case OutputFormats.GWP:
        return mass * kbobMaterial.gwp;
      case OutputFormats.UBP:
        return mass * kbobMaterial.ubp;
      case OutputFormats.PENR:
        return mass * kbobMaterial.penr;
      default:
        return null;
    }
  };

  const getEmissionUnit = () => {
    switch (outputFormat) {
      case OutputFormats.GWP:
        return "kg CO₂-eq";
      case OutputFormats.UBP:
        return "UBP";
      case OutputFormats.PENR:
        return "MJ";
      default:
        return "";
    }
  };

  return (
    <Grid container spacing={2}>
      {sortMaterials(modelledMaterials).map((material, index) => {
        const kbobMaterial = kbobMaterials.find(
          (k) => k.id === matches[material.id]
        );
        const hasDensityRange = kbobMaterial?.densityRange;
        const currentDensity =
          materialDensities[material.id] || kbobMaterial?.density || 0;
        const emissionValue = getEmissionValue(material, kbobMaterial);

        return (
          <Grid item xs={12} lg={6} key={material.id || index}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                border: 1,
                borderColor: matches[material.id] ? "info.light" : "divider",
                borderRadius: 2,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                bgcolor: matches[material.id]
                  ? "info.lighter"
                  : "background.paper",
                "&:hover": {
                  boxShadow: (theme) => theme.shadows[4],
                  borderColor: "transparent",
                },
                transition: "all 0.3s ease",
              }}
            >
              {/* Material Name */}
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: "text.primary",
                  lineHeight: 1.3,
                  mb: 2,
                }}
              >
                {material.name}
              </Typography>

              {/* Info Badges */}
              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 3 }}>
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
                    width: "fit-content",
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
                      ? material.volume
                          .toLocaleString(undefined, {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          })
                          .replace(/\.?0+$/, "")
                      : "0.0"}{" "}
                    m³
                  </Typography>
                </Box>

                {/* Density Badge */}
                {kbobMaterial && (
                  <Box
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      bgcolor: "info.lighter",
                      color: "info.dark",
                      px: 1.5,
                      py: 0.75,
                      borderRadius: 1.5,
                      width: "fit-content",
                      position: "relative",
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        lineHeight: 1,
                        mr: hasDensityRange ? 1 : 0,
                      }}
                    >
                      {Math.round(currentDensity).toLocaleString()} kg/m³
                      {hasDensityRange && (
                        <Typography
                          component="span"
                          variant="caption"
                          sx={{
                            display: "block",
                            color: "text.secondary",
                            mt: 0.5,
                            fontWeight: "normal",
                          }}
                        >
                          Range:{" "}
                          {Math.round(
                            kbobMaterial.densityRange?.min || 0
                          ).toLocaleString()}
                          -
                          {Math.round(
                            kbobMaterial.densityRange?.max || 0
                          ).toLocaleString()}{" "}
                          kg/m³
                        </Typography>
                      )}
                    </Typography>
                    {hasDensityRange && (
                      <IconButton
                        size="small"
                        onClick={() => setEditingDensity(material.id)}
                        sx={{
                          ml: -0.5,
                          p: 0.25,
                          color: "inherit",
                          "&:hover": { bgcolor: "info.main", color: "white" },
                        }}
                      >
                        <EditIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    )}
                  </Box>
                )}

                {/* Emission Badge */}
                {emissionValue !== null && (
                  <Box
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      bgcolor: "success.lighter",
                      color: "success.dark",
                      px: 1.5,
                      py: 0.75,
                      borderRadius: 1.5,
                      width: "fit-content",
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, lineHeight: 1 }}
                    >
                      {Math.round(emissionValue).toLocaleString()}{" "}
                      {getEmissionUnit()}
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* KBOB Material Selection */}
              <Box sx={{ mt: "auto" }}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1, fontWeight: 500 }}
                >
                  KBOB Material
                </Typography>
                <Select
                  value={
                    matches[material.id]
                      ? {
                          value: matches[material.id],
                          label: kbobMaterial?.nameDE || "",
                        }
                      : null
                  }
                  onChange={(newValue) =>
                    handleMaterialSelect(newValue, material.id)
                  }
                  options={
                    typeof kbobMaterialOptions === "function"
                      ? kbobMaterialOptions(material.id)
                      : kbobMaterialOptions
                  }
                  styles={{
                    ...selectStyles,
                    control: (base: any, state: any) => ({
                      ...base,
                      borderColor: state.isFocused
                        ? "var(--mui-palette-primary-main)"
                        : "var(--mui-palette-divider)",
                      boxShadow: state.isFocused
                        ? "0 0 0 1px var(--mui-palette-primary-main)"
                        : "none",
                      "&:hover": {
                        borderColor: "var(--mui-palette-primary-main)",
                      },
                    }),
                    menu: (base: any) => ({
                      ...base,
                      zIndex: 2,
                    }),
                  }}
                  className="w-full"
                  placeholder="KBOB Material auswählen..."
                />
              </Box>
            </Paper>

            {/* Density Edit Dialog */}
            {editingDensity === material.id && kbobMaterial?.densityRange && (
              <DensityDialog
                open={true}
                onClose={() => setEditingDensity(null)}
                materialId={material.id}
                materialName={material.name}
                currentDensity={currentDensity}
                densityRange={kbobMaterial.densityRange}
                onSave={(newDensity) =>
                  handleDensityUpdate(material.id, newDensity)
                }
              />
            )}
          </Grid>
        );
      })}
    </Grid>
  );
};

export default ModelledMaterialList;
