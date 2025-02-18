import { FileDownload, UploadFile } from "@mui/icons-material";
import {
  Box,
  Button,
  CircularProgress,
  Grid,
  Paper,
  Step,
  StepLabel,
  Stepper,
  Tab,
  Tabs,
  Typography,
  useTheme,
} from "@mui/material";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactDOM from "react-dom";
import Select, { SingleValue } from "react-select";
import { ebkpData } from "../data/ebkpData";
import { jsonOperations } from "../services/jsonOperations";
import { fetchKBOBMaterials } from "../services/kbobService";
import {
  ModelledMaterials as DefaultModelledMaterials,
  KbobMaterial,
  Material,
  OutputFormatLabels,
  OutputFormats,
  OutputFormatUnits,
  UnmodelledMaterial,
  UnmodelledMaterials,
} from "../types/lca.types.ts";
import { LCACalculator } from "../utils/lcaCalculator";

const calculator = new LCACalculator();

interface MaterialOption {
  value: string;
  label: string;
  isDisabled?: boolean;
}

// Add new type for sort options
type SortOption = "volume" | "name";

export default function LCACalculatorComponent(): JSX.Element {
  const theme = useTheme();
  const [modelledMaterials, setModelledMaterials] = useState<Material[]>(
    DefaultModelledMaterials
  );
  const [unmodelledMaterials, setUnmodelledMaterials] =
    useState<UnmodelledMaterial[]>(UnmodelledMaterials);
  const [kbobMaterials, setKbobMaterials] = useState<KbobMaterial[]>([]);
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState(0);
  const [newUnmodelledMaterial, setNewUnmodelledMaterial] =
    useState<UnmodelledMaterial>({
      id: "",
      name: "",
      volume: "",
      ebkp: "",
      kbobId: "",
    });
  const [outputFormat, setOutputFormat] = useState<OutputFormats>(
    OutputFormats.GWP
  );
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [sortBy, setSortBy] = useState<SortOption>("volume");
  const [sidebarContainer, setSidebarContainer] = useState<HTMLElement | null>(
    null
  );

  useEffect(() => {
    const loadKBOBMaterials = async () => {
      const materials = await fetchKBOBMaterials();
      setKbobMaterials(materials);
    };
    loadKBOBMaterials();
  }, []);

  useEffect(() => {
    let container = document.getElementById("sidebar");
    if (!container) {
      container = document.createElement("div");
      container.id = "sidebar";
      document.body.appendChild(container);
    }
    setSidebarContainer(container);
  }, []);

  const handleMatch = useCallback((modelId: string, kbobId?: string): void => {
    setMatches((prev) => {
      const newMatches = { ...prev };
      if (kbobId === undefined) {
        delete newMatches[modelId];
      } else {
        newMatches[modelId] = kbobId;
      }
      return newMatches;
    });
  }, []);

  const handleAddUnmodelledMaterial = useCallback(
    (e: React.FormEvent<HTMLFormElement>): void => {
      e.preventDefault();
      if (
        newUnmodelledMaterial.name &&
        newUnmodelledMaterial.ebkp &&
        typeof newUnmodelledMaterial.volume === "number" &&
        newUnmodelledMaterial.volume > 0
      ) {
        const newId =
          Math.max(...unmodelledMaterials.map((m) => parseInt(m.id)), 100) + 1;
        setUnmodelledMaterials((prev) => [
          ...prev,
          {
            id: newId.toString(),
            name: newUnmodelledMaterial.name,
            volume: newUnmodelledMaterial.volume,
            ebkp: newUnmodelledMaterial.ebkp,
            kbobId: newUnmodelledMaterial.kbobId,
          },
        ]);
        setNewUnmodelledMaterial({
          id: "",
          name: "",
          volume: "",
          ebkp: "",
          kbobId: "",
        });
      }
    },
    [newUnmodelledMaterial, unmodelledMaterials]
  );

  const handleMaterialSelect = useCallback(
    (selectedOption: SingleValue<MaterialOption>, materialId: string): void => {
      handleMatch(materialId, selectedOption?.value);
    },
    [handleMatch]
  );

  const handleRemoveUnmodelledMaterial = useCallback(
    (index: number): void => {
      setUnmodelledMaterials((prev) => prev.filter((_, i) => i !== index));
    },
    [unmodelledMaterials]
  );

  const kbobMaterialOptions = useMemo(
    () =>
      kbobMaterials.map((kbob) => ({
        value: kbob.id,
        label: `${kbob.nameDE} (${kbob.density} ${kbob.unit})`,
        isDisabled: kbob.density <= 0,
      })),
    [kbobMaterials]
  );

  const selectStyles = useMemo(
    () => ({
      control: (provided: any) => ({
        ...provided,
        borderRadius: theme.shape.borderRadius,
        borderColor: theme.palette.divider,
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        boxShadow: "none",
        "&:hover": {
          borderColor: theme.palette.primary.main,
        },
      }),
      option: (provided: any, state: any) => ({
        ...provided,
        backgroundColor: state.isSelected
          ? theme.palette.primary.main
          : theme.palette.background.paper,
        color: state.isDisabled
          ? theme.palette.text.disabled
          : theme.palette.text.primary,
        cursor: state.isDisabled ? "not-allowed" : "default",
        "&:hover": {
          backgroundColor: theme.palette.action.hover,
        },
      }),
      menu: (provided: any) => ({
        ...provided,
        backgroundColor: theme.palette.background.paper,
        borderColor: theme.palette.divider,
        borderRadius: theme.shape.borderRadius,
        boxShadow: theme.shadows[1],
      }),
      singleValue: (provided: any) => ({
        ...provided,
        color: theme.palette.text.primary,
      }),
      input: (provided: any) => ({
        ...provided,
        color: theme.palette.text.primary,
      }),
      placeholder: (provided: any) => ({
        ...provided,
        color: theme.palette.text.secondary,
      }),
    }),
    [theme]
  );

  const handleExportJSON = useCallback(() => {
    jsonOperations.handleExportJSON(
      modelledMaterials,
      unmodelledMaterials,
      matches,
      kbobMaterials
    );
  }, [modelledMaterials, unmodelledMaterials, matches, kbobMaterials]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const modelledMaterials = await jsonOperations.handleFileUpload(
        file,
        (progress) => setUploadProgress(progress)
      );

      setModelledMaterials(modelledMaterials);
      setUploadProgress(0);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error processing JSON file:", error);
      alert("Fehler beim Verarbeiten der JSON-Datei");
    }
  };

  // Add sort function
  const sortMaterials = <T extends { volume: number | ""; name: string }>(
    materials: T[]
  ) => {
    return [...materials].sort((a, b) => {
      if (sortBy === "volume") {
        const volA = typeof a.volume === "number" ? a.volume : 0;
        const volB = typeof b.volume === "number" ? b.volume : 0;
        return volB - volA;
      }
      return a.name.localeCompare(b.name);
    });
  };

  // Add instructions array
  const instructions = [
    {
      label: "Daten importieren",
      description: "Laden Sie die JSON-Datei mit den Materialdaten hoch.",
    },
    {
      label: "Materialien zuordnen",
      description: "Ordnen Sie die Materialien den KBOB-Referenzen zu.",
    },
    {
      label: "Ergebnis exportieren",
      description: "Exportieren Sie die zugeordneten Materialien als JSON.",
    },
  ];

  // Calculate current step
  const getCurrentStep = () => {
    if (modelledMaterials.length === 0) return 0;
    if (
      modelledMaterials.filter((m) => matches[m.id]).length <
      modelledMaterials.length
    )
      return 1;
    return 2;
  };

  const outputFormatOptions = useMemo(
    () =>
      Object.entries(OutputFormatLabels).map(([value, label]) => ({
        value,
        label,
      })),
    []
  );

  const sortOptions = useMemo(
    () => [
      { value: "volume", label: "Volumen" },
      { value: "name", label: "Name" },
    ],
    []
  );

  const sidebarContent = (
    <Paper
      elevation={1}
      sx={{
        p: 2,
        height: "fit-content",
        backgroundColor: "background.paper",
        borderRadius: 1,
        width: "100%",
        "& > .MuiBox-root": {
          width: "100%",
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 3,
          width: "100%",
        }}
      >
        {/* File Operations Section */}
        <Box sx={{ width: "100%" }}>
          <Typography variant="subtitle1" fontWeight="600" gutterBottom>
            Dateioperationen
          </Typography>
          <Box sx={{ display: "flex", gap: 1, width: "100%" }}>
            <Button
              onClick={handleExportJSON}
              variant="contained"
              color="primary"
              disabled={getCurrentStep() < 2}
              startIcon={<FileDownload />}
              fullWidth
              sx={{
                opacity: 0.9,
                "&:hover": {
                  opacity: 1,
                },
                "&.Mui-disabled": {
                  opacity: 0.3,
                },
              }}
            >
              Export
            </Button>
            <Button
              onClick={handleUploadClick}
              variant="contained"
              color="secondary"
              startIcon={<UploadFile />}
              fullWidth
              sx={{
                opacity: 0.9,
                "&:hover": {
                  opacity: 1,
                },
              }}
            >
              Import
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json"
              style={{ display: "none" }}
            />
          </Box>
          {uploadProgress > 0 && (
            <Box sx={{ mt: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CircularProgress
                  size={16}
                  variant="determinate"
                  value={uploadProgress}
                />
                <Typography variant="caption" color="text.secondary">
                  {uploadProgress}% hochgeladen
                </Typography>
              </Box>
            </Box>
          )}
        </Box>

        {/* Progress Section */}
        {modelledMaterials.length > 0 && (
          <Box>
            <Typography variant="subtitle1" fontWeight="600" gutterBottom>
              Fortschritt
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Modellierte Materialien: {modelledMaterials.length}
                </Typography>
                <Box
                  sx={{
                    width: "100%",
                    bgcolor: "grey.200",
                    borderRadius: "9999px",
                    height: "8px",
                  }}
                >
                  <Box
                    sx={{
                      width: `${
                        (modelledMaterials.filter((m) => matches[m.id]).length /
                          modelledMaterials.length) *
                        100
                      }%`,
                      bgcolor: "primary.main",
                      borderRadius: "9999px",
                      height: "100%",
                      transition: "width 0.3s",
                    }}
                  />
                </Box>
              </Box>
              <Typography variant="caption" color="text.secondary">
                {modelledMaterials.filter((m) => matches[m.id]).length} von{" "}
                {modelledMaterials.length} zugeordnet
              </Typography>
            </Box>
          </Box>
        )}

        {/* Output Format Section */}
        <Box>
          <Typography variant="subtitle1" fontWeight="600" gutterBottom>
            Ausgabeformat
          </Typography>
          <Select
            value={outputFormatOptions.find(
              (opt) => opt.value === outputFormat
            )}
            onChange={(newValue) =>
              setOutputFormat(newValue?.value as OutputFormats)
            }
            options={outputFormatOptions}
            styles={selectStyles}
            className="w-full"
          />
        </Box>

        {/* Total Result Section */}
        <Box>
          <Typography variant="subtitle1" fontWeight="600" gutterBottom>
            Gesamtergebnis
          </Typography>
          <Box
            sx={{
              background: "linear-gradient(to right top, #F1D900, #fff176)",
              p: 2,
              borderRadius: 1,
            }}
          >
            <Typography
              variant="h4"
              component="p"
              color="common.black"
              fontWeight="bold"
            >
              {calculator.calculateGrandTotal(
                modelledMaterials,
                matches,
                kbobMaterials,
                outputFormat,
                unmodelledMaterials
              )}
              <Typography
                component="span"
                variant="h6"
                sx={{ ml: 1, opacity: 0.7, fontWeight: "normal" }}
              >
                {OutputFormatUnits[outputFormat]}
              </Typography>
            </Typography>
          </Box>
        </Box>

        {/* Process Steps Section */}
        <Box>
          <Typography variant="subtitle1" fontWeight="600" gutterBottom>
            Prozess
          </Typography>
          <Stepper
            orientation="vertical"
            activeStep={getCurrentStep()}
            sx={{ maxWidth: "320px" }}
          >
            {instructions.map((step, index) => (
              <Step key={step.label} completed={getCurrentStep() > index}>
                <StepLabel>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {step.label}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mt: 0.5 }}
                  >
                    {step.description}
                  </Typography>
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>
      </Box>
    </Paper>
  );

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ width: "100%", height: "100%" }}>
      {sidebarContainer &&
        ReactDOM.createPortal(sidebarContent, sidebarContainer)}
      <Box
        sx={{ display: "flex", flexDirection: "column", gap: 3, width: "100%" }}
      >
        <Paper elevation={1} sx={{ p: 3, width: "100%" }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 3,
            }}
          >
            <Typography variant="h5" fontWeight="bold">
              Materialien
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Sortieren nach:
              </Typography>
              <Select
                value={sortOptions.find((opt) => opt.value === sortBy)}
                onChange={(newValue) =>
                  setSortBy(newValue?.value as SortOption)
                }
                options={sortOptions}
                styles={selectStyles}
                className="w-40"
              />
            </Box>
          </Box>

          <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              sx={{
                "& .MuiTab-root": {
                  textTransform: "none",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: "text.secondary",
                  "&.Mui-selected": {
                    color: "primary.main",
                  },
                },
                "& .MuiTabs-indicator": {
                  backgroundColor: "primary.main",
                },
              }}
            >
              <Tab label="Modellierte Materialien" />
              <Tab label="Nicht modellierte Materialien" />
            </Tabs>
          </Box>

          {activeTab === 0 ? (
            <Grid container spacing={2}>
              {sortMaterials(modelledMaterials).map((material, index) => (
                <Grid item xs={12} lg={6} key={index}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      border: 1,
                      borderColor: "divider",
                      borderRadius: 1,
                      "&:hover": {
                        boxShadow: 2,
                      },
                      transition: "box-shadow 0.3s",
                    }}
                  >
                    {/* Material content */}
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 2,
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          flex: 1,
                        }}
                      >
                        <Typography variant="body1" fontWeight="500">
                          {material.name}
                        </Typography>
                        <Box
                          sx={{
                            bgcolor: "secondary.main",
                            opacity: 0.5,
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                          }}
                        >
                          <Typography variant="body2">
                            {typeof material.volume === "number"
                              ? material.volume.toFixed(2)
                              : "0.00"}{" "}
                            m³
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                    <Select
                      value={
                        matches[material.id]
                          ? {
                              value: matches[material.id],
                              label:
                                kbobMaterials.find(
                                  (k) => k.id === matches[material.id]
                                )?.nameDE || "",
                              isDisabled: false,
                            }
                          : null
                      }
                      onChange={(newValue) =>
                        handleMaterialSelect(newValue, material.id)
                      }
                      options={kbobMaterialOptions}
                      styles={selectStyles}
                      className="w-full"
                    />
                  </Paper>
                </Grid>
              ))}
            </Grid>
          ) : (
            <>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  mb: 3,
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                }}
              >
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Neues Material hinzufügen
                </Typography>
                <Box
                  component="form"
                  onSubmit={handleAddUnmodelledMaterial}
                  sx={{ width: "100%" }}
                >
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={12} md={6}>
                      <Typography
                        variant="body2"
                        sx={{ mb: 1, fontWeight: 500 }}
                      >
                        Name
                      </Typography>
                      <Box
                        component="input"
                        type="text"
                        value={newUnmodelledMaterial.name}
                        onChange={(e) =>
                          setNewUnmodelledMaterial({
                            ...newUnmodelledMaterial,
                            name: e.target.value,
                          })
                        }
                        sx={{
                          width: "100%",
                          p: 1.5,
                          border: 1,
                          borderColor: "divider",
                          borderRadius: 1,
                          bgcolor: "background.paper",
                          "&:hover": {
                            borderColor: "primary.main",
                          },
                          "&:focus": {
                            outline: "none",
                            borderColor: "primary.main",
                            boxShadow: 1,
                          },
                        }}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography
                        variant="body2"
                        sx={{ mb: 1, fontWeight: 500 }}
                      >
                        EBKP
                      </Typography>
                      <Select
                        value={
                          newUnmodelledMaterial.ebkp
                            ? {
                                value: newUnmodelledMaterial.ebkp,
                                label: `${newUnmodelledMaterial.ebkp} - ${
                                  ebkpData.find(
                                    (item) =>
                                      item.code === newUnmodelledMaterial.ebkp
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
                        options={ebkpData.map((item) => ({
                          value: item.code,
                          label: `${item.code} - ${item.bezeichnung}`,
                        }))}
                        styles={selectStyles}
                        placeholder="Wählen Sie einen EBKP-Code"
                        isClearable
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography
                        variant="body2"
                        sx={{ mb: 1, fontWeight: 500 }}
                      >
                        Volumen (m³)
                      </Typography>
                      <Box
                        component="input"
                        type="number"
                        step="0.01"
                        value={
                          newUnmodelledMaterial.volume === ""
                            ? ""
                            : newUnmodelledMaterial.volume
                        }
                        onChange={(e) =>
                          setNewUnmodelledMaterial({
                            ...newUnmodelledMaterial,
                            volume:
                              e.target.value === ""
                                ? ""
                                : parseFloat(e.target.value),
                          })
                        }
                        sx={{
                          width: "100%",
                          p: 1.5,
                          border: 1,
                          borderColor: "divider",
                          borderRadius: 1,
                          bgcolor: "background.paper",
                          "&:hover": {
                            borderColor: "primary.main",
                          },
                          "&:focus": {
                            outline: "none",
                            borderColor: "primary.main",
                            boxShadow: 1,
                          },
                        }}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography
                        variant="body2"
                        sx={{ mb: 1, fontWeight: 500 }}
                      >
                        KBOB Material
                      </Typography>
                      <Select
                        value={
                          newUnmodelledMaterial.kbobId
                            ? ({
                                value: newUnmodelledMaterial.kbobId,
                                label:
                                  kbobMaterials.find(
                                    (k) => k.id === newUnmodelledMaterial.kbobId
                                  )?.nameDE || "",
                                isDisabled: false,
                              } as MaterialOption)
                            : null
                        }
                        onChange={(newValue: SingleValue<MaterialOption>) =>
                          setNewUnmodelledMaterial({
                            ...newUnmodelledMaterial,
                            kbobId: newValue?.value || "",
                          })
                        }
                        options={kbobMaterialOptions}
                        styles={selectStyles}
                      />
                    </Grid>
                  </Grid>
                  <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                    <Button type="submit" variant="contained" color="primary">
                      Hinzufügen
                    </Button>
                  </Box>
                </Box>
              </Paper>
              <Grid container spacing={2}>
                {sortMaterials(unmodelledMaterials).map((material, index) => (
                  <Grid item xs={12} lg={6} key={index}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        border: 1,
                        borderColor: "divider",
                        borderRadius: 1,
                        "&:hover": {
                          boxShadow: 2,
                        },
                        transition: "box-shadow 0.3s",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          mb: 2,
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            flex: 1,
                          }}
                        >
                          <Typography variant="body1" fontWeight="500">
                            {material.name}
                          </Typography>
                          <Box
                            sx={{
                              bgcolor: "warning.light",
                              px: 1,
                              py: 0.5,
                              borderRadius: 1,
                              opacity: 0.8,
                            }}
                          >
                            <Typography variant="caption" color="warning.dark">
                              Nicht modelliert
                            </Typography>
                          </Box>
                          {material.ebkp && (
                            <Box
                              sx={{
                                bgcolor: "info.light",
                                px: 1,
                                py: 0.5,
                                borderRadius: 1,
                                opacity: 0.8,
                              }}
                            >
                              <Typography variant="caption" color="info.dark">
                                {material.ebkp}
                              </Typography>
                            </Box>
                          )}
                          <Box
                            sx={{
                              bgcolor: "secondary.main",
                              opacity: 0.5,
                              px: 1,
                              py: 0.5,
                              borderRadius: 1,
                            }}
                          >
                            <Typography variant="body2">
                              {typeof material.volume === "number"
                                ? material.volume.toFixed(2)
                                : "0.00"}{" "}
                              m³
                            </Typography>
                          </Box>
                        </Box>
                        <Button
                          onClick={() => handleRemoveUnmodelledMaterial(index)}
                          variant="text"
                          color="error"
                          startIcon={
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M3 6h18"></path>
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                            </svg>
                          }
                        >
                          Löschen
                        </Button>
                      </Box>
                      <Select
                        value={
                          material.kbobId
                            ? ({
                                value: material.kbobId,
                                label:
                                  kbobMaterials.find(
                                    (k) => k.id === material.kbobId
                                  )?.nameDE || "",
                                isDisabled: false,
                              } as MaterialOption)
                            : null
                        }
                        onChange={(newValue: SingleValue<MaterialOption>) =>
                          handleMaterialSelect(newValue, material.id)
                        }
                        options={kbobMaterialOptions}
                        styles={selectStyles}
                      />
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
