import React from "react";
import { Box, Tooltip, Typography, CircularProgress } from "@mui/material";

interface ProjectMetadata {
  filename: string;
  upload_timestamp: string;
  element_count?: number;
}

interface ProjectMetadataDisplayProps {
  metadata: ProjectMetadata | null;
  loading: boolean;
  initialLoading: boolean; // Added to prevent showing 'No metadata' during initial load
  selectedProject: boolean; // Added to know if a project is selected
}

const ProjectMetadataDisplay: React.FC<ProjectMetadataDisplayProps> = ({
  metadata,
  loading,
  initialLoading,
  selectedProject,
}) => {
  // Helper function for robust date parsing, similar to plugin-cost
  const getValidatedDateObject = (timestamp: string): Date | null => {
    if (!timestamp) return null;

    let date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
      return date;
    }

    const adjustedTimestamp =
      timestamp.endsWith("Z") || timestamp.includes("+")
        ? timestamp
        : timestamp + "Z";

    const adjustedDate = new Date(adjustedTimestamp);
    if (!isNaN(adjustedDate.getTime())) {
      return adjustedDate;
    }

    return null; // Indicates parsing failed
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          mt: 1,
          height: "20px",
        }}
      >
        <CircularProgress
          size={16}
          thickness={5}
          sx={{ color: "text.secondary" }}
        />
        <Typography variant="caption" color="text.secondary">
          Lade Metadaten...
        </Typography>
      </Box>
    );
  }

  if (!selectedProject || initialLoading) {
    // Don't show anything if no project is selected yet or during initial data fetch
    return <Box sx={{ height: "20px", mt: 1 }} />; // Keep space consistent
  }

  if (!metadata) {
    return (
      <Box sx={{ mt: 1, height: "20px" }}>
        <Typography variant="body2" color="text.secondary">
          Keine Metadaten verfügbar.
        </Typography>
      </Box>
    );
  }

  const formatTime = (timestamp: string): string => {
    if (!timestamp) return "N/A"; // Handle empty input string explicitly
    const date = getValidatedDateObject(timestamp);

    if (!date) {
      return "Invalid Time"; // Parsing failed for a non-empty string
    }

    try {
      return date.toLocaleTimeString("de-DE", {
        timeZone: "Europe/Berlin",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      console.error("Error formatting time in formatTime (LCA):", e);
      return "Invalid Time"; // Fallback error string
    }
  };

  const createFormattedFullTimestampLCA = (timestamp: string): string => {
    if (!timestamp) return "N/A";
    const date = getValidatedDateObject(timestamp);

    if (!date) {
      return "Invalid Date"; // Consistent with plugin-cost for failed parse
    }

    try {
      return date.toLocaleString("de-DE", {
        timeZone: "Europe/Berlin",
        dateStyle: "short",
        timeStyle: "medium",
      });
    } catch (e) {
      console.error("Error formatting full timestamp (LCA):", e);
      return "Invalid Date"; // Fallback error string
    }
  };

  const formattedTimestamp = metadata.upload_timestamp
    ? createFormattedFullTimestampLCA(metadata.upload_timestamp)
    : "N/A";

  const timeString = formatTime(metadata.upload_timestamp);

  const tooltipTitle = `Datei: ${metadata.filename} | Elemente: ${
    metadata.element_count ?? "N/A"
  } | Hochgeladen: ${formattedTimestamp}`;

  return (
    <Box
      sx={{
        mt: 1,
        display: "flex",
        alignItems: "center",
        gap: 1,
        minWidth: 0,
        height: "20px",
      }}
    >
      <Tooltip title={tooltipTitle}>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            fontStyle: "italic",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "100%", // Ensure it doesn't overflow container
          }}
        >
          {metadata.filename} ({metadata.element_count ?? "-"} Elemente)
          {timeString !== "N/A" && timeString !== "Invalid Time"
            ? ` - Stand: ${timeString}`
            : ""}
        </Typography>
      </Tooltip>
    </Box>
  );
};

export default ProjectMetadataDisplay;
