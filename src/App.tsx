import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { HomeIcon } from "@heroicons/react/24/outline";
import LCACalculator from "./components/LCACalculator.tsx";
import { useEffect } from "react";

function App(): JSX.Element {
  useEffect(() => {
    // Update the dark mode class based on system preference
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // Listen for changes in system dark mode preference
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-background w-full">
        <nav className="bg-card shadow-lg w-full">
          <div className="px-4 w-full">
            <div className="flex justify-between h-16">
              <div className="flex">
                <Link to="/" className="flex items-center">
                  <HomeIcon className="h-6 w-6 text-foreground" />
                  <span className="ml-2 text-xl font-semibold text-foreground">
                    NHMzh Oberfläche "Fachplaner Ökobilanzierung"
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </nav>

        <main className="p-4 w-full">
          <Routes>
            <Route path="/" element={<LCACalculator />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
