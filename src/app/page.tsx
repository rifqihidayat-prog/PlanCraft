'use client';

import React, { useState, useEffect } from 'react';
import { 
  ProductSKU, 
  WeeklyProductionPlan, 
  DailyProductionLog, 
  WeeklySummary,
  AuthUser
} from '@/types';
import { 
  getStoredSKUs, 
  saveStoredSKUs, 
  getStoredPlans, 
  saveStoredPlans, 
  getActivePlan, 
  setActivePlanId,
  getStoredLogs, 
  saveStoredLogs, 
  addDailyLog, 
  deleteDailyLog, 
  calculateWeeklySummary 
} from '@/lib/storage';
import { getStoredUser, logoutUser } from '@/lib/auth';
import { Navbar } from '@/components/layout/Navbar';
import { BottomNav, NavTab } from '@/components/layout/BottomNav';
import { SummaryDashboard } from '@/components/dashboard/SummaryDashboard';
import { QuickInputForm } from '@/components/production/QuickInputForm';
import { WeeklyPlanManager } from '@/components/planning/WeeklyPlanManager';
import { WeeklyReport } from '@/components/reports/WeeklyReport';
import { GoogleSheetSync } from '@/components/master/GoogleSheetSync';
import { LoginForm } from '@/components/auth/LoginForm';
import { INITIAL_PLAN, DEFAULT_SKUS, INITIAL_LOGS } from '@/lib/mockData';

export default function HomePage() {
  const [isClientLoaded, setIsClientLoaded] = useState(false);
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isMobileFrame, setIsMobileFrame] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  // Core States
  const [skus, setSkus] = useState<ProductSKU[]>(DEFAULT_SKUS);
  const [plans, setPlans] = useState<WeeklyProductionPlan[]>([INITIAL_PLAN]);
  const [activePlan, setActivePlan] = useState<WeeklyProductionPlan>(INITIAL_PLAN);
  const [selectedWeekFilter, setSelectedWeekFilter] = useState<string>('all');
  const [logs, setLogs] = useState<DailyProductionLog[]>(INITIAL_LOGS);

  // Initialize from storage on mount
  useEffect(() => {
    const loadedSkus = getStoredSKUs();
    const loadedPlans = getStoredPlans();
    const loadedPlan = getActivePlan();
    const loadedLogs = getStoredLogs();
    const loadedUser = getStoredUser();

    setSkus(loadedSkus);
    setPlans(loadedPlans);
    setActivePlan(loadedPlan);
    setLogs(loadedLogs);
    setCurrentUser(loadedUser);
    setIsClientLoaded(true);
  }, []);

  // Proteksi Akses: Tim Produksi tidak boleh mengakses planning atau skus
  useEffect(() => {
    if (currentUser?.role === 'production' && (currentTab === 'planning' || currentTab === 'skus')) {
      setCurrentTab('dashboard');
    }
  }, [currentUser?.role, currentTab]);

  // Handlers
  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
  };

  const handleSaveLog = (newLogData: Omit<DailyProductionLog, 'id' | 'created_at'>) => {
    const created = addDailyLog(newLogData);
    setLogs(prev => [created, ...prev]);
  };

  const handleDeleteLog = (id: string) => {
    deleteDailyLog(id);
    setLogs(prev => prev.filter(l => l.id !== id));
  };

  const handleSavePlan = (updatedPlan: WeeklyProductionPlan) => {
    setActivePlan(updatedPlan);
    setActivePlanId(updatedPlan.id);
    const currentPlans = getStoredPlans();
    const idx = currentPlans.findIndex(p => p.id === updatedPlan.id);
    const newPlans = idx >= 0 
      ? currentPlans.map(p => p.id === updatedPlan.id ? updatedPlan : p)
      : [...currentPlans, updatedPlan];
    setPlans(newPlans);
    saveStoredPlans(newPlans);
  };

  const handleSelectPlan = (plan: WeeklyProductionPlan) => {
    setActivePlan(plan);
    setActivePlanId(plan.id);
  };

  const handleUpdateSKUs = (newSkus: ProductSKU[]) => {
    setSkus(newSkus);
    saveStoredSKUs(newSkus);
  };

  const handleRefresh = () => {
    setSkus(getStoredSKUs());
    setPlans(getStoredPlans());
    setActivePlan(getActivePlan());
    setLogs(getStoredLogs());
  };

  // Calculate summary based on week filter
  const targetPlansForSummary = selectedWeekFilter === 'all'
    ? plans
    : plans.filter(p => p.id === selectedWeekFilter);

  const summary: WeeklySummary = calculateWeeklySummary(
    targetPlansForSummary.length > 0 ? targetPlansForSummary : [activePlan],
    logs
  );

  if (!isClientLoaded) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-500 animate-pulse flex items-center justify-center mb-3">
          <span className="text-xl font-black">PC</span>
        </div>
        <p className="text-sm text-slate-400 font-medium">Memuat PlanCraft Daging Frozen...</p>
      </div>
    );
  }

  // Jika belum login, tampilkan layar Login
  if (!currentUser) {
    return (
      <LoginForm
        onLogin={(user) => {
          setCurrentUser(user);
          setCurrentTab('dashboard');
        }}
      />
    );
  }

  // Content renderer
  const renderTabContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <SummaryDashboard
            plans={plans}
            selectedWeekFilter={selectedWeekFilter}
            onSelectWeekFilter={setSelectedWeekFilter}
            activePlan={activePlan}
            logs={logs}
            summary={summary}
            onNavigateToInput={() => setCurrentTab('input')}
            onNavigateToPlanning={() => setCurrentTab('planning')}
          />
        );
      case 'input':
        return (
          <QuickInputForm
            plan={activePlan}
            skus={skus}
            logs={logs}
            onSaveLog={handleSaveLog}
            onDeleteLog={handleDeleteLog}
          />
        );
      case 'planning':
        return (
          <WeeklyPlanManager
            plan={activePlan}
            skus={skus}
            onSavePlan={handleSavePlan}
          />
        );
      case 'reports':
        return (
          <WeeklyReport
            plan={activePlan}
            logs={logs}
            summary={summary}
          />
        );
      case 'skus':
        return (
          <GoogleSheetSync
            skus={skus}
            onUpdateSKUs={handleUpdateSKUs}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className={`min-h-screen bg-slate-950 flex flex-col ${isMobileFrame ? 'p-0 md:p-6 md:bg-slate-900/60' : ''}`}>
      {/* Wrapper - Either normal responsive or phone frame simulation */}
      <div
        className={`flex-1 flex flex-col mx-auto w-full transition-all duration-300 ${
          isMobileFrame
            ? 'max-w-md bg-slate-950 md:rounded-[40px] md:border-[10px] md:border-slate-800 md:shadow-2xl md:overflow-hidden relative min-h-[844px]'
            : 'max-w-4xl'
        }`}
      >
        {/* Navbar */}
        <Navbar
          activePlan={activePlan}
          plans={plans}
          onSelectPlan={handleSelectPlan}
          currentUser={currentUser}
          isMobileFrame={isMobileFrame}
          setIsMobileFrame={setIsMobileFrame}
          onRefresh={handleRefresh}
          onLogout={handleLogout}
        />

        {/* Main Content Area */}
        <main className="flex-1 px-3.5 sm:px-6 py-4 overflow-y-auto">
          {renderTabContent()}
        </main>

        {/* Bottom Navigation for Mobile */}
        <BottomNav
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          userRole={currentUser.role}
        />
      </div>
    </div>
  );
}
