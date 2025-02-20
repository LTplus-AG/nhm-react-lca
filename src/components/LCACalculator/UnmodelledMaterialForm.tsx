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

  // Create EBKP options with correct property name
  const ebkpOptions = React.useMemo(
    () =>
      ebkpData.map((ebkp) => ({
        value: ebkp.code,
        label: `${ebkp.code} - ${ebkp.bezeichnung}`,
      })),
    []
  );

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
    <Box component="form" onSubmit={handleAddUnmodelledMaterial} sx={{ mb: 4 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
            Material Name
          </Typography>
          <TextField
            fullWidth
            value={newUnmodelledMaterial.name}
            onChange={(e) =>
              setNewUnmodelledMaterial({
                ...newUnmodelledMaterial,
                name: e.target.value,
              })
            }
            required
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
            Volume (m³)
          </Typography>
          <TextField
            fullWidth
            type="number"
            inputProps={{
              min: 0,
              step: "any",
              pattern: "[0-9]*.?[0-9]*", // Only allow numbers and decimal point
              onKeyDown: (e) => {
                // Prevent non-numeric input (except for special keys)
                if (
                  !/[\d.]/.test(e.key) && // Not a digit or decimal
                  ![
                    "Backspace",
                    "Delete",
                    "ArrowLeft",
                    "ArrowRight",
                    "Tab",
                  ].includes(e.key) && // Not a control key
                  !(
                    (e.ctrlKey || e.metaKey) &&
                    ["c", "v", "x"].includes(e.key.toLowerCase())
                  ) // Not copy/paste/cut
                ) {
                  e.preventDefault();
                }
                // Prevent multiple decimal points
                if (
                  e.key === "." &&
                  (e.target as HTMLInputElement).value.includes(".")
                ) {
                  e.preventDefault();
                }
              },
            }}
            value={newUnmodelledMaterial.volume}
            onChange={handleVolumeChange}
            required
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
            EBKP Code
          </Typography>
          <Select
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
              setNewUnmodelledMaterial({
                ...newUnmodelledMaterial,
                ebkp: newValue?.value || "",
              })
            }
            options={ebkpOptions}
            styles={selectStyles}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
            KBOB Material
          </Typography>
          <Select
            value={
              newUnmodelledMaterial.kbobId
                ? {
                    value: newUnmodelledMaterial.kbobId,
                    label: `${selectedKbobMaterial?.nameDE} ${
                      selectedKbobMaterial?.densityRange
                        ? `(${selectedKbobMaterial.densityRange.min}-${selectedKbobMaterial.densityRange.max} kg/m³)`
                        : selectedKbobMaterial?.density
                        ? `(${selectedKbobMaterial.density} kg/m³)`
                        : ""
                    }`,
                  }
                : null
            }
            onChange={handleKbobMaterialChange}
            options={
              typeof kbobMaterialOptions === "function"
                ? kbobMaterialOptions("")
                : kbobMaterialOptions
            }
            styles={selectStyles}
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
      </Grid>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={
            !newUnmodelledMaterial.name ||
            !newUnmodelledMaterial.ebkp ||
            typeof newUnmodelledMaterial.volume !== "number" ||
            newUnmodelledMaterial.volume <= 0 ||
            !!densityError
          }
        >
          Hinzufügen
        </Button>
      </Box>
    </Box>
  );
};

export default UnmodelledMaterialForm;
