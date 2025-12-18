import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Navbar } from '@/components/layout/navbar';
import { FileUpload } from '@/components/file-upload';
import { Mascot } from '@/components/mascot';
import { Zap, Search, Layers } from 'lucide-react';
import { motion } from 'framer-motion';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();

  const handleUpload = () => {
    // Simulate upload delay then redirect
    setTimeout(() => {
      navigate({ to: '/dashboard' });
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary/20">
      <Navbar />

      <main className="container mx-auto px-4 pt-20 pb-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column: Text & CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
          >
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/20 text-yellow-700 dark:text-yellow-400 text-xs font-bold uppercase tracking-wide border border-secondary/30">
                <Zap className="w-3 h-3 fill-current" />
                v2.0 AI-Powered Analysis
              </div>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground">
                Deep dive into your{' '}
                <span className="text-transparent bg-clip-text bg-linear-to-r from-primary to-teal-600">
                  bundles
                </span>
                .
              </h1>
              <p className="text-xl text-muted-foreground max-w-lg leading-relaxed">
                Smappy visualizes your web application bundles, identifies
                bloat, and suggests AI-powered optimizations to make your site
                fly.
              </p>
            </div>

            <div className="space-y-6">
              <FileUpload onUpload={handleUpload} />
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Search className="w-4 h-4" /> Import Analysis
                </span>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                <span className="flex items-center gap-1">
                  <Layers className="w-4 h-4" /> Tree Shaking
                </span>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                <span className="flex items-center gap-1">
                  <Zap className="w-4 h-4" /> AI Suggestions
                </span>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Visuals */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            {/* Abstract Background Blobs */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-secondary/20 rounded-full blur-3xl -z-10" />
            <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-primary/10 rounded-full blur-3xl -z-10" />

            {/* Mascot & Interface Mockup */}
            <div className="relative z-10 flex flex-col items-center">
              <Mascot className="w-64 h-64 mb-10 z-20 hover:scale-105 transition-transform duration-300" />

              {/* Mock Card behind mascot */}
              <div className="w-full max-w-md bg-card/80 backdrop-blur-sm border border-border rounded-2xl shadow-2xl p-6 transform -rotate-2 hover:rotate-0 transition-transform duration-500">
                <div className="flex items-center gap-2 mb-4 border-b pb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <div className="ml-auto font-mono text-xs text-muted-foreground">
                    bundle-analyzer.js
                  </div>
                </div>
                <div className="space-y-3 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Size</span>
                    <span className="text-primary font-bold">2.4 MB</span>
                  </div>
                  <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                    <div className="bg-primary w-[70%] h-full" />
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-muted-foreground">Unused Code</span>
                    <span className="text-destructive font-bold">
                      450 KB (18%)
                    </span>
                  </div>
                  <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                    <div className="bg-destructive w-[18%] h-full" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
