/**
 * App Component
 *
 * Main application component that sets up routing for all pages.
 * Uses React Router for client-side navigation.
 *
 * Route Structure:
 * - Authentication pages (login, register, verify-email) - No layout
 * - Landing page (/) - No layout (standalone landing page for non-authenticated users)
 * - Application pages - Wrapped in AppLayout with navigation bar
 */

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import HomePage from './pages/HomePage';
import AddUniversityPage from './pages/AddUniversityPage';
import UniversitiesPage from './pages/UniversitiesPage';
import UniversityDetailPage from './pages/UniversityDetailPage';
import CommunityPage from './pages/CommunityPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ProfilePage from './pages/ProfilePage';
import MessagesPage from './pages/MessagesPage';

function App() {
  return (
    <Routes>
      {/*
        Authentication Routes

        Login, Register, and Verify Email pages don't use AppLayout because
        they have full-screen plasma backgrounds and custom layouts.
      */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />

      {/*
        Landing Page Route

        HomePage acts as the landing page for non-authenticated users.
        It doesn't use AppLayout because it needs a custom design without nav bar.
        Authenticated users are automatically redirected to /community.
      */}
      <Route path="/" element={<HomePage />} />

      {/*
        Main Application Routes

        These routes use AppLayout which includes navigation bar.
        Only accessible to authenticated users (protected in individual pages).
      */}
      <Route element={<AppLayout />}>
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/universities" element={<UniversitiesPage />} />
        <Route path="/universities/new" element={<AddUniversityPage />} />
        <Route path="/universities/:id" element={<UniversityDetailPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/users/:userId" element={<ProfilePage />} />
        <Route path="/messages" element={<MessagesPage />} />
        {/* As you convert more templates, add routes here */}
      </Route>
    </Routes>
  );
}

export default App;