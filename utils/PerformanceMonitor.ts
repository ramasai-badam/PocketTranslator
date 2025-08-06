// Performance monitoring for translation operations

export class PerformanceMonitor {
  private static metrics: { [key: string]: number[] } = {};

  static startTimer(operation: string): string {
    const timerId = `${operation}_${Date.now()}_${Math.random()}`;
    this.metrics[timerId] = [performance.now()];
    return timerId;
  }

  static endTimer(timerId: string): number {
    if (!this.metrics[timerId]) {
      console.warn(`Timer ${timerId} not found`);
      return 0;
    }

    const duration = performance.now() - this.metrics[timerId][0];
    delete this.metrics[timerId];
    return duration;
  }

  static logMetrics(operation: string, duration: number, metadata?: any) {
    console.log(`📊 Performance: ${operation}`, {
      duration: `${duration.toFixed(2)}ms`,
      ...metadata
    });
  }

  // Helper for timing async operations
  static async timeOperation<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: any
  ): Promise<T> {
    const timerId = this.startTimer(operation);
    try {
      const result = await fn();
      const duration = this.endTimer(timerId);
      this.logMetrics(operation, duration, metadata);
      return result;
    } catch (error) {
      const duration = this.endTimer(timerId);
      this.logMetrics(`${operation} (ERROR)`, duration, { error: String(error), ...metadata });
      throw error;
    }
  }
}

// Usage examples:
// const result = await PerformanceMonitor.timeOperation('whisper_transcription', 
//   () => transcribeAudio(audioFile), { language: 'en', fileSize: '2MB' });
