import { useAuth } from '../services/auth';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const { initialized, authenticated, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (initialized && authenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [initialized, authenticated, navigate]);

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-500">Loading authentication...</div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <button
          className="btn btn-primary"
          onClick={login}
        >
          Login with Keycloak
        </button>
      </div>
    );
  }

  // Optionally, show a spinner while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-lg text-green-600">Redirecting...</div>
    </div>
  );
}