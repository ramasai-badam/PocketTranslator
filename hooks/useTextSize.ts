import { useState, useEffect, useCallback } from 'react';
import { SettingsManager, TextSizeId } from '../utils/SettingsManager';

export function useTextSize() {
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

  const updateTextSize = async (newSize: TextSizeId) => {
    try {
      await SettingsManager.setTextSize(newSize);
      setTextSize(newSize);
    } catch (error) {
      console.error('Failed to update text size:', error);
      throw error;
    }
  };

  const getTextSizeConfig = useCallback(() => {
    return SettingsManager.getTextSizeConfig(textSize);
  }, [textSize]);

  const refreshTextSize = useCallback(async () => {
    await loadTextSize();
  }, [loadTextSize]);

  return {
    textSize,
    isLoading,
    updateTextSize,
    getTextSizeConfig,
    refreshTextSize,
  };
}
