'use client'
import { redirect } from "next/navigation";
import { getSession } from "next-auth/react";
import { Shield, Users, TrendingUp, Clock } from "lucide-react";
import Hyperspeed from "@/components/shadcnComponents/Hyperspeed";
import { AnimatedCarIcon } from "@/components/icons/animated-car";
import { AnimatedCameraIcon } from "@/components/icons/animated-camera";
import { AnimatedAlertIcon } from "@/components/icons/animated-alert";
import { AnimatedChartIcon } from "@/components/icons/animated-chart";
import { MapPinIcon } from "@/components/icons/map-pin";
import { FeatureCard } from "@/components/landing/feature-card";
import { StatCard } from "@/components/landing/stat-card";
import { FeatureSection } from "@/components/landing/feature-section";
import { FloatingOrbs } from "@/components/landing/floating-orbs";
import { ScrollIndicator } from "@/components/landing/scroll-indicator";
import { HeroButtons } from "@/components/landing/hero-buttons";
import GradualBlur from "@/components/shadcnComponents/GradualBlur";
export default  function Home() {
  let isAuthenticated = false;
  
  // Check authentication status
  try {
    const {data : session} = getSession();
    if (session?.user) {
      isAuthenticated = true;
      // Check if user needs to set up password
      if (session.user.needsPasswordSetup) {
        redirect("/auth/setup-password");
      }
    }
  } catch (error) {
    // Ignore NEXT_REDIRECT errors as they are expected behavior
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }
    console.error("Auth check failed on home page:", error);
    // Continue rendering the page even if auth fails
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="fixed  z-0 w-screen h-screen">
        <GradualBlur
          target="parent"
          position="bottom"
          height="5rem"
          strength={2}
          divCount={5}
          curve="bezier"
          exponential
          opacity={1}
        />
      </div>
      {/* Background Effects */}
      <div className="fixed inset-0 -z-10 pointer-events-none bg-black">
        <Hyperspeed
          effectOptions={{
            distortion: "turbulentDistortion",
            length: 500,
            roadWidth: 10,
            islandWidth: 2,
            lanesPerRoad: 4,
            fov: 90,
            fovSpeedUp: 200,
            speedUp: 3,
            carLightsFade: 0.35,
            totalSideLightSticks: 40,
            lightPairsPerRoadWay: 60,
            shoulderLinesWidthPercentage: 0.06,
            brokenLinesWidthPercentage: 0.12,
            brokenLinesLengthPercentage: 0.55,
            lightStickWidth: [0.2, 0.6],
            lightStickHeight: [1.6, 2.2],
            movingAwaySpeed: [80, 100],
            movingCloserSpeed: [-160, -200],
            carLightsLength: [40, 160],
            carLightsRadius: [0.06, 0.16],
            carWidthPercentage: [0.35, 0.55],
            carShiftX: [-0.8, 0.8],
            carFloorSeparation: [0, 5],
            colors: {
              roadColor: 0x111111,
              islandColor: 0x1a1a1a,
              background: 0x000000,
              shoulderLines: 0xffffff,
              brokenLines: 0xffffff,
              leftCars: [0xff3366, 0xffd166, 0xff3b3b],
              rightCars: [0x33ccff, 0x7cff00, 0x00e5ff],
              sticks: 0xffffff,
            },
          }}
        />
      </div>

      <FloatingOrbs />

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-25 h-25 rounded-2xl shadow-lg mb-6 hover:scale-110 transition-transform">
              <AnimatedCarIcon className="w-25 h-25" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold pb-6  bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-white">
              Smart Parking Management
            </h1>
            <p className="text-xl  text-white/50 font-semibold mb-8 max-w-3xl mx-auto">
              Real-time parking capacity enforcement and monitoring system for
              Municipal Corporations
            </p>
            <HeroButtons isAuthenticated={isAuthenticated} wantSignInButton={true}/>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            <FeatureCard
              icon={<AnimatedCameraIcon size={24} className="text-white" />}
              title="AI Detection"
              description="YOLOv8 powered vehicle detection with license plate recognition"
              iconBgColor="bg-blue-500"
              delay={0}
            />
            <FeatureCard
              icon={<MapPinIcon size={24} className="text-white" />}
              title="Live Tracking"
              description="Real-time occupancy monitoring across all parking facilities"
              iconBgColor="bg-green-500"
              delay={0.1}
            />
            <FeatureCard
              icon={<AnimatedAlertIcon size={24} className="text-white" />}
              title="Smart Alerts"
              description="Automated capacity breach detection and violation tracking"
              iconBgColor="bg-yellow-500"
              delay={0.2}
            />
            <FeatureCard
              icon={<AnimatedChartIcon size={24} className="text-white" />}
              title="Analytics"
              description="Comprehensive insights and contractor performance metrics"
              iconBgColor="bg-purple-500"
              delay={0.3}
            />
          </div>

          <ScrollIndicator />
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-gradient-to-b from-transparent via-gray-900/50 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Complete Parking Management Solution
            </h2>
            <p className="text-xl text-blue-200 max-w-3xl mx-auto">
              Everything you need to monitor, manage, and optimize parking
              operations
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
            {/* Gate Monitoring */}
            <FeatureSection
              icon={<Shield className="w-8 h-8 text-white" />}
              title="Gate Monitoring"
              subtitle="Entry & Exit Control"
              features={[
                "Automatic license plate recognition at gates",
                "Real-time entry/exit logging with timestamps",
                "Vehicle duration tracking and analytics",
                "High-confidence detection with image capture",
              ]}
              bgGradient="from-blue-50 to-indigo-50"
              iconBgColor="bg-blue-600"
              delay={0}
            />

            {/* Lot Monitoring */}
            <FeatureSection
              icon={<MapPinIcon size={32} className="text-white" />}
              title="Lot Monitoring"
              subtitle="Capacity Management"
              features={[
                "Live parking slot occupancy detection",
                "Visual slot grid with real-time updates",
                "Capacity threshold alerts and warnings",
                "Historical occupancy trends and patterns",
              ]}
              bgGradient="from-green-50 to-emerald-50"
              iconBgColor="bg-green-600"
              delay={0.2}
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatCard
              icon={<Clock className="w-8 h-8" />}
              title="Real-time"
              subtitle="Monitoring"
              iconColor="text-blue-400"
              delay={0}
            />
            <StatCard
              icon={<Users className="w-8 h-8" />}
              title="Multi-user"
              subtitle="Access Control"
              iconColor="text-green-400"
              delay={0.1}
            />
            <StatCard
              icon={<TrendingUp className="w-8 h-8" />}
              title="Advanced"
              subtitle="Analytics"
              iconColor="text-purple-400"
              delay={0.2}
            />
            <StatCard
              icon={<Shield className="w-8 h-8" />}
              title="Automated"
              subtitle="Compliance"
              iconColor="text-yellow-400"
              delay={0.3}
            />
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 relative">
        <div className="absolute inset-0" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Parking Management?
          </h2>
          <p className="text-xl text-blue-200 mb-8">
            Join municipal corporations using our smart parking solution
          </p>
          <HeroButtons isAuthenticated={isAuthenticated} />
        </div>
      </div>
    </div>
  );
}
