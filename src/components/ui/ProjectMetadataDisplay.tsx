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
    if (!timestamp) return "N/A";
    try {
      const utcTimestamp = timestamp.endsWith("Z")
        ? timestamp
        : timestamp + "Z";
      return new Date(utcTimestamp).toLocaleTimeString("de-DE", {
        timeZone: "Europe/Berlin",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      console.error("Error formatting time:", e);
      return "Invalid Time";
    }
  };

  const formattedTimestamp = metadata.upload_timestamp
    ? new Date(
        metadata.upload_timestamp.endsWith("Z")
          ? metadata.upload_timestamp
          : metadata.upload_timestamp + "Z"
      ).toLocaleString("de-DE", {
        timeZone: "Europe/Berlin", // Adjust timezone as needed
        dateStyle: "short",
        timeStyle: "medium",
      })
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
          {timeString !== "N/A" ? ` - Stand: ${timeString}` : ""}
        </Typography>
      </Tooltip>
    </Box>
  );
};

export default ProjectMetadataDisplay;
