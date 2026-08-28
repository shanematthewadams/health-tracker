import React from 'react';
import ReactDOM from 'react-dom/client';
import Tracker from './Tracker.jsx';
import OnboardingGate from './OnboardingGate.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';
import PrivacyPolicy from './PrivacyPolicy.jsx';

const isPrivacy = window.location.pathname.replace(/\/+$/, "") === "/privacy";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      {isPrivacy ? (
        <PrivacyPolicy />
      ) : (
        <OnboardingGate>
          <Tracker />
        </OnboardingGate>
      )}
    </ErrorBoundary>
  </React.StrictMode>
);
