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
import ProtectedRoute from './components/ProtectedRoute';
import AuthRoute from './components/AuthRoute';
import HomePage from './pages/HomePage';
import AddUniversityEntryPage from './pages/AddUniversityEntryPage';
import UniversitiesPage from './pages/UniversitiesPage';
import UniversityDetailPage from './pages/UniversityDetailPage';
import CommunityPage from './pages/CommunityPage';
import NoteDetailPage from './pages/NoteDetailPage';
import OpportunitiesPage from './pages/OpportunitiesPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import CompleteAccountPage from './pages/CompleteAccountPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import RequestUniversityVerifyPage from './pages/RequestUniversityVerifyPage';
import UniversityRequestDetailsPage from './pages/UniversityRequestDetailsPage';
import UniversityRequestSubmittedPage from './pages/UniversityRequestSubmittedPage';
import ProfilePage from './pages/ProfilePage';
import MessagesPage from './pages/MessagesPage';
import NewsPage from './pages/NewsPage';
import AdminUniversityRequestsPage from './pages/AdminUniversityRequestsPage';

function App() {
  return (
    <Routes>
      {/*
        Authentication Routes

        Login, Register, Verify Email, Complete Account, and Password Reset pages don't use
        AppLayout because they have full-screen plasma backgrounds and custom layouts.
        AuthRoute wrapper redirects authenticated users to /community.
      */}
      <Route
        path="/login"
        element={
          <AuthRoute>
            <LoginPage />
          </AuthRoute>
        }
      />
      <Route
        path="/register"
        element={
          <AuthRoute>
            <RegisterPage />
          </AuthRoute>
        }
      />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/complete-account" element={<CompleteAccountPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/*
        University Request Routes

        Multi-step flow for requesting to add a new university:
        1. /add-university - Entry page (collect name/email)
        2. /request-university - Verify email (code sent)
        3. /request-university/details - Enter university and club details
        4. /request-university/submitted - Confirmation page
      */}
      <Route path="/add-university" element={<AddUniversityEntryPage />} />
      <Route path="/request-university" element={<RequestUniversityVerifyPage />} />
      <Route path="/request-university/details" element={<UniversityRequestDetailsPage />} />
      <Route path="/request-university/submitted" element={<UniversityRequestSubmittedPage />} />

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
        <Route path="/notes/:noteId" element={<NoteDetailPage />} />
        <Route path="/universities" element={<UniversitiesPage />} />
        <Route path="/universities/:id" element={<UniversityDetailPage />} />
        <Route path="/opportunities" element={<OpportunitiesPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/users/:userId" element={<ProfilePage />} />
        <Route
          path="/messages"
          element={
            <ProtectedRoute redirectTo="/login">
              <MessagesPage />
            </ProtectedRoute>
          }
        />
        <Route path="/news" element={<NewsPage />} />

        {/* Admin Routes */}
        <Route path="/admin/university-requests" element={<AdminUniversityRequestsPage />} />
      </Route>
    </Routes>
  );
}

export default App;