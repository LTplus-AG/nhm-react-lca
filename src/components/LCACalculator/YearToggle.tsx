import React from "react";
import { Box, Tooltip, styled } from "@mui/material";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AllInclusiveIcon from "@mui/icons-material/AllInclusive";

interface YearToggleProps {
  showPerYear: boolean;
  onChange: (showPerYear: boolean) => void;
}

// Styled components for toggle
const ToggleContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 20,
  padding: 2,
  width: "fit-content",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  transition: "box-shadow 0.2s ease-in-out",
  "&:hover": {
    boxShadow: "0 2px 5px rgba(0,0,0,0.12)",
  },
}));

const ToggleButton = styled(Box, {
  shouldForwardProp: (prop) => prop !== "active",
})<{ active: boolean }>(({ theme, active }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 16,
  padding: "4px 8px",
  cursor: "pointer",
  transition: "all 0.2s",
  backgroundColor: active ? theme.palette.primary.main : "transparent",
  color: active
    ? theme.palette.primary.contrastText
    : theme.palette.text.secondary,
  "&:hover": {
    backgroundColor: active
      ? theme.palette.primary.main
      : theme.palette.action.hover,
  },
}));

const YearToggle: React.FC<YearToggleProps> = ({ showPerYear, onChange }) => {
  return (
    <ToggleContainer>
      <Tooltip title="Gesamte Ökobilanz anzeigen" arrow placement="top">
        <ToggleButton
          active={!showPerYear}
          onClick={() => onChange(false)}
          sx={{ mr: 0.5 }}
        >
          <AllInclusiveIcon fontSize="small" />
        </ToggleButton>
      </Tooltip>

      <Tooltip
        title="Jährliche Ökobilanz anzeigen (Gesamtwert ÷ 45 Jahre)"
        arrow
        placement="top"
      >
        <ToggleButton active={showPerYear} onClick={() => onChange(true)}>
          <CalendarTodayIcon fontSize="small" />
        </ToggleButton>
      </Tooltip>
    </ToggleContainer>
  );
};

export default YearToggle;
