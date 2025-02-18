import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: {
      main: "#0D0599",
    },
    secondary: {
      main: "#98CDFA",
    },
    error: {
      main: "#d32f2f",
    },
    background: {
      default: "#F5F7F9",
      paper: "#ffffff",
    },
    text: {
      primary: "#333333",
      secondary: "#555555",
    },
  },
  typography: {
    fontFamily: "Roboto, Arial, sans-serif",
    h1: {
      fontSize: "2.5rem",
      fontWeight: 600,
    },
    h2: {
      fontSize: "2rem",
      fontWeight: 500,
    },
    h3: {
      fontSize: "2.75rem",
      fontWeight: "lighter",
    },
    body1: {
      fontSize: "1rem",
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: "0.375rem",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: "#ffffff",
          borderRadius: "0.375rem",
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
          minHeight: "48px",
          padding: "12px 16px",
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: "0.375rem",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: "0.375rem",
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "#0D0599",
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: "0.375rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)",
        },
      },
    },
    MuiStepLabel: {
      styleOverrides: {
        label: {
          color: "#333333",
          "&.Mui-active": {
            color: "#0D0599",
          },
        },
      },
    },
  },
});

export default theme;
