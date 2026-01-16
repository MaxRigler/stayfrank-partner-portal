import { createContext, useContext, useState, ReactNode } from 'react';

interface WizardContextType {
  isWizardActive: boolean;
  setWizardActive: (active: boolean) => void;
}

const WizardContext = createContext<WizardContextType | undefined>(undefined);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [isWizardActive, setWizardActive] = useState(false);

  return (
    <WizardContext.Provider value={{ isWizardActive, setWizardActive }}>
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  const context = useContext(WizardContext);
  if (context === undefined) {
    throw new Error('useWizard must be used within a WizardProvider');
  }
  return context;
}
