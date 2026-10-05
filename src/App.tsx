/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Layout } from './components/Layout';
import { FastSwap } from './pages/FastSwap';
import { Loans } from './pages/Loans';
import { Assets } from './pages/Assets';
import { Profile } from './pages/Profile';
import { Deposit } from './pages/Deposit';
import { Referral } from './pages/Referral';
import { Spin } from './pages/Spin';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // Direct route navigation support from Telegram bot buttons (e.g. ?route=loans)
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(location.search);
      const targetRoute = searchParams.get('route');
      if (targetRoute && ['loans', 'assets', 'deposit', 'profile', 'referral', 'swap', 'spin'].includes(targetRoute)) {
        if (location.pathname !== `/${targetRoute}`) {
          navigate(`/${targetRoute}${location.search}`, { replace: true });
        }
      }
    } catch {}
  }, [location.search, location.pathname, navigate]);

  useEffect(() => {
    try {
      const tg = (window as any).Telegram?.WebApp;
      if (tg) {
        tg.ready?.();
        tg.expand?.();
        // Method to set Telegram Mini App Header & Background color to pitch black theme (#000000)
        if (typeof tg.setHeaderColor === 'function') {
          tg.setHeaderColor('#000000');
        }
        if (typeof tg.setBackgroundColor === 'function') {
          tg.setBackgroundColor('#000000');
        }
        if (typeof tg.setBottomBarColor === 'function') {
          tg.setBottomBarColor('#000000');
        }
      }
    } catch (e) {
      console.warn("Telegram WebApp color initialization:", e);
    }
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            {/* Primary Entry Point: Fast Swap with 0% Fee */}
            <Route index element={<FastSwap />} />
            <Route path="swap" element={<FastSwap />} />
            <Route path="loans" element={<Loans />} />
            <Route path="assets" element={<Assets />} />
            <Route path="deposit" element={<Deposit />} />
            <Route path="profile" element={<Profile />} />
            <Route path="referral" element={<Referral />} />
            <Route path="spin" element={<Spin />} />
            <Route path="earn" element={<Loans />} />
            <Route path="demo" element={<Loans />} />
            <Route path="explorer" element={<FastSwap />} />
            {/* Catch-all fallback */}
            <Route path="*" element={<FastSwap />} />
          </Route>
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}
