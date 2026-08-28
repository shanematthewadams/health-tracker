import React from 'react';
import ReactDOM from 'react-dom/client';
import Tracker from './Tracker.jsx';
import OnboardingGate from './OnboardingGate.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <OnboardingGate>
        <Tracker />
      </OnboardingGate>
    </ErrorBoundary>
  </React.StrictMode>
);
