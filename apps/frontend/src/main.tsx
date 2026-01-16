import "./index.css";
import "@ant-design/v5-patch-for-react-19";
import "antd/dist/reset.css";
import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { App as AntApp, ConfigProvider, Layout, theme as antdTheme } from "antd";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import Dashboard from "./pages/Dashboard.tsx";
import Login from "./pages/Login.tsx";
import ProjectOverview from "./pages/ProjectOverview.tsx";
import StepEdit from "./pages/StepEdit.tsx";
import ChatTest from "./pages/ChatTest.tsx";
import EventStormingSandbox from "./pages/EventStormingSandbox.tsx";
import TldrawEventStormingSandbox from "./pages/TldrawEventStormingSandbox.tsx";
import { useAuthStore } from "./stores/authStore.ts";
import { GlobalHeader } from "./components/GlobalHeader.tsx";
import { useConfigStore } from "./stores/configStore.ts";

function RequireAuth() {
    const loc = useLocation();
    const token = useAuthStore((s) => s.token);
    if (!token) return <Navigate to="/login" replace state={{ from: loc }} />;
    return <Outlet />;
}

function AppWithTheme() {
    const { resolvedTheme, themeMode, setThemeMode, init } = useConfigStore();

    useEffect(() => {
        init();
    }, [init]);

    const isDark = resolvedTheme === "dark";

    return (
        <ConfigProvider
            theme={{
                algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
                token: {
                    colorPrimary: "#69b1ff",
                    borderRadius: 16,
                    colorBgLayout: isDark ? "#0f0f0f" : "#f5f5f5",
                    colorBgContainer: isDark ? "#1d1d1d" : "#ffffff",
                    colorBorder: isDark ? "#303030" : undefined,
                },
            }}
        >
            <AntApp>
                <BrowserRouter>
                    <Layout
                        style={{
                            minHeight: "100vh",
                            background: isDark ? "#0f0f0f" : undefined,
                        }}
                    >
                        <GlobalHeader
                            isDark={isDark}
                            onToggle={() =>
                                setThemeMode(
                                    themeMode === "system" ? isDark ? "light" : "dark" : themeMode === "dark" ? "light" : "dark",
                                )}
                        />
                        <Layout.Content style={{ background: "transparent" }}>
                            <Routes>
                                <Route element={<RequireAuth />}>
                                    <Route path="/" element={<Dashboard />} />
                                    <Route path="/projects/:id" element={<ProjectOverview />} />
                                    <Route path="/projects/:id/steps/:step" element={<StepEdit />} />
                                    <Route path="/chat" element={<ChatTest />} />
                                    <Route path="/sandbox/eventstorming" element={<EventStormingSandbox />} />
                                    <Route path="/sandbox/tldraw-eventstorming" element={<TldrawEventStormingSandbox />} />
                                </Route>
                                <Route path="/login" element={<Login />} />
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                        </Layout.Content>
                    </Layout>
                </BrowserRouter>
            </AntApp>
        </ConfigProvider>
    );
}

createRoot(document.getElementById("root") as HTMLElement).render(
    <StrictMode>
        <AppWithTheme />
    </StrictMode>,
);
