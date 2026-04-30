import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Extract from "@/pages/Extract";
import Profile from "@/pages/Profile";
import type { DocumentTypeId } from "@/lib/types";

const queryClient = new QueryClient();

const VALID_TYPES: DocumentTypeId[] = ["form7", "form12", "form8a", "aadhar", "bank_passbook"];

function ExtractRoute({ params }: { params: { type: string } }) {
  const t = params.type as DocumentTypeId;
  if (!VALID_TYPES.includes(t)) return <NotFound />;
  return <Extract documentType={t} />;
}

function ProfileRoute({ params }: { params: { phone: string } }) {
  const phone = (params.phone ?? "").trim();
  if (!/^[0-9]{7,15}$/.test(phone)) return <NotFound />;
  return <Profile phone={phone} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/extract/:type" component={ExtractRoute} />
      <Route path="/profile/:phone" component={ProfileRoute} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
