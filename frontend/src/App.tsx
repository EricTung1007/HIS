import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PatientList from './pages/PatientList';
import PatientDetail from './pages/PatientDetail';
import Settings from './pages/Settings';
import BillingOverview from './pages/BillingOverview';
import MobileSpeak from './pages/MobileSpeak';
import CaretakerTerminal from './pages/CaretakerTerminal';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-500">載入中...</div>;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function IndexRedirect() {
  const { user } = useAuth();
  if (user?.role === 'caretaker') return <Navigate to="/caretaker" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Caretaker no-UI Route */}
          <Route path="/caretaker" element={<PrivateRoute><CaretakerTerminal /></PrivateRoute>} />
          
          {/* Fullscreen MobileSpeak outside of Layout */}
          <Route path="/mobile-speak/:id" element={<PrivateRoute><MobileSpeak /></PrivateRoute>} />

          {/* Main App Layout */}
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<IndexRedirect />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="patients" element={<PatientList />} />
            <Route path="patients/:id" element={<PatientDetail />} />
            <Route path="patients/:id/:tab" element={<PatientDetail />} />
            <Route path="settings" element={<Settings />} />
            <Route path="billing" element={<BillingOverview />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
