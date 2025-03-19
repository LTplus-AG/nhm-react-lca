import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ThemeProvider, StyledEngineProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import theme from "./theme";
// Import the CSS directly to ensure it's bundled with the component
import "./index.css";
import "./App.css";

// This version is for federation - it does NOT include a router because the host provides it
const MicrofrontendApp = () => {
  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div style={{ width: "100%", height: "100vh", display: "flex" }}>
          <App />
        </div>
      </ThemeProvider>
    </StyledEngineProvider>
  );
};

// This is used for standalone testing/dev
export const StandaloneApp = () => (
  <StyledEngineProvider injectFirst>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <div style={{ width: "100%", height: "100vh", display: "flex" }}>
          <App />
        </div>
      </BrowserRouter>
    </ThemeProvider>
  </StyledEngineProvider>
);

export default MicrofrontendApp;
