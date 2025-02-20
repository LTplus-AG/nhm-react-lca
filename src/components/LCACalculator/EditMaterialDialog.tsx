import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Typography,
  TextField,
} from "@mui/material";
import Select from "react-select";
import { UnmodelledMaterial, KbobMaterial } from "../../types/lca.types";
import { ebkpData } from "../../data/ebkpData";

interface EditMaterialDialogProps {
  open: boolean;
  material: UnmodelledMaterial | null;
  onClose: () => void;
  onSave: (material: UnmodelledMaterial) => void;
  selectStyles: any;
  kbobMaterials: KbobMaterial[];
  kbobMaterialOptions: any;
}

const EditMaterialDialog: React.FC<EditMaterialDialogProps> = ({
  open,
  material,
  onClose,
  onSave,
  selectStyles,
  kbobMaterials,
  kbobMaterialOptions,
}) => {
  const [editedMaterial, setEditedMaterial] =
    React.useState<UnmodelledMaterial | null>(null);

  React.useEffect(() => {
    setEditedMaterial(material);
  }, [material]);

  if (!editedMaterial) return null;

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      const numValue = value === "" ? "" : parseFloat(value);
      if (typeof numValue !== "number" || numValue >= 0) {
        setEditedMaterial({
          ...editedMaterial,
          volume: numValue,
        });
      }
    }
  };

  const ebkpOptions = ebkpData.map((ebkp) => ({
    value: ebkp.code,
    label: `${ebkp.code} - ${ebkp.bezeichnung}`,
  }));

  const customSelectStyles = {
    ...selectStyles,
    menu: (base: any) => ({
      ...base,
      position: "absolute",
      width: "100%",
      zIndex: 9999,
    }),
    menuPortal: (base: any) => ({
      ...base,
      zIndex: 9999,
    }),
    control: (base: any) => ({
      ...base,
      borderRadius: "12px",
      minHeight: "40px",
    }),
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          minHeight: "fit-content",
          maxHeight: "90vh",
          m: 2,
          borderRadius: 2,
          overflow: "visible",
        },
      }}
    >
      <DialogTitle sx={{ pb: 2, pt: 3, px: 3 }}>
        Material bearbeiten
      </DialogTitle>
      <DialogContent sx={{ px: 3, pb: 3, overflow: "visible" }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
              Material Name
            </Typography>
            <TextField
              fullWidth
              value={editedMaterial.name}
              onChange={(e) =>
                setEditedMaterial({
                  ...editedMaterial,
                  name: e.target.value,
                })
              }
              required
              size="medium"
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 1.5,
                },
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
              Volume (m³)
            </Typography>
            <TextField
              fullWidth
              type="number"
              inputProps={{
                min: 0,
                step: "any",
                pattern: "[0-9]*\\.?[0-9]*",
              }}
              value={editedMaterial.volume}
              onChange={handleVolumeChange}
              required
              size="medium"
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 1.5,
                },
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
              EBKP Code
            </Typography>
            <Select
              value={
                editedMaterial.ebkp
                  ? {
                      value: editedMaterial.ebkp,
                      label: `${editedMaterial.ebkp} - ${
                        ebkpData.find((e) => e.code === editedMaterial.ebkp)
                          ?.bezeichnung || ""
                      }`,
                    }
                  : null
              }
              onChange={(newValue) =>
                setEditedMaterial({
                  ...editedMaterial,
                  ebkp: newValue?.value || "",
                })
              }
              options={ebkpOptions}
              styles={customSelectStyles}
              menuPortalTarget={document.body}
              menuPosition="fixed"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
              KBOB Material
            </Typography>
            <Select
              value={
                editedMaterial.kbobId
                  ? {
                      value: editedMaterial.kbobId,
                      label:
                        kbobMaterials.find(
                          (k) => k.id === editedMaterial.kbobId
                        )?.nameDE || "",
                    }
                  : null
              }
              onChange={(newValue) =>
                setEditedMaterial({
                  ...editedMaterial,
                  kbobId: newValue?.value || "",
                })
              }
              options={
                typeof kbobMaterialOptions === "function"
                  ? kbobMaterialOptions("")
                  : kbobMaterialOptions
              }
              styles={customSelectStyles}
              menuPortalTarget={document.body}
              menuPosition="fixed"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            borderRadius: 1.5,
            textTransform: "none",
            minWidth: "100px",
          }}
        >
          Abbrechen
        </Button>
        <Button
          onClick={() => onSave(editedMaterial)}
          variant="contained"
          disabled={
            !editedMaterial.name ||
            !editedMaterial.ebkp ||
            typeof editedMaterial.volume !== "number" ||
            editedMaterial.volume <= 0
          }
          sx={{
            borderRadius: 1.5,
            textTransform: "none",
            minWidth: "100px",
          }}
        >
          Speichern
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditMaterialDialog;
