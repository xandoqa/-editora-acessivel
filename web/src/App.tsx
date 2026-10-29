import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import RequireAuth from './components/RequireAuth';
import { LoadingState } from './components/ui';
import Catalog from './pages/Catalog';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import NotFound from './pages/NotFound';

// Páginas carregadas sob demanda (o leitor inclui pdf.js/epub.js; a administração só é baixada por admins).
const Reader = lazy(() => import('./pages/Reader'));
const ReaderHome = lazy(() => import('./pages/ReaderHome'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const SubmitWork = lazy(() => import('./pages/SubmitWork'));
const EditWork = lazy(() => import('./pages/EditWork'));
const ReviewList = lazy(() => import('./pages/ReviewList'));
const ReviewStatus = lazy(() => import('./pages/ReviewStatus'));
const Profile = lazy(() => import('./pages/Profile'));
const Apoiar = lazy(() => import('./pages/Apoiar'));
const Biblioteca = lazy(() => import('./pages/Biblioteca'));
const Historico = lazy(() => import('./pages/Historico'));
const Planos = lazy(() => import('./pages/Planos'));
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminWorks = lazy(() => import('./pages/admin/AdminWorks'));
const AdminWorkDetail = lazy(() => import('./pages/admin/AdminWorkDetail'));
const AdminWorkCreate = lazy(() => import('./pages/admin/AdminWorkDetail').then((m) => ({ default: m.AdminWorkCreate })));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminGenres = lazy(() => import('./pages/admin/AdminGenres'));
const AdminFeedbacks = lazy(() => import('./pages/admin/AdminFeedbacks'));
const AdminDonations = lazy(() => import('./pages/admin/AdminDonations'));

/** Compatibilidade com o link antigo /obras/:id. */
function LegacyWorkRedirect() {
  const { id } = useParams();
  return <Navigate to={`/reader/${id}`} replace />;
}

/**
 * Mapa de rotas do front-end:
 *  Públicas ......... /, /reader/:id, /leitor, /apoiar, /login, /register, /forgot-password
 *  Autenticadas ..... /profile
 *  Escritor ......... /dashboard, /submit, /works/:id/edit, /review, /review/:id
 *  Administrativas .. /admin/* (RequireAuth role=ADMIN; a API também exige ADMIN)
 */
export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingState />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          <Route element={<AppLayout />}>
            <Route path="/" element={<Catalog />} />
            <Route path="/reader/:id" element={<Reader />} />
            <Route path="/obras/:id" element={<LegacyWorkRedirect />} />
            <Route path="/leitor" element={<ReaderHome />} />
            {/* Apoio voluntário: aberto a visitantes, inclusive sem conta (seção 17). */}
            <Route path="/apoiar" element={<Apoiar />} />
            {/* A página de planos é pública: quem ainda não tem conta precisa
                conseguir ler o que o plano oferece antes de criar uma. */}
            <Route path="/planos" element={<Planos />} />
            {/* Qualquer conta autenticada */}
            <Route element={<RequireAuth />}>
              <Route path="/profile" element={<Profile />} />
              {/* Biblioteca pessoal: só existe para quem tem conta, porque a
                  aquisição pertence à conta e não ao navegador. */}
              <Route path="/biblioteca" element={<Biblioteca />} />
              <Route path="/historico" element={<Historico />} />
            </Route>
            {/* Área do escritor: leitor é redirecionado para "Meu perfil" */}
            <Route element={<RequireAuth role="ESCRITOR" />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/submit" element={<SubmitWork />} />
              <Route path="/works/:id/edit" element={<EditWork />} />
              <Route path="/review" element={<ReviewList />} />
              <Route path="/review/:id" element={<ReviewStatus />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Route>

          <Route element={<RequireAuth role="ADMIN" />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="works" element={<AdminWorks />} />
              <Route path="works/new" element={<AdminWorkCreate />} />
              <Route path="works/:id" element={<AdminWorkDetail />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="genres" element={<AdminGenres />} />
              <Route path="feedbacks" element={<AdminFeedbacks />} />
              <Route path="donations" element={<AdminDonations />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
