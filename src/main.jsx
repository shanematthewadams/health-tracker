import React from 'react';
import ReactDOM from 'react-dom/client';
import './global.css';
import Tracker from './Tracker.jsx';
import OnboardingGate from './OnboardingGate.jsx';
import InvitationGate from './InvitationGate.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';
import PrivacyPolicy from './PrivacyPolicy.jsx';
import AdminApp from './AdminApp.jsx';
import AIChangeReview from './components/AIChangeReview.jsx';
import AIConsent from './components/AIConsent.jsx';

const pathname = window.location.pathname.replace(/\/+$/, "");
const isPrivacy = pathname === "/privacy";
const isAdmin = pathname === "/admin";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      {pathname === "/ai/review" ? (
        <AIChangeReview />
      ) : pathname === "/oauth/consent" ? (
        <AIConsent />
      ) : isPrivacy ? (
        <PrivacyPolicy />
      ) : isAdmin ? (
        <AdminApp />
      ) : (
        <InvitationGate>
          <OnboardingGate>
            <Tracker />
          </OnboardingGate>
        </InvitationGate>
      )}
    </ErrorBoundary>
  </React.StrictMode>
);
