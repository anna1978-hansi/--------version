import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import App from "./App";
import { HomePage } from "./pages/HomePage";
import { DetailPage } from "./pages/DetailPage";
import { WorkspacePage } from "./pages/WorkspacePage";
import { MemoPage } from "./pages/MemoPage";
import { DashboardProvider } from "./providers/DashboardProvider";
import { routePaths } from "./routes";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <DashboardProvider>
        <Routes>
          <Route path={routePaths.home} element={<App />}>
            <Route index element={<HomePage />} />
            <Route path="homepage" element={<Navigate replace to={routePaths.home} />} />
            <Route path="detail" element={<DetailPage />} />
            <Route path="workspace" element={<Navigate replace to={routePaths.detail} />} />
            <Route path="workspace/:sessionKey" element={<WorkspacePage />} />
            <Route path="memo" element={<MemoPage />} />
          </Route>
          <Route path="*" element={<Navigate replace to={routePaths.home} />} />
        </Routes>
      </DashboardProvider>
    </HashRouter>
  </React.StrictMode>
);
