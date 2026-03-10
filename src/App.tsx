import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Students = lazy(() => import("./pages/students/Students"));
const NewStudent = lazy(() => import("./pages/students/NewStudent"));
const EditStudent = lazy(() => import("./pages/students/EditStudent"));
const Books = lazy(() => import("./pages/books/Books"));
const NewBook = lazy(() => import("./pages/books/NewBook"));
const EditBook = lazy(() => import("./pages/books/EditBook"));
const Loans = lazy(() => import("./pages/loans/Loans"));
const NewLoan = lazy(() => import("./pages/loans/NewLoan"));
const Returns = lazy(() => import("./pages/returns/Returns"));
const Users = lazy(() => import("./pages/admin/Users"));
const NewUser = lazy(() => import("./pages/admin/NewUser"));
const Schools = lazy(() => import("./pages/admin/Schools"));
const NotFound = lazy(() => import("./pages/NotFound"));
const TeachersPage = lazy(() => import("./pages/Teachers"));
const StorytellingPage = lazy(() => import("./pages/Storytelling"));
const StorytellingNew = lazy(() => import("./pages/StorytellingNew"));
const Login = lazy(() => import("./pages/Login"));

const queryClient = new QueryClient();

function PageFallback() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" aria-hidden />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/students" element={<Students />} />
          <Route path="/students/new" element={<NewStudent />} />
          <Route path="/students/edit/:id" element={<EditStudent />} />
          <Route path="/books" element={<Books />} />
          <Route path="/books/new" element={<NewBook />} />
          <Route path="/books/edit/:id" element={<EditBook />} />
          <Route path="/loans" element={<Loans />} />
          <Route path="/loans/new" element={<NewLoan />} />
          <Route path="/returns" element={<Returns />} />
          <Route path="/admin/users" element={<Users />} />
          <Route path="/admin/users/new" element={<NewUser />} />
          <Route path="/admin/schools" element={<Schools />} />
          <Route path="/teachers" element={<TeachersPage />} />
          <Route path="/storytelling" element={<StorytellingPage />} />
          <Route path="/storytelling/new" element={<StorytellingNew />} />
          <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
