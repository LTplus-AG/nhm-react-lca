import React, { useState, useEffect } from "react";
import { Box, Grid, Typography, Button, TextField } from "@mui/material";
import Select from "react-select";
import { UnmodelledMaterial, KbobMaterial } from "../../types/lca.types";
import { ebkpData } from "../../data/ebkpData";
import { EBKPItem } from "../../types/ebkp.types"; // Import the existing type

interface UnmodelledMaterialFormProps {
  newUnmodelledMaterial: UnmodelledMaterial;
  setNewUnmodelledMaterial: React.Dispatch<
    React.SetStateAction<UnmodelledMaterial>
  >;
  handleAddUnmodelledMaterial: (e: React.FormEvent<HTMLFormElement>) => void;
  kbobMaterials: KbobMaterial[];
  kbobMaterialOptions: any; // Adjust the type as needed.
  selectStyles: any;
}

const UnmodelledMaterialForm: React.FC<UnmodelledMaterialFormProps> = ({
  newUnmodelledMaterial,
  setNewUnmodelledMaterial,
  handleAddUnmodelledMaterial,
  kbobMaterials,
  kbobMaterialOptions,
  selectStyles,
}) => {
  const [densityError, setDensityError] = useState("");
  const [selectedKbobMaterial, setSelectedKbobMaterial] =
    useState<KbobMaterial | null>(null);
  const [ebkpOptions, setEbkpOptions] = useState<
    { value: string; label: string }[]
  >([]);

  useEffect(() => {
    if (newUnmodelledMaterial.kbobId) {
      const material = kbobMaterials.find(
        (m) => m.id === newUnmodelledMaterial.kbobId
      );
      setSelectedKbobMaterial(material || null);
    } else {
      setSelectedKbobMaterial(null);
    }
  }, [newUnmodelledMaterial.kbobId, kbobMaterials]);

  useEffect(() => {
    const options = ebkpData.map((item: EBKPItem) => ({
      value: item.code,
      label: `${item.code} - ${item.bezeichnung}`,
    }));
    setEbkpOptions(options);
  }, []);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers and decimal point
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      const numValue = value === "" ? "" : parseFloat(value);
      if (typeof numValue !== "number" || numValue >= 0) {
        setNewUnmodelledMaterial({
          ...newUnmodelledMaterial,
          volume: numValue,
        });
      }
    }
  };

  const handleDensityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);

    if (selectedKbobMaterial?.densityRange) {
      const { min, max } = selectedKbobMaterial.densityRange;
      if (value < min || value > max) {
        setDensityError(`Dichte muss zwischen ${min} und ${max} kg/m³ liegen`);
      } else {
        setDensityError("");
      }
    }

    setNewUnmodelledMaterial({
      ...newUnmodelledMaterial,
      density: value,
    });
  };

  const handleKbobMaterialChange = (newValue: any) => {
    const selectedMaterial = kbobMaterials.find(
      (k) => k.id === newValue?.value
    );
    setNewUnmodelledMaterial({
      ...newUnmodelledMaterial,
      kbobId: newValue?.value || "",
      density: selectedMaterial?.density || 0,
    });

    // Reset density error when changing material
    setDensityError("");
  };

  return (
    <Box
      component="form"
      onSubmit={handleAddUnmodelledMaterial}
      sx={{
        mb: 4,
        p: { xs: 2, sm: 3 },
        border: "1px dashed",
        borderColor: "divider",
        borderRadius: 2,
        bgcolor: "background.default",
      }}
    >
      <Typography
        variant="h6"
        sx={{ mb: 2, fontWeight: 600, fontSize: { xs: "1rem", sm: "1.25rem" } }}
      >
        Nicht-modelliertes Material hinzufügen
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 1, fontWeight: 500 }}
          >
            Name
          </Typography>
          <TextField
            required
            fullWidth
            size="small"
            placeholder="Material Name"
            value={newUnmodelledMaterial.name}
            onChange={(e) =>
              setNewUnmodelledMaterial((prev) => ({
                ...prev,
                name: e.target.value,
              }))
            }
            InputProps={{
              sx: {
                bgcolor: "background.paper",
              },
            }}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 1, fontWeight: 500 }}
          >
            Volumen (m³)
          </Typography>
          <TextField
            required
            fullWidth
            size="small"
            type="number"
            placeholder="0.00"
            value={
              typeof newUnmodelledMaterial.volume === "number"
                ? newUnmodelledMaterial.volume
                : ""
            }
            onChange={(e) =>
              setNewUnmodelledMaterial((prev) => ({
                ...prev,
                volume: e.target.value ? parseFloat(e.target.value) : "",
              }))
            }
            InputProps={{
              sx: {
                bgcolor: "background.paper",
              },
            }}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 1, fontWeight: 500 }}
          >
            EBKP
          </Typography>
          <Select
            required
            options={ebkpOptions}
            value={
              newUnmodelledMaterial.ebkp
                ? {
                    value: newUnmodelledMaterial.ebkp,
                    label: `${newUnmodelledMaterial.ebkp} - ${
                      ebkpData.find(
                        (e) => e.code === newUnmodelledMaterial.ebkp
                      )?.bezeichnung || ""
                    }`,
                  }
                : null
            }
            onChange={(newValue) =>
              setNewUnmodelledMaterial((prev) => ({
                ...prev,
                ebkp: newValue?.value || "",
              }))
            }
            styles={selectStyles}
            placeholder="EBKP Code auswählen..."
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 1, fontWeight: 500 }}
          >
            KBOB Material
          </Typography>
          <Select
            options={kbobMaterialOptions}
            value={
              newUnmodelledMaterial.kbobId
                ? {
                    value: newUnmodelledMaterial.kbobId,
                    label:
                      kbobMaterials.find(
                        (k) => k.id === newUnmodelledMaterial.kbobId
                      )?.nameDE || "",
                  }
                : null
            }
            onChange={(newValue) =>
              setNewUnmodelledMaterial((prev) => ({
                ...prev,
                kbobId: newValue?.value || "",
              }))
            }
            styles={selectStyles}
            placeholder="KBOB Material auswählen..."
          />
        </Grid>

        {/* Density field - only shown when KBOB material is selected */}
        {selectedKbobMaterial?.densityRange && (
          <Grid item xs={12} md={6}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
              Dichte (kg/m³)
            </Typography>
            <TextField
              fullWidth
              type="number"
              value={
                newUnmodelledMaterial.density || selectedKbobMaterial.density
              }
              onChange={handleDensityChange}
              error={!!densityError}
              helperText={
                densityError ||
                `Gültige Dichte: ${selectedKbobMaterial.densityRange.min} - ${selectedKbobMaterial.densityRange.max} kg/m³`
              }
              required
              InputProps={{
                inputProps: {
                  min: selectedKbobMaterial.densityRange.min,
                  max: selectedKbobMaterial.densityRange.max,
                  step: "0.1",
                },
              }}
            />
          </Grid>
        )}

        <Grid item xs={12}>
          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              sx={{ textTransform: "none" }}
            >
              Hinzufügen
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default UnmodelledMaterialForm;
