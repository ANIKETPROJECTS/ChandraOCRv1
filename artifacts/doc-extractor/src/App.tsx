import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Extract from "@/pages/Extract";
import type { DocumentTypeId } from "@/lib/types";

const queryClient = new QueryClient();

const VALID_TYPES: DocumentTypeId[] = ["form7", "form12", "aadhar", "bank_passbook"];

function ExtractRoute({ params }: { params: { type: string } }) {
  const t = params.type as DocumentTypeId;
  if (!VALID_TYPES.includes(t)) return <NotFound />;
  return <Extract documentType={t} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/extract/:type" component={ExtractRoute} />
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
