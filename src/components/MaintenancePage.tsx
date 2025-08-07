import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Clock, Wrench } from 'lucide-react';

export default function MaintenancePage() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Optimized: Update every 30 seconds instead of every second to reduce compute usage
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-2xl border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <CardContent className="p-8 text-center space-y-6">
          {/* Animated Icon */}
          <div className="relative mx-auto w-20 h-20 mb-6">
            <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-pulse"></div>
            <div className="relative bg-blue-500 text-white rounded-full w-20 h-20 flex items-center justify-center">
              <Wrench className="w-10 h-10 animate-bounce" />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
              Under Maintenance
            </h1>
            <p className="text-slate-600 dark:text-slate-300 text-lg">
              We're making improvements
            </p>
          </div>

          {/* Description */}
          <div className="space-y-4 text-slate-600 dark:text-slate-400">
            <p>
              Vrno Token Market is currently undergoing scheduled maintenance 
              to enhance your trading experience.
            </p>
            <p className="text-sm">
              We apologize for any inconvenience and appreciate your patience.
            </p>
          </div>

          {/* Time Display */}
          <div className="flex items-center justify-center space-x-2 text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-lg p-3">
            <Clock className="w-4 h-4" />
            <span>Current time: {currentTime.toLocaleString()}</span>
          </div>

          {/* Contact Information */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
              Need immediate assistance?
            </p>
            <div className="space-y-2">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                📧 Email: <span className="font-medium">support@investvrno.com</span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                We'll respond within 24 hours
              </p>
            </div>
          </div>

          {/* Status Indicator */}
          <div className="flex items-center justify-center space-x-2 text-xs text-blue-600 dark:text-blue-400">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span>System maintenance in progress</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}