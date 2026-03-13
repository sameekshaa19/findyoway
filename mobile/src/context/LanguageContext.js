import { createContext, useState, useContext } from 'react';

const LanguageContext = createContext();

/** Hook — call this in any component to get and set the language */
export const useLanguage = () => useContext(LanguageContext);

/**
 * Wrap App.js with this provider so every screen, component,
 * and service can access the chosen language without prop drilling.
 */
export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('English');

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}
