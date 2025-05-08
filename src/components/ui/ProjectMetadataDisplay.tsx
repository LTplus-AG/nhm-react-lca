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
      let dateToFormat: Date;
      const initialDate = new Date(timestamp);

      if (!isNaN(initialDate.getTime())) {
        const isAmbiguousLocal =
          !timestamp.endsWith("Z") &&
          !timestamp.includes("+") &&
          !(
            timestamp.includes("T") &&
            (timestamp.split("T")[1].includes("-") ||
              timestamp.split("T")[1].includes("+"))
          );

        if (isAmbiguousLocal) {
          const utcDate = new Date(timestamp + "Z");
          if (!isNaN(utcDate.getTime())) {
            dateToFormat = utcDate;
          } else {
            console.warn(
              `LCA formatTime: Ambiguous timestamp '${timestamp}' could not be reliably parsed as UTC for Berlin time conversion.`
            );
            return "Invalid Time";
          }
        } else {
          dateToFormat = initialDate;
        }
      } else {
        const utcDate = new Date(timestamp + "Z");
        if (!isNaN(utcDate.getTime())) {
          dateToFormat = utcDate;
        } else {
          console.warn(
            `LCA formatTime: Failed to parse timestamp: '${timestamp}' even with 'Z'.`
          );
          return "Invalid Time";
        }
      }

      return dateToFormat.toLocaleTimeString("de-DE", {
        timeZone: "Europe/Berlin",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      console.error(`LCA formatTime: Error for timestamp '${timestamp}':`, e);
      return "Invalid Time";
    }
  };

  const createFormattedFullTimestampLCA = (timestamp: string): string => {
    if (!timestamp) return "N/A";
    try {
      let dateToFormat: Date;
      const initialDate = new Date(timestamp);

      if (!isNaN(initialDate.getTime())) {
        const isAmbiguousLocal =
          !timestamp.endsWith("Z") &&
          !timestamp.includes("+") &&
          !(
            timestamp.includes("T") &&
            (timestamp.split("T")[1].includes("-") ||
              timestamp.split("T")[1].includes("+"))
          );
        if (isAmbiguousLocal) {
          const utcDate = new Date(timestamp + "Z");
          if (!isNaN(utcDate.getTime())) {
            dateToFormat = utcDate;
          } else {
            console.warn(
              `LCA fullTs: Ambiguous timestamp '${timestamp}' could not be reliably parsed as UTC for Berlin time conversion.`
            );
            return "Invalid Date";
          }
        } else {
          dateToFormat = initialDate;
        }
      } else {
        const utcDate = new Date(timestamp + "Z");
        if (!isNaN(utcDate.getTime())) {
          dateToFormat = utcDate;
        } else {
          console.warn(
            `LCA fullTs: Failed to parse timestamp: '${timestamp}' even with 'Z'.`
          );
          return "Invalid Date";
        }
      }

      return dateToFormat.toLocaleString("de-DE", {
        timeZone: "Europe/Berlin",
        dateStyle: "short",
        timeStyle: "medium",
      });
    } catch (e) {
      console.error(`LCA fullTs: Error for timestamp '${timestamp}':`, e);
      return "Invalid Date";
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
          {timeString !== "N/A" &&
          timeString !== "Invalid Time" &&
          timeString !== "Invalid Date"
            ? ` - Stand: ${timeString}`
            : ""}
        </Typography>
      </Tooltip>
    </Box>
  );
};

export default ProjectMetadataDisplay;
