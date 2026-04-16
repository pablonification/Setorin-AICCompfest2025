"use client";

import ActionGrid from "../ActionGrid";
import BalanceCard from "../BalanceCard";
import ChatFab from "../ChatFab";
import DashboardHeader from "./DashboardHeader";
import EcoTipsBanner from "./EcoTipsBanner";
import SmartBinSection from "./SmartBinSection";
import WeeklyChallengeCard from "./WeeklyChallengeCard";

export default function DashboardScreen() {
  return (
    <div className="min-h-screen w-full bg-[#f7f9fc] text-slate-900 font-plus-jakarta">
      <div className="mx-auto flex min-h-screen max-w-[430px] flex-col px-5 pb-32 pt-6">
        <div className="space-y-6">
          <DashboardHeader />
          <BalanceCard />
          <ActionGrid />
          <SmartBinSection />
          <WeeklyChallengeCard />
          <EcoTipsBanner />
        </div>
      </div>
      <ChatFab />
    </div>
  );
}
