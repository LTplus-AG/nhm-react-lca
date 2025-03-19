import React from "react";
import { Routes, Route } from "react-router-dom";
import LCACalculator from "./components/LCACalculator.tsx";
import { Box } from "@mui/material";
import Header from "./components/ui/Header";
import "./App.css";

function App(): JSX.Element {
  React.useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  return (
    <div className="app-container">
      <Header />
      <Box
        className="content-container"
        sx={{
          height: "calc(100vh - 64px)",
          width: "100vw",
          maxWidth: "100%",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Routes>
          <Route path="/" element={<LCACalculator />} />
        </Routes>
      </Box>
    </div>
  );
}

export default App;
