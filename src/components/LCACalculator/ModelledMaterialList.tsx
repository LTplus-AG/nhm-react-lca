import React from "react";
import { Grid, Paper, Box, Typography } from "@mui/material";
import Select from "react-select";
import { Material, KbobMaterial } from "../../types/lca.types";

interface ModelledMaterialListProps {
  modelledMaterials: Material[];
  kbobMaterials: KbobMaterial[];
  matches: Record<string, string>;
  handleMaterialSelect: (selectedOption: any, materialId: string) => void;
  kbobMaterialOptions: any;
  selectStyles: any;
  sortMaterials: (materials: Material[]) => Material[];
}

const ModelledMaterialList: React.FC<ModelledMaterialListProps> = ({
  modelledMaterials,
  kbobMaterials,
  matches,
  handleMaterialSelect,
  kbobMaterialOptions,
  selectStyles,
  sortMaterials,
}) => {
  return (
    <Grid container spacing={2}>
      {sortMaterials(modelledMaterials).map((material, index) => (
        <Grid item xs={12} lg={6} key={material.id || index}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              border: 1,
              borderColor: "divider",
              borderRadius: 2,
              height: "100%",
              display: "flex",
              flexDirection: "column",
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
                mb: 3,
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
              <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1 }}>
                {typeof material.volume === "number"
                  ? material.volume.toFixed(2)
                  : "0.00"}{" "}
                m³
              </Typography>
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
                        label:
                          kbobMaterials.find((k) => k.id === matches[material.id])
                            ?.nameDE || "",
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
        </Grid>
      ))}
    </Grid>
  );
};

export default ModelledMaterialList;
