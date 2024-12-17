import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { HomeIcon } from "@heroicons/react/24/outline";
import LCACalculator from "./components/LCACalculator.tsx";
import { useEffect } from "react";

function App(): JSX.Element {
  useEffect(() => {
    // Update the dark mode class based on system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Listen for changes in system dark mode preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-background">
        <nav className="bg-card shadow-lg">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-between h-16">
              <div className="flex">
                <Link to="/" className="flex items-center">
                  <HomeIcon className="h-6 w-6 text-foreground" />
                  <span className="ml-2 text-xl font-semibold text-foreground">
                    NHMzh UI Mockup "Fachplaner Ökobilanzierung"
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<LCACalculator />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
