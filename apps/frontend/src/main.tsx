import "./index.css";
import "antd/dist/reset.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App as AntApp, ConfigProvider } from "antd";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import Dashboard from "./pages/Dashboard.tsx";
import Login from "./pages/Login.tsx";
import { useAuthStore } from "./stores/authStore.ts";

function RequireAuth() {
  const loc = useLocation();
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace state={{ from: loc }} />;
  return <Outlet />;
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#69b1ff",
          borderRadius: 16,
        },
      }}
    >
      <AntApp>
        <BrowserRouter>
          <Routes>
            <Route element={<RequireAuth />}>
              <Route path="/" element={<Dashboard />} />
            </Route>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  </StrictMode>
);
