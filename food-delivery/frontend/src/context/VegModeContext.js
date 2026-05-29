import React, { createContext, useContext, useEffect, useState } from 'react';

const VegModeContext = createContext();
const STORAGE_KEY = 'ff_veg_mode';

const readInitialVegMode = () => {
  if (typeof window === 'undefined') return false;

  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

export function VegModeProvider({ children }) {
  const [vegMode, setVegMode] = useState(readInitialVegMode);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, vegMode ? '1' : '0');
    } catch {
      // Ignore storage failures and keep the in-memory toggle working.
    }
  }, [vegMode]);

  return (
    <VegModeContext.Provider value={{ vegMode, setVegMode }}>
      {children}
    </VegModeContext.Provider>
  );
}

export const useVegMode = () => useContext(VegModeContext);