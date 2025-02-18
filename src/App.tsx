import { Routes, Route } from "react-router-dom";
import LCACalculator from "./components/LCACalculator.tsx";
import { useEffect } from "react";
import { Box, Grid } from "@mui/material";

function App(): JSX.Element {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        width: "100%",
      }}
    >
      <Box sx={{ py: 2 }}>
        <Grid container>
          {/* Sidebar */}
          <Grid
            item
            xs={12}
            md={3}
            lg={2.5}
            sx={{
              borderRight: 1,
              borderColor: "divider",
              p: 2,
            }}
          >
            <div id="sidebar"></div>
          </Grid>

          {/* Main Content */}
          <Grid item xs={12} md={9} lg={9.5} sx={{ p: 2 }}>
            <Routes>
              <Route path="/" element={<LCACalculator />} />
            </Routes>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}

export default App;
