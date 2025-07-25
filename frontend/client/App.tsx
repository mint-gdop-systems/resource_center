import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";

// Layout
import Layout from "./components/layout/Layout";
// Context
import { FileProvider } from "./contexts/FileContext";
// Error Handling
import ErrorBoundary from "./components/ErrorBoundary";
import { AuthProvider, useAuth } from "./services/auth";

// Pages
import Dashboard from "./pages/Dashboard";
import Files from "./pages/Files";
import Shared from "./pages/Shared";
import Starred from "./pages/Starred";
import Archive from "./pages/Archive";
import Login from "./pages/Login";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <FileProvider>
          <BrowserRouter>
              <div className="App">
                <Routes>
                  <Route element={<Layout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/files/*" element={<ProtectedRoutes><Files /></ProtectedRoutes>} />
                    <Route path="/folders/:folderId" element={<ProtectedRoutes><Files /></ProtectedRoutes>} />
                    <Route path="/shared" element={<ProtectedRoutes><Shared /></ProtectedRoutes>} />
                    <Route path="/starred" element={<ProtectedRoutes><Starred /></ProtectedRoutes>} />
                    <Route path="/archive" element={<ProtectedRoutes><Archive /></ProtectedRoutes>} />
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Route>
                  <Route path="/login" element={<Login />} />
                </Routes>
                {/* Global toast notifications */}
                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    style: {
                      background: "#ffffff",
                      color: "#1f2937",
                      border: "1px solid #e5e7eb",
                      borderRadius: "0.75rem",
                      boxShadow:
                        "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                    },
                    success: {
                      iconTheme: {
                        primary: "#10b981",
                        secondary: "#ffffff",
                      },
                    },
                    error: {
                      iconTheme: {
                        primary: "#ef4444",
                        secondary: "#ffffff",
                      },
                    },
                  }}
                />
              </div>
            </BrowserRouter>
          </FileProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

// Only protect routes that require authentication
function ProtectedRoutes({ children }: { children: JSX.Element }) {
  const { initialized, authenticated, login } = useAuth();
  if (!initialized) return null;
  if (!authenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="bg-white shadow-lg rounded-xl p-8 flex flex-col items-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign In Required</h2>
          <p className="text-gray-600 mb-6 text-center max-w-xs">
            You must be signed in to access this page. Please sign in with your organization account to continue.
          </p>
          <button
            className="inline-flex items-center px-6 py-3 bg-mint-600 text-white text-lg font-semibold rounded-lg shadow-md hover:bg-mint-700 focus:outline-none focus:ring-2 focus:ring-mint-500 transition-colors"
            onClick={login}
          >
            <svg className="h-6 w-6 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12H3m0 0l4-4m-4 4l4 4m13-4a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            Sign In with Keycloak
          </button>
        </div>
      </div>
    );
  }
  return children;
}

export default App;
