import React, { lazy, Suspense, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Key, ShieldAlert } from 'lucide-react';

const InternalSecurityDesk = lazy(() =>
  import('./InternalSecurityDesk').then(m => ({ default: m.InternalSecurityDesk }))
);

export function AdminControlPortal() {
  const { user, isAdmin, systemSettings } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Check if current authenticated user is legitimate admin
  const isAuthorized = isAdmin || user?.role === 'admin';

  if (!isAuthorized) {
    return null; // Totally invisible to all non-admin users
  }

  return (
    <>
      <button 
        id="btn-admin-portal-trigger"
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-between p-3.5 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] rounded-2xl transition-all cursor-pointer active:scale-[0.99]"
      >
        <div className="flex items-center space-x-3 space-x-reverse">
          <div className="w-8 h-8 rounded-xl bg-[#007AFF]/15 flex items-center justify-center text-[#007AFF]">
            <Key className="w-4 h-4" />
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-2 space-x-reverse">
              <span className="text-xs font-bold text-white block">Admin Security Desk</span>
              <span className="px-1.5 py-0.2 bg-[#007AFF]/20 text-[#007AFF] text-[10px] font-semibold rounded-md">
                Admin
              </span>
            </div>
            <span className="text-[11px] text-white/40 block mt-0.5">
              Manage deposits, users, wallets, and system settings
            </span>
          </div>
        </div>
        <div className="w-7 h-7 rounded-full bg-white/[0.05] flex items-center justify-center text-white/50 text-xs">
          ←
        </div>
      </button>

      {/* Internal Security Desk Modal / Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] bg-[#0F0F12]">
          <Suspense fallback={
            <div className="min-h-screen flex flex-col items-center justify-center text-white space-y-3">
              <div className="w-6 h-6 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-white/50">Loading admin portal...</span>
            </div>
          }>
            <InternalSecurityDesk onClose={() => setIsOpen(false)} />
          </Suspense>
        </div>
      )}
    </>
  );
}
