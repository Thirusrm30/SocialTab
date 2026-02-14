import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserPreferences, saveUserPreferences } from '@/services/firestore';

export type DateFormatOption = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
export type LanguageOption = 'en' | 'es' | 'fr' | 'de' | 'hi';

export interface UserPreferences {
    dateFormat: DateFormatOption;
    language: LanguageOption;
}

const DEFAULT_PREFERENCES: UserPreferences = {
    dateFormat: 'MM/DD/YYYY',
    language: 'en',
};

interface PreferencesContextType {
    preferences: UserPreferences;
    updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
    formatDate: (date: Date) => string;
    loading: boolean;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function usePreferences() {
    const context = useContext(PreferencesContext);
    if (context === undefined) {
        throw new Error('usePreferences must be used within a PreferencesProvider');
    }
    return context;
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
    const { currentUser } = useAuth();
    const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadPreferences() {
            if (!currentUser) {
                setPreferences(DEFAULT_PREFERENCES);
                setLoading(false);
                return;
            }
            try {
                const prefs = await getUserPreferences(currentUser.uid);
                if (prefs) {
                    setPreferences({
                        dateFormat: (prefs.dateFormat as DateFormatOption) || DEFAULT_PREFERENCES.dateFormat,
                        language: (prefs.language as LanguageOption) || DEFAULT_PREFERENCES.language,
                    });
                }
            } catch (error) {
                console.error('Error loading preferences:', error);
            } finally {
                setLoading(false);
            }
        }
        loadPreferences();
    }, [currentUser]);

    const updatePreferences = useCallback(async (prefs: Partial<UserPreferences>) => {
        if (!currentUser) return;
        const newPrefs = { ...preferences, ...prefs };
        setPreferences(newPrefs);
        try {
            await saveUserPreferences(currentUser.uid, newPrefs);
        } catch (error) {
            console.error('Error saving preferences:', error);
        }
    }, [currentUser, preferences]);

    const formatDate = useCallback((date: Date): string => {
        if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
            return 'N/A';
        }

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();

        switch (preferences.dateFormat) {
            case 'DD/MM/YYYY':
                return `${day}/${month}/${year}`;
            case 'MM/DD/YYYY':
                return `${month}/${day}/${year}`;
            case 'YYYY-MM-DD':
                return `${year}-${month}-${day}`;
            default:
                return `${month}/${day}/${year}`;
        }
    }, [preferences.dateFormat]);

    const value = {
        preferences,
        updatePreferences,
        formatDate,
        loading,
    };

    return (
        <PreferencesContext.Provider value={value}>
            {children}
        </PreferencesContext.Provider>
    );
}
