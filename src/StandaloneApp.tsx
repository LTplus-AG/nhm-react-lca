import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ThemeProvider, StyledEngineProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import theme from "./theme";

// This version is for the host - it does NOT include a router because the host provides it.
const MicrofrontendApp = () => {
  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
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
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </StyledEngineProvider>
);

export default MicrofrontendApp;
