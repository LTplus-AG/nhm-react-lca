import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { HomeIcon } from '@heroicons/react/24/outline'
import LCACalculator from './components/LCACalculator'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-between h-16">
              <div className="flex">
                <Link to="/" className="flex items-center">
                  <HomeIcon className="h-6 w-6 text-gray-600" />
                  <span className="ml-2 text-xl font-semibold">NHM Ökobilanz Material Matching</span>
                </Link>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<LCACalculator />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App