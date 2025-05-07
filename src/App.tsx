import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

// Pages
import Dashboard from "./pages/Dashboard";
import Students from "./pages/students/Students";
import NewStudent from "./pages/students/NewStudent";
import EditStudent from "./pages/students/EditStudent";
import Books from "./pages/books/Books";
import NewBook from "./pages/books/NewBook";
import EditBook from "./pages/books/EditBook";
import Loans from "./pages/loans/Loans";
import NewLoan from "./pages/loans/NewLoan";
import Returns from "./pages/returns/Returns";
import Users from "./pages/admin/Users";
import NewUser from "./pages/admin/NewUser";
import Schools from "./pages/admin/Schools";
import NotFound from "./pages/NotFound";
import TeachersPage from "./pages/Teachers";
import StorytellingPage from "./pages/Storytelling";
import StorytellingNew from "./pages/StorytellingNew";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <Routes>
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
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
