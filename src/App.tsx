import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute, AdminRoute } from "@/components/ProtectedRoute";
import ScrollToTop from "@/components/ScrollToTop";
import InstallBanner from "@/components/InstallBanner";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AppHome from "./pages/AppHome";
import ProgramPage from "./pages/ProgramPage";
import LessonPage from "./pages/LessonPage";
import ProfilePage from "./pages/ProfilePage";
import CommunityPage from "./pages/CommunityPage";
import TransformationsPage from "./pages/TransformationsPage";
import MaterialsPage from "./pages/MaterialsPage";
import NutriIAPage from "./pages/NutriIAPage";
import ModulePage from "./pages/ModulePage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminModules from "./pages/admin/AdminModules";
import AdminLessons from "./pages/admin/AdminLessons";
import AdminAssociations from "./pages/admin/AdminAssociations";
import AdminTransformations from "./pages/admin/AdminTransformations";
import AdminMaterials from "./pages/admin/AdminMaterials";
import AdminChallenges from "./pages/admin/AdminChallenges";
import ChallengesPage from "./pages/ChallengesPage";
import ChallengeDetailPage from "./pages/ChallengeDetailPage";
import ChallengeDayPage from "./pages/ChallengeDayPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ScrollToTop />
          <InstallBanner />
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Protected app routes */}
            <Route path="/app" element={<ProtectedRoute><AppHome /></ProtectedRoute>} />
            <Route path="/app/programa/:slug" element={<ProtectedRoute><ProgramPage /></ProtectedRoute>} />
            <Route path="/app/aula/:id" element={<ProtectedRoute><LessonPage /></ProtectedRoute>} />
            <Route path="/app/perfil" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/app/comunidade" element={<ProtectedRoute><CommunityPage /></ProtectedRoute>} />
            <Route path="/app/antes-e-depois" element={<ProtectedRoute><TransformationsPage /></ProtectedRoute>} />
            <Route path="/app/materiais" element={<ProtectedRoute><MaterialsPage /></ProtectedRoute>} />
            <Route path="/app/nutricionista-ia" element={<ProtectedRoute><NutriIAPage /></ProtectedRoute>} />
            <Route path="/app/modulo/:id" element={<ProtectedRoute><ModulePage /></ProtectedRoute>} />
            <Route path="/app/desafios" element={<ProtectedRoute><ChallengesPage /></ProtectedRoute>} />
            <Route path="/app/desafios/:id" element={<ProtectedRoute><ChallengeDetailPage /></ProtectedRoute>} />
            <Route path="/app/desafios/:id/dia/:numero" element={<ProtectedRoute><ChallengeDayPage /></ProtectedRoute>} />

            {/* Admin routes */}
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/produtos" element={<AdminRoute><AdminProducts /></AdminRoute>} />
            <Route path="/admin/modulos" element={<AdminRoute><AdminModules /></AdminRoute>} />
            <Route path="/admin/aulas" element={<AdminRoute><AdminLessons /></AdminRoute>} />
            <Route path="/admin/associacoes" element={<AdminRoute><AdminAssociations /></AdminRoute>} />
            <Route path="/admin/transformacoes" element={<AdminRoute><AdminTransformations /></AdminRoute>} />
            <Route path="/admin/materiais" element={<AdminRoute><AdminMaterials /></AdminRoute>} />
            <Route path="/admin/desafios" element={<AdminRoute><AdminChallenges /></AdminRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;