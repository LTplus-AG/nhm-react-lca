import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";

const MicrofrontendApp = () => {
  return <App />;
};

export const StandaloneApp = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/*" element={<App />} />
    </Routes>
  </BrowserRouter>
);

export default MicrofrontendApp;
