import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Dashboard from "@/pages/Dashboard";
import RepositoryOverview from "@/pages/RepositoryOverview";
import Architecture from "@/pages/Architecture";
import RepoChat from "@/pages/RepoChat";
import Documentation from "@/pages/Documentation";
import Security from "@/pages/Security";
import TechnicalDebt from "@/pages/TechnicalDebt";
import LearningRoadmap from "@/pages/LearningRoadmap";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";
import AppShell from "@/components/layout/AppShell";
import PullRequests from "@/pages/PullRequests";
import CodeReview from "@/pages/CodeReview";
import TestGenerator from "@/pages/TestGenerator";
import KnowledgeGraph from "@/pages/KnowledgeGraph";
import TimeMachine from "@/pages/TimeMachine";
import InterviewGenerator from "@/pages/InterviewGenerator";
import Notifications from "@/pages/Notifications";
import FileExplorer from "@/pages/FileExplorer";
import HealthScore from "@/pages/HealthScore";
import PRReview from "@/pages/PRReview";
import Enterprise from "@/pages/Enterprise";
import Search from "@/pages/Search";
function Protected({
  children
}) {
  const {
    user,
    loading
  } = useAuth();
  if (loading) {
    return <div className="min-h-screen paper flex items-center justify-center">
        <div className="flex items-center gap-3 rounded-full border border-border/70 bg-cream/70 px-5 py-3 text-sm text-muted-foreground">
          <span className="h-2 w-2 animate-pulse rounded-full bg-olive" />
          Loading your workspace…
        </div>
      </div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
export default function App() {
  return <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{
        style: {
          background: "hsl(0 0% 11%)",
          color: "hsl(42 33% 93%)",
          border: "1px solid hsl(0 0% 20%)"
        }
      }} />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route element={<Protected><AppShell /></Protected>}>
            <Route path="/app" element={<Dashboard />} />
            <Route path="/app/enterprise" element={<Enterprise />} />
            <Route path="/app/notifications" element={<Notifications />} />

            <Route path="/app/repo/:id" element={<RepositoryOverview />} />
            <Route path="/app/repo/:id/health" element={<HealthScore />} />
            <Route path="/app/repo/:id/search" element={<Search />} />
            <Route path="/app/repo/:id/explorer" element={<FileExplorer />} />
            <Route path="/app/repo/:id/architecture" element={<Architecture />} />
            <Route path="/app/repo/:id/graph" element={<KnowledgeGraph />} />
            <Route path="/app/repo/:id/timeline" element={<TimeMachine />} />
            <Route path="/app/repo/:id/chat" element={<RepoChat />} />
            <Route path="/app/repo/:id/docs" element={<Documentation />} />
            <Route path="/app/repo/:id/pulls" element={<PullRequests />} />
            <Route path="/app/repo/:id/pr-review" element={<PRReview />} />
            <Route path="/app/repo/:id/review" element={<CodeReview />} />
            <Route path="/app/repo/:id/tests" element={<TestGenerator />} />
            <Route path="/app/repo/:id/security" element={<Security />} />
            <Route path="/app/repo/:id/debt" element={<TechnicalDebt />} />
            <Route path="/app/repo/:id/learn" element={<LearningRoadmap />} />
            <Route path="/app/repo/:id/interview" element={<InterviewGenerator />} />

            <Route path="/app/settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>;
}