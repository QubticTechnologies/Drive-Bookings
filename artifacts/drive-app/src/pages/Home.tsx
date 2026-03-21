import { Link, useLocation } from "wouter";
import { Car, User, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useSession } from "@/store/use-session";
import { useEffect } from "react";

export default function Home() {
  const { mode, driverId, activeRideId } = useSession();
  const [, setLocation] = useLocation();

  // Auto-redirect if already in a session
  useEffect(() => {
    if (mode === 'driver' && driverId) {
      setLocation("/driver/dashboard");
    } else if (mode === 'client') {
      if (activeRideId) setLocation(`/client/ride/${activeRideId}`);
      else setLocation("/client/book");
    }
  }, [mode, driverId, activeRideId, setLocation]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[70vh] w-full text-center">
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative mb-16"
        >
          <div className="absolute inset-0 blur-3xl opacity-20 bg-primary rounded-full mix-blend-screen -z-10" />
          <h1 className="text-5xl md:text-7xl font-bold font-display tracking-tighter mb-6">
            Move <span className="text-primary text-glow">Smarter.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            The premium ride-hailing experience. Whether you're behind the wheel or in the backseat.
          </p>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl"
        >
          <motion.div variants={itemVariants}>
            <Card className="h-full flex flex-col justify-between group hover:border-primary/50 transition-colors duration-500 overflow-hidden relative">
              {/* Background accent */}
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
              
              <div className="relative z-10">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6 text-primary border border-white/10 group-hover:scale-110 transition-transform duration-500">
                  <User className="w-8 h-8" />
                </div>
                <h2 className="text-3xl font-display font-bold mb-4">I need a ride</h2>
                <p className="text-muted-foreground mb-8">
                  Book a premium vehicle instantly. Transparent pricing, reliable drivers, exceptional comfort.
                </p>
              </div>
              
              <Link href="/client/book" className="block mt-auto relative z-10">
                <Button className="w-full flex justify-between items-center group/btn" size="lg">
                  Request Ride
                  <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="h-full flex flex-col justify-between group hover:border-white/20 transition-colors duration-500 overflow-hidden relative">
              <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors" />
              
              <div className="relative z-10">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6 text-white border border-white/10 group-hover:scale-110 transition-transform duration-500">
                  <Car className="w-8 h-8" />
                </div>
                <h2 className="text-3xl font-display font-bold mb-4">I want to drive</h2>
                <p className="text-muted-foreground mb-8">
                  Join our elite fleet. Earn more on your schedule with high-quality clientele and instant payouts.
                </p>
              </div>
              
              <Link href="/driver/register" className="block mt-auto relative z-10">
                <Button variant="secondary" className="w-full flex justify-between items-center group/btn" size="lg">
                  Register as Driver
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
