import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SettingsManager, TextSizeId } from '../utils/SettingsManager';

interface TextSizeContextType {
  textSize: TextSizeId;
  isLoading: boolean;
  updateTextSize: (newSize: TextSizeId) => Promise<void>;
  getTextSizeConfig: () => { id: TextSizeId; label: string; fontSize: number; lineHeight: number };
  refreshTextSize: () => Promise<void>;
}

const TextSizeContext = createContext<TextSizeContextType | undefined>(undefined);

export function TextSizeProvider({ children }: { children: React.ReactNode }) {
  const [textSize, setTextSize] = useState<TextSizeId>('large');
  const [isLoading, setIsLoading] = useState(true);

  const loadTextSize = useCallback(async () => {
    try {
      const savedTextSize = await SettingsManager.getTextSize();
      setTextSize(savedTextSize);
    } catch (error) {
      console.error('Failed to load text size:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTextSize();
  }, [loadTextSize]);

  const updateTextSize = useCallback(async (newSize: TextSizeId) => {
    try {
      await SettingsManager.setTextSize(newSize);
      setTextSize(newSize);
    } catch (error) {
      console.error('Failed to update text size:', error);
      throw error;
    }
  }, []);

  const getTextSizeConfig = useCallback(() => {
    return SettingsManager.getTextSizeConfig(textSize);
  }, [textSize]);

  const refreshTextSize = useCallback(async () => {
    await loadTextSize();
  }, [loadTextSize]);

  const value = {
    textSize,
    isLoading,
    updateTextSize,
    getTextSizeConfig,
    refreshTextSize,
  };

  return (
    <TextSizeContext.Provider value={value}>
      {children}
    </TextSizeContext.Provider>
  );
}

export function useTextSize(): TextSizeContextType {
  const context = useContext(TextSizeContext);
  if (context === undefined) {
    throw new Error('useTextSize must be used within a TextSizeProvider');
  }
  return context;
}
