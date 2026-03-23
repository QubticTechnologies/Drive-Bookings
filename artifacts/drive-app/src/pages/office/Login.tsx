import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Shield, KeyRound, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useSession } from "@/store/use-session";
import { useToast } from "@/hooks/use-toast";

const ADMIN_PIN = "1234";

export default function OfficeLogin() {
  const [, setLocation] = useLocation();
  const { setMode } = useSession();
  const { toast } = useToast();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleDigit = (d: string) => {
    if (pin.length < 4) setPin(prev => prev + d);
  };

  const handleClear = () => {
    setPin("");
    setError(false);
  };

  const handleSubmit = () => {
    if (pin.length !== 4) return;
    setIsLoading(true);
    setTimeout(() => {
      if (pin === ADMIN_PIN) {
        setMode('office');
        toast({ title: "Access Granted", description: "Welcome to Main Office." });
        setLocation("/office/dashboard");
      } else {
        setError(true);
        setPin("");
        setIsLoading(false);
      }
    }, 600);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key >= '0' && e.key <= '9') handleDigit(e.key);
    else if (e.key === 'Backspace') setPin(prev => prev.slice(0, -1));
    else if (e.key === 'Enter') handleSubmit();
  };

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-sm mx-auto w-full"
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-amber-400/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-amber-400/20">
            <Shield className="w-10 h-10 text-amber-400" />
          </div>
          <h1 className="text-3xl font-display font-bold mb-2">Admin Access</h1>
          <p className="text-muted-foreground">Enter the 4-digit PIN to access the Main Office.</p>
        </div>

        <Card className="text-center">
          {/* PIN dots */}
          <div className="flex justify-center gap-4 mb-8">
            {[0, 1, 2, 3].map(i => (
              <motion.div
                key={i}
                animate={error ? { x: [0, -8, 8, -6, 6, 0] } : {}}
                transition={{ duration: 0.4 }}
                className={`w-5 h-5 rounded-full border-2 transition-all duration-200 ${
                  i < pin.length
                    ? error
                      ? 'bg-red-500 border-red-500'
                      : 'bg-amber-400 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                    : 'border-border bg-transparent'
                }`}
              />
            ))}
          </div>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-red-400 text-sm mb-6"
              >
                Incorrect PIN. Please try again.
              </motion.p>
            )}
          </AnimatePresence>

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {['1','2','3','4','5','6','7','8','9'].map(d => (
              <button
                key={d}
                onClick={() => handleDigit(d)}
                className="h-14 rounded-xl bg-secondary hover:bg-secondary/70 active:scale-95 transition-all text-xl font-bold font-display border border-white/5 hover:border-white/15"
              >
                {d}
              </button>
            ))}
            <button
              onClick={handleClear}
              className="h-14 rounded-xl bg-secondary hover:bg-secondary/70 active:scale-95 transition-all text-sm text-muted-foreground border border-white/5 hover:border-white/15"
            >
              Clear
            </button>
            <button
              onClick={() => handleDigit('0')}
              className="h-14 rounded-xl bg-secondary hover:bg-secondary/70 active:scale-95 transition-all text-xl font-bold font-display border border-white/5 hover:border-white/15"
            >
              0
            </button>
            <button
              onClick={() => setPin(p => p.slice(0, -1))}
              className="h-14 rounded-xl bg-secondary hover:bg-secondary/70 active:scale-95 transition-all text-muted-foreground border border-white/5 hover:border-white/15 flex items-center justify-center"
            >
              ⌫
            </button>
          </div>

          <Button
            className="w-full flex justify-between items-center border-amber-400/30 text-amber-400"
            variant="outline"
            size="lg"
            onClick={handleSubmit}
            isLoading={isLoading}
            disabled={pin.length !== 4}
          >
            <span className="flex items-center gap-2">
              <KeyRound className="w-4 h-4" /> Unlock Dashboard
            </span>
            <ArrowRight className="w-5 h-5" />
          </Button>
        </Card>

        <div className="text-center mt-6">
          <Link href="/">
            <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Back to Home
            </button>
          </Link>
        </div>
      </motion.div>
    </Layout>
  );
}
