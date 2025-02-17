import { Routes, Route } from "react-router-dom";
import LCACalculator from "./components/LCACalculator.tsx";
import { useEffect } from "react";
import { Box, Container } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import theme from "./theme";

function App(): JSX.Element {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          minHeight: "100vh",
          backgroundColor: "background.default",
          width: "100%",
        }}
      >
        <Box sx={{ py: 2 }}>
          <Box sx={{ display: "flex", minHeight: "80vh" }}>
            <Box
              component="aside"
              sx={{
                minWidth: "fit-content",
                maxWidth: "240px",
                flexShrink: 0,
                borderRight: 1,
                borderColor: "divider",
                p: 2,
              }}
            >
              {/* Sidebar container for LCACalculator */}
              <div id="sidebar"></div>
            </Box>
            <Box component="main" sx={{ flexGrow: 1, p: 2 }}>
              <Routes>
                <Route path="/" element={<LCACalculator />} />
              </Routes>
            </Box>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
