import React from 'react';
import ReactDOM from 'react-dom/client';
import Tracker from './Tracker.jsx';
import OnboardingGate from './OnboardingGate.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <OnboardingGate>
      <Tracker />
    </OnboardingGate>
  </React.StrictMode>
);
