import React from "react";
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
                    label:
                      kbobMaterials.find(
                        (k) => k.id === newUnmodelledMaterial.kbobId
                      )?.nameDE || "",
                  }
                : null
            }
            onChange={(newValue) =>
              setNewUnmodelledMaterial({
                ...newUnmodelledMaterial,
                kbobId: newValue?.value || "",
              })
            }
            options={
              typeof kbobMaterialOptions === "function"
                ? kbobMaterialOptions("")
                : kbobMaterialOptions
            }
            styles={selectStyles}
          />
        </Grid>
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
            newUnmodelledMaterial.volume <= 0
          }
        >
          Hinzufügen
        </Button>
      </Box>
    </Box>
  );
};

export default UnmodelledMaterialForm;
