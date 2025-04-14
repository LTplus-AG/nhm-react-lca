import React, { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Tooltip,
  TextField,
  Box,
  TableSortLabel,
  Autocomplete,
} from "@mui/material";
import { OutputFormats, MaterialImpact } from "../../types/lca.types";
import { DisplayMode } from "../../utils/lcaDisplayHelper";
import { BUILDING_LIFETIME_YEARS } from "../../utils/constants";

// Use the renamed LcaElement type
interface LcaElement {
  id: string;
  element_type: string;
  quantity: number;
  properties: {
    level?: string;
    is_structural?: boolean;
    is_external?: boolean;
    ebkp_code?: string;
    ebkp_name?: string;
    [key: string]: any;
  };
  materials: {
    name: string;
    volume: number;
    unit: string;
    kbob_id?: string;
  }[];
  impact?: MaterialImpact;
}

interface ElementImpactTableProps {
  elements: LcaElement[];
  outputFormat: OutputFormats;
  displayMode: DisplayMode;
  ebfNumeric: number | null;
}

// --- Helper Functions ---
const formatNumber = (
  num: number | null | undefined,
  decimals: number = 0
): string => {
  if (num === null || num === undefined || isNaN(num)) return "N/A";
  return new Intl.NumberFormat("de-CH", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: true,
  }).format(num);
};

const getDisplayValue = (
  value: number | undefined,
  displayMode: DisplayMode,
  ebfNumeric: number | null
): number | undefined => {
  if (value === undefined) return undefined;
  if (displayMode === "relative" && ebfNumeric !== null && ebfNumeric > 0) {
    return value / (BUILDING_LIFETIME_YEARS * ebfNumeric);
  }
  return value;
};

const getDecimalPrecision = (
  value: number | undefined,
  displayMode: DisplayMode
): number => {
  if (value === undefined) return 0;
  if (displayMode === "relative" || Math.abs(value) < 1) {
    return 2;
  } else if (Math.abs(value) < 100) {
    return 1;
  }
  return 0;
};

const formatDisplayValue = (
  value: number | undefined,
  displayMode: DisplayMode,
  ebfNumeric: number | null
): string => {
  const displayValue = getDisplayValue(value, displayMode, ebfNumeric);
  if (displayValue === undefined) return "N/A";
  const decimals = getDecimalPrecision(displayValue, displayMode);
  return formatNumber(displayValue, decimals);
};

const getUnitForOutputFormat = (
  outputFormat: OutputFormats,
  displayMode: DisplayMode
): string => {
  let baseUnit = "";
  switch (outputFormat) {
    case OutputFormats.GWP:
      baseUnit = "kg CO₂-eq";
      break;
    case OutputFormats.UBP:
      baseUnit = "UBP";
      break;
    case OutputFormats.PENR:
      baseUnit = "MJ";
      break;
    default:
      baseUnit = "";
  }
  if (displayMode === "relative") {
    return `${baseUnit}/m²·a`;
  }
  return baseUnit;
};

const getOutputFormatLabel = (outputFormat: OutputFormats): string => {
  switch (outputFormat) {
    case OutputFormats.GWP:
      return "GWP";
    case OutputFormats.UBP:
      return "UBP";
    case OutputFormats.PENR:
      return "PENR";
    default:
      return "Impact";
  }
};

// Type for sorting configuration
type SortableKeys =
  | "element_type"
  | "materials"
  | "quantity"
  | "ebkp"
  | "impact";
interface SortConfig {
  key: SortableKeys;
  direction: "asc" | "desc";
}

// --- Component ---
const ElementImpactTable: React.FC<ElementImpactTableProps> = ({
  elements,
  outputFormat,
  displayMode,
  ebfNumeric,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [selectedValue, setSelectedValue] = useState<LcaElement | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  const impactUnit = getUnitForOutputFormat(outputFormat, displayMode);
  const impactLabel = getOutputFormatLabel(outputFormat);
  const impactKey = outputFormat.toLowerCase() as keyof MaterialImpact;

  // Memoized filtering and sorting
  const processedElements = useMemo(() => {
    let filtered = [...elements];

    // 1. Filter by selected Autocomplete value if it exists
    if (selectedValue) {
      filtered = filtered.filter((el) => el.id === selectedValue.id);
    }
    // 2. Filter by Autocomplete input value if no value is selected
    else if (inputValue) {
      const lowerSearchTerm = inputValue.toLowerCase();
      filtered = filtered.filter((element) => {
        const materialsString = element.materials
          .map((m) => m.name)
          .join(",")
          .toLowerCase();
        const ebkpCode = element.properties?.ebkp_code?.toLowerCase() || "";
        const ebkpName = element.properties?.ebkp_name?.toLowerCase() || "";
        const elementType = element.element_type.toLowerCase();

        return (
          elementType.includes(lowerSearchTerm) ||
          materialsString.includes(lowerSearchTerm) ||
          ebkpCode.includes(lowerSearchTerm) ||
          ebkpName.includes(lowerSearchTerm)
        );
      });
    }

    // 3. Apply Sorting
    if (sortConfig !== null) {
      filtered.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortConfig.key) {
          case "element_type":
            aValue = a.element_type || "";
            bValue = b.element_type || "";
            break;
          case "materials":
            aValue = a.materials.map((m) => m.name).join(",") || "";
            bValue = b.materials.map((m) => m.name).join(",") || "";
            break;
          case "quantity":
            aValue = a.quantity ?? 0;
            bValue = b.quantity ?? 0;
            break;
          case "ebkp":
            aValue = a.properties?.ebkp_code || "";
            bValue = b.properties?.ebkp_code || "";
            break;
          case "impact":
            aValue =
              getDisplayValue(a.impact?.[impactKey], displayMode, ebfNumeric) ??
              -Infinity;
            bValue =
              getDisplayValue(b.impact?.[impactKey], displayMode, ebfNumeric) ??
              -Infinity;
            break;
          default:
            return 0;
        }

        if (typeof aValue === "string" && typeof bValue === "string") {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [
    elements,
    inputValue,
    selectedValue,
    sortConfig,
    outputFormat,
    displayMode,
    ebfNumeric,
    impactKey,
  ]);

  const displayElements = processedElements.slice(0, 100);

  const handleSortRequest = (key: SortableKeys) => {
    let direction: "asc" | "desc" = "asc";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Function to get label for Autocomplete options
  const getOptionLabelText = (option: LcaElement): string => {
    const ebkp = option.properties?.ebkp_code
      ? ` (${option.properties.ebkp_code})`
      : "";
    return `${option.element_type}${ebkp}`;
  };

  return (
    <Box>
      <Box sx={{ mb: 2, maxWidth: "400px" }}>
        <Autocomplete
          id="element-impact-search"
          options={elements}
          getOptionLabel={getOptionLabelText}
          value={selectedValue}
          onChange={(_, newValue) => {
            setSelectedValue(newValue);
          }}
          inputValue={inputValue}
          onInputChange={(_, newInputValue, reason) => {
            if (reason === "input") {
              setInputValue(newInputValue);
            }
            if (newInputValue === "" && reason !== "reset") {
              setSelectedValue(null);
            }
          }}
          filterOptions={(options, state) => {
            if (state.inputValue === "") return options.slice(0, 10);

            const lowerSearchTerm = state.inputValue.toLowerCase();
            return options
              .filter((option) => {
                const materialsString = option.materials
                  .map((m) => m.name)
                  .join(",")
                  .toLowerCase();
                const ebkpCode =
                  option.properties?.ebkp_code?.toLowerCase() || "";
                const ebkpName =
                  option.properties?.ebkp_name?.toLowerCase() || "";
                const elementType = option.element_type.toLowerCase();
                return (
                  elementType.includes(lowerSearchTerm) ||
                  materialsString.includes(lowerSearchTerm) ||
                  ebkpCode.includes(lowerSearchTerm) ||
                  ebkpName.includes(lowerSearchTerm)
                );
              })
              .slice(0, 50);
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              variant="outlined"
              size="small"
              placeholder="Elemente filtern oder auswählen..."
            />
          )}
          renderOption={(props, option) => {
            const { key, ...otherProps } = props as any;
            return (
              <li key={option.id} {...otherProps}>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    width: "100%",
                  }}
                >
                  <Typography variant="body2" fontWeight={500}>
                    {getOptionLabelText(option)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {option.materials.map((m) => m.name).join(", ")}
                  </Typography>
                </Box>
              </li>
            );
          }}
          noOptionsText="Keine passenden Elemente gefunden"
          isOptionEqualToValue={(option, value) => option.id === value.id}
          sx={{ width: "100%" }}
        />
      </Box>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: "medium" }}>
                <TableSortLabel
                  active={sortConfig?.key === "element_type"}
                  direction={
                    sortConfig?.key === "element_type"
                      ? sortConfig.direction
                      : "asc"
                  }
                  onClick={() => handleSortRequest("element_type")}
                >
                  Element Typ
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: "medium" }}>
                <TableSortLabel
                  active={sortConfig?.key === "materials"}
                  direction={
                    sortConfig?.key === "materials"
                      ? sortConfig.direction
                      : "asc"
                  }
                  onClick={() => handleSortRequest("materials")}
                >
                  Materialien
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "medium" }}>
                <TableSortLabel
                  active={sortConfig?.key === "quantity"}
                  direction={
                    sortConfig?.key === "quantity"
                      ? sortConfig.direction
                      : "asc"
                  }
                  onClick={() => handleSortRequest("quantity")}
                >
                  Volumen (m³)
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "medium" }}>
                <TableSortLabel
                  active={sortConfig?.key === "ebkp"}
                  direction={
                    sortConfig?.key === "ebkp" ? sortConfig.direction : "asc"
                  }
                  onClick={() => handleSortRequest("ebkp")}
                >
                  EBKP
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "medium" }}>
                <TableSortLabel
                  active={sortConfig?.key === "impact"}
                  direction={
                    sortConfig?.key === "impact" ? sortConfig.direction : "asc"
                  }
                  onClick={() => handleSortRequest("impact")}
                >
                  {impactLabel} ({impactUnit})
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayElements.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ p: 2 }}
                  >
                    {inputValue || selectedValue
                      ? "Keine Elemente entsprechen Ihrer Suche."
                      : "Keine Elemente vorhanden."}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {displayElements.map((element) => {
              const impactValue = element.impact
                ? element.impact[impactKey]
                : undefined;
              const materialsString = element.materials
                .map((m) => m.name)
                .join(", ");
              const ebkpCode = element.properties?.ebkp_code || "N/A";
              const ebkpName = element.properties?.ebkp_name;
              const ebkpTooltip = ebkpName
                ? `${ebkpCode} - ${ebkpName}`
                : ebkpCode;

              return (
                <TableRow
                  key={element.id}
                  hover
                  selected={selectedValue?.id === element.id}
                >
                  <TableCell
                    sx={{
                      maxWidth: 200,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <Tooltip title={element.element_type} enterDelay={1000}>
                      <span>{element.element_type || "N/A"}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell
                    sx={{
                      maxWidth: 250,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <Tooltip title={materialsString} enterDelay={1000}>
                      <span>{materialsString || "N/A"}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">
                    {formatNumber(element.quantity, 2)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      maxWidth: 100,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <Tooltip title={ebkpTooltip} enterDelay={1000}>
                      <span>{ebkpCode}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">
                    {formatDisplayValue(impactValue, displayMode, ebfNumeric)}
                  </TableCell>
                </TableRow>
              );
            })}
            {processedElements.length > 100 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography variant="body2" color="text.secondary">
                    Zeige 100 von {processedElements.length} Elementen{" "}
                    {inputValue || selectedValue ? "(gefiltert)" : ""}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default ElementImpactTable;
