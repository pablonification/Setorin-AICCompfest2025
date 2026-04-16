"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardScreen from "../components/dashboard/DashboardScreen";
import HomePageSkeleton from "../components/skeletons/HomePageSkeleton";
import { useAuth } from "../contexts/AuthContext";

export default function DashboardPreviewPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !(token && user)) {
      router.push("/login");
    }
  }, [loading, router, token, user]);

  if (loading || !(token && user)) {
    return <HomePageSkeleton />;
  }

  return <DashboardScreen />;
}
