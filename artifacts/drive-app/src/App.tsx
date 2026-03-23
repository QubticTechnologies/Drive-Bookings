import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Home from "@/pages/Home";
import DriverRegistration from "@/pages/driver/Register";
import DriverLogin from "@/pages/driver/Login";
import DriverDashboard from "@/pages/driver/Dashboard";
import ClientBook from "@/pages/client/Book";
import ClientRideTracker from "@/pages/client/Tracker";
import Invoice from "@/pages/shared/Invoice";
import OfficeDashboard from "@/pages/office/Dashboard";
import OfficeLogin from "@/pages/office/Login";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/driver/register" component={DriverRegistration} />
      <Route path="/driver/login" component={DriverLogin} />
      <Route path="/driver/dashboard" component={DriverDashboard} />
      <Route path="/client/book" component={ClientBook} />
      <Route path="/client/ride/:id" component={ClientRideTracker} />
      <Route path="/bill/:id" component={Invoice} />
      <Route path="/office/login" component={OfficeLogin} />
      <Route path="/office/dashboard" component={OfficeDashboard} />
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
