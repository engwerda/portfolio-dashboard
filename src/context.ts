import { createContext, useContext } from 'react';

export const DarkModeContext = createContext(true);

export function useDarkMode(): boolean {
  return useContext(DarkModeContext);
}
