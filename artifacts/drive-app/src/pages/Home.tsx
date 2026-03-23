import { Link, useLocation } from "wouter";
import { Car, User, ArrowRight, Radio, UserPlus } from "lucide-react";
import { motion } from "framer-motion";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useSession } from "@/store/use-session";
import { useEffect } from "react";

export default function Home() {
  const { mode, driverId, activeRideId } = useSession();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (mode === 'driver' && driverId) {
      setLocation("/driver/dashboard");
    } else if (mode === 'client') {
      if (activeRideId) setLocation(`/client/ride/${activeRideId}`);
      else setLocation("/client/book");
    } else if (mode === 'office') {
      setLocation("/office/dashboard");
    }
  }, [mode, driverId, activeRideId, setLocation]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.15 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
  };

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[70vh] w-full text-center">

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative mb-14"
        >
          <div className="absolute inset-0 blur-3xl opacity-20 bg-primary rounded-full mix-blend-screen -z-10" />
          <h1 className="text-5xl md:text-7xl font-bold font-display tracking-tighter mb-6">
            Move <span className="text-primary text-glow">Smarter.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Nassau's premium ride-hailing platform. Fast, safe, transparent.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl"
        >
          {/* Client – Request a Ride */}
          <motion.div variants={itemVariants} className="md:col-span-2">
            <Card className="group hover:border-primary/50 transition-colors duration-500 overflow-hidden relative flex flex-col md:flex-row items-center gap-8">
              <div className="absolute -right-24 -top-24 w-72 h-72 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors pointer-events-none" />
              <div className="relative z-10 text-left flex-1">
                <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mb-5 text-primary border border-white/10 group-hover:scale-110 transition-transform duration-500">
                  <User className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-display font-bold mb-2">Request a Ride</h2>
                <p className="text-muted-foreground text-sm">
                  Book a ride instantly. No account needed — just enter your pickup and drop-off.
                </p>
              </div>
              <div className="relative z-10 w-full md:w-auto">
                <Link href="/client/book">
                  <Button className="w-full md:w-56 flex justify-between items-center group/btn" size="lg">
                    Book Now
                    <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </Card>
          </motion.div>

          {/* Driver Login */}
          <motion.div variants={itemVariants}>
            <Card className="h-full flex flex-col justify-between group hover:border-white/20 transition-colors duration-500 overflow-hidden relative">
              <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors pointer-events-none" />
              <div className="relative z-10">
                <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mb-5 text-white border border-white/10 group-hover:scale-110 transition-transform duration-500">
                  <Car className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-display font-bold mb-2">Driver Login</h2>
                <p className="text-muted-foreground mb-6 text-sm">
                  Already registered? Sign in with your phone number to access your dashboard.
                </p>
              </div>
              <div className="relative z-10 space-y-3">
                <Link href="/driver/login">
                  <Button variant="secondary" className="w-full flex justify-between items-center group/btn" size="lg">
                    Sign In
                    <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href="/driver/register">
                  <Button variant="ghost" className="w-full flex justify-center items-center gap-2 text-muted-foreground hover:text-foreground" size="sm">
                    <UserPlus className="w-4 h-4" />
                    New driver? Register here
                  </Button>
                </Link>
              </div>
            </Card>
          </motion.div>

          {/* Main Office – Admin only */}
          <motion.div variants={itemVariants}>
            <Card className="h-full flex flex-col justify-between group hover:border-amber-400/40 transition-colors duration-500 overflow-hidden relative">
              <div className="absolute right-0 top-0 w-48 h-48 bg-amber-400/5 rounded-full blur-3xl group-hover:bg-amber-400/10 transition-colors pointer-events-none" />
              <div className="relative z-10">
                <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mb-5 text-amber-400 border border-white/10 group-hover:scale-110 transition-transform duration-500">
                  <Radio className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-display font-bold mb-2">Main Office</h2>
                <p className="text-muted-foreground mb-6 text-sm">
                  Admin access only. Dispatch rides and track all drivers live on the map.
                </p>
              </div>
              <Link href="/office/login" className="relative z-10">
                <Button
                  variant="outline"
                  className="w-full flex justify-between items-center group/btn border-amber-400/30 hover:border-amber-400/60 text-amber-400 hover:text-amber-300"
                  size="lg"
                >
                  Admin Login
                  <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </Layout>
  );
}
