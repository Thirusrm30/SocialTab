import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { PreferencesProvider } from '@/contexts/PreferencesContext';
import { Auth } from '@/components/Auth';
import { Dashboard } from '@/components/Dashboard';
import { GroupDetails } from '@/components/GroupDetails';
import { Profile } from '@/components/Profile';
import { ExportReports } from '@/components/ExportReports';
import { PaymentDashboard } from '@/components/PaymentDashboard';
import { Toaster } from '@/components/ui/sonner';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  return currentUser ? <>{children}</> : <Navigate to="/login" />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  return !currentUser ? <>{children}</> : <Navigate to="/" />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Auth />
          </PublicRoute>
        }
      />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/group/:groupId"
        element={
          <PrivateRoute>
            <GroupDetails />
          </PrivateRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <PrivateRoute>
            <Profile />
          </PrivateRoute>
        }
      />
      <Route
        path="/export"
        element={
          <PrivateRoute>
            <ExportReports />
          </PrivateRoute>
        }
      />
      <Route
        path="/group/:groupId/pay/:expenseId"
        element={
          <PrivateRoute>
            <PaymentDashboard />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <PreferencesProvider>
        <Router>
          <AppRoutes />
          <Toaster position="top-center" />
        </Router>
      </PreferencesProvider>
    </AuthProvider>
  );
}

export default App;
