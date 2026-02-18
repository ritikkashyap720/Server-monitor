import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, checking } = useAuth();
  const location = useLocation();

  if (checking) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-0 bg-dark-950">
        <div className="text-slate-400 flex items-center gap-3">
          <span className="inline-block w-5 h-5 border-2 border-accent/50 border-t-accent rounded-full animate-spin" />
          Checking auth…
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const redirect = `${location.pathname}${location.search || ''}`;
    return <Navigate to={redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login'} replace />;
  }

  return children;
}
