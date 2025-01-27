import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import LCACalculator from "./components/LCACalculator.tsx";
import { useEffect } from "react";

function App(): JSX.Element {
  useEffect(() => {
    // Remove dark mode functionality as the site should always be light
    document.documentElement.classList.remove("dark");
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-background w-full">
        <header className="bg-primary w-full h-2" />
        <nav className="bg-white w-full border-b border-border">
          <div className="container mx-auto px-4">
            <div className="flex justify-between h-16">
              <div className="flex items-center space-x-8">
                <Link to="/" className="flex items-center">
                  <img
                    src="/logo.png"
                    alt="Stadt Zürich"
                    className="h-12 w-auto"
                  />
                </Link>
                <span className="text-xl font-semibold text-foreground">
                  NHMzh Oberfläche "Fachplaner Ökobilanzierung"
                </span>
              </div>
            </div>
          </div>
        </nav>

        <main className="container mx-auto p-4">
          <Routes>
            <Route path="/" element={<LCACalculator />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
