import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Phone, Car, ArrowRight, UserPlus } from "lucide-react";
import { motion } from "framer-motion";
import { useDriverLogin } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useSession } from "@/store/use-session";
import { useToast } from "@/hooks/use-toast";

export default function DriverLogin() {
  const [, setLocation] = useLocation();
  const { setMode, setDriverId } = useSession();
  const { toast } = useToast();
  const [phone, setPhone] = useState("");

  const loginMutation = useDriverLogin({
    mutation: {
      onSuccess: (driver) => {
        setMode('driver');
        setDriverId(driver.id);
        toast({ title: `Welcome back, ${driver.name}!` });
        setLocation("/driver/dashboard");
      },
      onError: () => {
        toast({
          title: "Login Failed",
          description: "No driver account found with that phone number. Check the number and try again.",
          variant: "destructive",
        });
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    loginMutation.mutate({ data: { phone: phone.trim() } });
  };

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto w-full"
      >
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/10">
            <Car className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-display font-bold mb-2">Driver Login</h1>
          <p className="text-muted-foreground">Enter your registered phone number to access your dashboard.</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Phone Number"
              icon={<Phone className="w-4 h-4" />}
              type="tel"
              placeholder="+1 (242) 555-0100"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              autoFocus
            />

            <Button type="submit" className="w-full flex justify-between items-center" size="lg" isLoading={loginMutation.isPending}>
              Sign In to Dashboard
              <ArrowRight className="w-5 h-5" />
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-border flex flex-col items-center gap-2">
            <p className="text-sm text-muted-foreground">Don't have an account yet?</p>
            <Link href="/driver/register">
              <Button variant="ghost" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                <UserPlus className="w-4 h-4" />
                Register as a Driver
              </Button>
            </Link>
          </div>
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
