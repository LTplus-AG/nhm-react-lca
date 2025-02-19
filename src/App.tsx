import React from "react";
import { Routes, Route } from "react-router-dom";
import LCACalculator from "./components/LCACalculator.tsx";
import { Box, Grid } from "@mui/material";

function App(): JSX.Element {
  React.useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        width: "100%",
        position: "absolute",
        top: "64px",
        left: 0,
        right: 0,
        bottom: 0,
        overflow: "hidden",
      }}
    >
      <Grid
        container
        sx={{
          height: "100%",
        }}
      >
        {/* Sidebar */}
        <Grid
          item
          xs={12}
          md={3}
          lg={2.5}
          sx={{
            borderRight: 1,
            borderColor: "divider",
            position: "fixed",
            top: "64px",
            left: 0,
            bottom: 0,
            width: "inherit",
            bgcolor: "background.default",
            "& #sidebar": {
              height: "100%",
              display: "flex",
              flexDirection: "column",
              p: 2,
              "& > div": {
                flex: 1,
                display: "flex",
                flexDirection: "column",
                "& > div:first-of-type": {
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                },
                "& > div:last-child": {
                  mt: "auto",
                  pt: 3,
                },
              },
            },
          }}
        >
          <div id="sidebar"></div>
        </Grid>

        {/* Main Content */}
        <Grid
          item
          xs={12}
          md={9}
          lg={9.5}
          sx={{
            p: 2,
            height: "calc(100vh - 64px)",
            overflowY: "auto",
            marginLeft: { xs: 0, md: "25%", lg: "20.83333%" },
            position: "relative",
          }}
        >
          <Routes>
            <Route path="/" element={<LCACalculator />} />
          </Routes>
        </Grid>
      </Grid>
    </Box>
  );
}

export default App;
