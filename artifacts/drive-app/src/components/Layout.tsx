import { ReactNode } from "react";
import { useSession } from "@/store/use-session";
import { Link, useLocation } from "wouter";
import { Car, User, LogOut, Navigation, Radio } from "lucide-react";
import { Button } from "./ui/Button";

export function Layout({ children }: { children: ReactNode }) {
  const { mode, logout, clientDetails } = useSession();
  const [, setLocation] = useLocation();

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  const modeLabel = () => {
    if (mode === 'driver') return 'Driver Mode';
    if (mode === 'office') return 'Main Office';
    if (mode === 'client') return clientDetails?.name || 'Client Mode';
    return null;
  };

  const modeIcon = () => {
    if (mode === 'driver') return <Car className="w-4 h-4 text-primary" />;
    if (mode === 'office') return <Radio className="w-4 h-4 text-amber-400" />;
    return <User className="w-4 h-4 text-primary" />;
  };

  return (
    <div className="min-h-screen flex flex-col relative w-full overflow-hidden">
      <div className="absolute inset-0 map-pattern opacity-30 pointer-events-none -z-10" />

      <header className="sticky top-0 z-50 glass-panel border-x-0 border-t-0 rounded-none px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group cursor-pointer">
          <div className="w-10 h-10 bg-primary text-primary-foreground rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
            <Navigation className="w-5 h-5 fill-current" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight">DriveApp</span>
        </Link>

        {mode && (
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-secondary rounded-full border border-white/5">
              {modeIcon()}
              <span className="text-sm font-medium">{modeLabel()}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Switch Mode">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 z-10">
        {children}
      </main>
    </div>
  );
}
