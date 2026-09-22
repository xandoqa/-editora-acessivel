import { Route, Routes } from "react-router-dom";
import { Topbar } from "./components/Topbar";
import { RequireAuth } from "./components/RequireAuth";
import { CatalogPage } from "./pages/Catalog";
import { WorkDetailPage } from "./pages/WorkDetail";
import { LoginPage } from "./pages/Login";
import { RegisterPage } from "./pages/Register";
import { DashboardPage } from "./pages/Dashboard";
import { SubmitWorkPage } from "./pages/SubmitWork";
import { ReviewStatusPage } from "./pages/ReviewStatus";

export function App() {
  return (
    <div className="app-shell">
      <Routes>
        <Route path="/entrar" element={<LoginPage />} />
        <Route path="/cadastro" element={<RegisterPage />} />
        <Route
          path="*"
          element={
            <>
              <Topbar />
              <Routes>
                <Route path="/" element={<CatalogPage />} />
                <Route path="/obras/:id" element={<WorkDetailPage />} />
                <Route
                  path="/painel"
                  element={
                    <RequireAuth>
                      <DashboardPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/publicar"
                  element={
                    <RequireAuth>
                      <SubmitWorkPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/em-analise/:id"
                  element={
                    <RequireAuth>
                      <ReviewStatusPage />
                    </RequireAuth>
                  }
                />
                <Route path="*" element={<CatalogPage />} />
              </Routes>
            </>
          }
        />
      </Routes>
    </div>
  );
}
