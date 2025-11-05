import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import ProtectedRoute from '../components/common/ProtectedRoute';
import AdminRoute from '../components/common/AdminRoute';
import RetroCard from '../components/common/RetroCard';
import StatusBadge from '../components/common/StatusBadge';
import Login from '../components/auth/Login';
import Register from '../components/auth/Register';
import Profile from '../components/profile/Profile';
import KYCForm from '../components/kyc/KYCForm';
import DocumentUpload from '../components/kyc/DocumentUpload';

// Simple placeholder pages for vertical slice
const Home = () => (
  <div className="container">
    <RetroCard title="EKYC Portal" subtitle="Retro Edition">
      <p>Welcome to the EKYC portal. Use the navigation to explore.</p>
      <div style={{ marginTop: 12 }}>
        <StatusBadge status="pending" />
        <StatusBadge status="approved" />
        <StatusBadge status="rejected" />
      </div>
    </RetroCard>
  </div>
);

const KycStatus = () => (
  <div className="container">
    <RetroCard title="KYC Status">
      <p>Track the status of your submission.</p>
      <StatusBadge status="pending" />
    </RetroCard>
  </div>
);

const Admin = () => (
  <div className="container">
    <RetroCard title="Admin Dashboard" subtitle="Review Submissions">
      <p>Admin overview goes here.</p>
    </RetroCard>
  </div>
);

const AdminReview = ({ submissionId }) => (
  <div className="container">
    <RetroCard title={`Review Submission #${submissionId}`}>
      <p>Detailed review tools appear here.</p>
    </RetroCard>
  </div>
);

function AdminReviewWrapper() {
  // Use URL params via a tiny wrapper to keep file self-contained
  const id = window.location.pathname.split('/').pop();
  return <AdminReview submissionId={id} />;
}

/**
 * PUBLIC_INTERFACE
 * AppRouter
 * Wraps the app in BrowserRouter and renders public/protected/admin routes.
 */
export default function AppRouter() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/profile" element={<Profile />} />
              <Route path="/kyc/form" element={<KYCForm />} />
              <Route path="/kyc/upload" element={<DocumentUpload />} />
              <Route path="/kyc/status" element={<KycStatus />} />
            </Route>

            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/review/:submissionId" element={<AdminReviewWrapper />} />
            </Route>
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
