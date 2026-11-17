import React from 'react';
import { GatewayPage } from './components/GatewayPage';
import { StaffDashboard } from './components/StaffDashboard';
import { StudentPortal } from './components/StudentPortal';
import { ToastContainer } from './components/ToastContainer';
import { SiBKProvider, useSiBK } from './context/SiBKContext';

const SiBKRouter: React.FC = () => {
  const { currentStudent, currentStaff } = useSiBK();

  if (currentStudent) {
    return <StudentPortal />;
  }

  if (currentStaff) {
    return <StaffDashboard />;
  }

  return <GatewayPage />;
};

export function App() {
  return (
    <SiBKProvider>
      <SiBKRouter />
      <ToastContainer />
    </SiBKProvider>
  );
}

export default App;
