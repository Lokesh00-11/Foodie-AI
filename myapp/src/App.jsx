import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './components/Auth';
import DashboardLayout from './components/DashboardLayout';
import TrackerDashboard from './components/TrackerDashboard';
import InputSection from './components/InputSection';
import ResultPage from './components/ResultPage';
import WorkoutsPage from './components/Workoutspage';
import AICoach from './components/AICoach';
import DashboardHistory from './components/Dashboard';
import ProfilePage from './components/ProfilePage';
import SettingsPage from './components/SettingsPage';
import './App.css';

function App() {
  React.useEffect(() => {
    if (localStorage.getItem('theme') === 'dark') {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <Router>
      <Routes>
        {/* Public authentication route */}
        <Route path="/auth" element={<Auth />} />

        {/* Authenticated workspace with sidebar navigation */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<TrackerDashboard />} />
          <Route path="/inputs" element={<InputSection />} />
          <Route path="/results" element={<ResultPage />} />
          <Route path="/workouts" element={<WorkoutsPage />} />
          <Route path="/coach" element={<AICoach />} />
          <Route path="/history" element={<DashboardHistory />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          
          {/* Legacy redirects */}
          <Route path="/home" element={<Navigate to="/dashboard" replace />} />
        </Route>

        {/* Default fallback redirects to auth */}
        <Route path="/" element={<Navigate to="/auth" replace />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    </Router>
  );
}

export default App;