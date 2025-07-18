import {
  NetworkError,
  ValidationError,
  CacheError,
  DataSyncError,
  ErrorHandler,
  RetryHandler,
  safeAsync,
  withTimeout,
  gracefulDegradation,
  ErrorAggregator
} from '../src/utils/errorHandling';

describe('Error Handling Utilities', () => {
  describe('Custom Error Classes', () => {
    describe('NetworkError', () => {
      it('should create network error with message', () => {
        const error = new NetworkError('Network failed');
        
        expect(error.name).toBe('NetworkError');
        expect(error.message).toBe('Network failed');
        expect(error.isRetryable).toBe(true);
        expect(error.originalError).toBeNull();
      });

      it('should store original error', () => {
        const originalError = new Error('Original');
        const error = new NetworkError('Network failed', originalError);
        
        expect(error.originalError).toBe(originalError);
      });
    });

    describe('ValidationError', () => {
      it('should create validation error with validation errors', () => {
        const validationErrors = ['Field required', 'Invalid format'];
        const error = new ValidationError('Validation failed', validationErrors);
        
        expect(error.name).toBe('ValidationError');
        expect(error.message).toBe('Validation failed');
        expect(error.validationErrors).toEqual(validationErrors);
        expect(error.isRetryable).toBe(false);
      });
    });

    describe('CacheError', () => {
      it('should create cache error', () => {
        const error = new CacheError('Cache failed');
        
        expect(error.name).toBe('CacheError');
        expect(error.message).toBe('Cache failed');
        expect(error.isRetryable).toBe(false);
      });
    });

    describe('DataSyncError', () => {
      it('should create data sync error with attempt count', () => {
        const error = new DataSyncError('Sync failed', 2);
        
        expect(error.name).toBe('DataSyncError');
        expect(error.message).toBe('Sync failed');
        expect(error.syncAttempts).toBe(2);
        expect(error.isRetryable).toBe(true);
      });

      it('should not be retryable after max attempts', () => {
        const error = new DataSyncError('Sync failed', 3);
        
        expect(error.isRetryable).toBe(false);
      });
    });
  });

  describe('ErrorHandler', () => {
    describe('classify', () => {
      it('should classify timeout errors', () => {
        const error = { code: 'ECONNABORTED', message: 'timeout' };
        
        const result = ErrorHandler.classify(error);
        
        expect(result.type).toBe('timeout');
        expect(result.severity).toBe('medium');
        expect(result.isRetryable).toBe(true);
        expect(result.userMessage).toContain('timed out');
      });

      it('should classify network errors', () => {
        const error = { message: 'Network Error' };
        
        const result = ErrorHandler.classify(error);
        
        expect(result.type).toBe('network');
        expect(result.severity).toBe('medium');
        expect(result.isRetryable).toBe(true);
      });

      it('should classify server errors', () => {
        const error = { response: { status: 500 } };
        
        const result = ErrorHandler.classify(error);
        
        expect(result.type).toBe('server');
        expect(result.severity).toBe('high');
        expect(result.isRetryable).toBe(true);
      });

      it('should classify 404 errors', () => {
        const error = { response: { status: 404 } };
        
        const result = ErrorHandler.classify(error);
        
        expect(result.type).toBe('not_found');
        expect(result.severity).toBe('medium');
        expect(result.isRetryable).toBe(false);
      });

      it('should classify custom error types', () => {
        const error = new ValidationError('Invalid data', ['Field required']);
        
        const result = ErrorHandler.classify(error);
        
        expect(result.type).toBe('validation');
        expect(result.severity).toBe('low');
        expect(result.isRetryable).toBe(false);
        expect(result.details).toEqual(['Field required']);
      });

      it('should handle unknown errors', () => {
        const result = ErrorHandler.classify(null);
        
        expect(result.type).toBe('unknown');
        expect(result.severity).toBe('low');
        expect(result.isRetryable).toBe(false);
      });
    });

    describe('createUserFriendlyMessage', () => {
      it('should create user-friendly message', () => {
        const error = new Error('Network timeout');
        error.code = 'ECONNABORTED';
        
        const result = ErrorHandler.createUserFriendlyMessage(error, 'Loading data');
        
        expect(result.message).toContain('Loading data');
        expect(result.message).toContain('timed out');
        expect(result.message).toContain('try again');
        expect(result.isRetryable).toBe(true);
      });
    });

    describe('shouldRetry', () => {
      it('should allow retry for retryable errors', () => {
        const error = new NetworkError('Network failed');
        
        const result = ErrorHandler.shouldRetry(error, 1, 3);
        
        expect(result).toBe(true);
      });

      it('should not retry after max attempts', () => {
        const error = new NetworkError('Network failed');
        
        const result = ErrorHandler.shouldRetry(error, 3, 3);
        
        expect(result).toBe(false);
      });

      it('should not retry non-retryable errors', () => {
        const error = new ValidationError('Invalid data');
        
        const result = ErrorHandler.shouldRetry(error, 1, 3);
        
        expect(result).toBe(false);
      });
    });

    describe('getRetryDelay', () => {
      it('should calculate exponential backoff', () => {
        const delay1 = ErrorHandler.getRetryDelay(0, 1000);
        const delay2 = ErrorHandler.getRetryDelay(1, 1000);
        const delay3 = ErrorHandler.getRetryDelay(2, 1000);
        
        expect(delay1).toBeGreaterThanOrEqual(1000);
        expect(delay2).toBeGreaterThanOrEqual(2000);
        expect(delay3).toBeGreaterThanOrEqual(4000);
        expect(delay3).toBeLessThanOrEqual(30000); // Max delay
      });
    });

    describe('logError', () => {
      it('should log error with context', () => {
        const consoleSpy = jest.spyOn(console, 'group').mockImplementation();
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        const consoleGroupEndSpy = jest.spyOn(console, 'groupEnd').mockImplementation();
        
        const error = new Error('Test error');
        const result = ErrorHandler.logError(error, 'Test context', { extra: 'data' });
        
        expect(result).toHaveProperty('timestamp');
        expect(result).toHaveProperty('context', 'Test context');
        expect(result).toHaveProperty('message', 'Test error');
        expect(result).toHaveProperty('extra', 'data');
        
        consoleSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        consoleGroupEndSpy.mockRestore();
      });
    });
  });

  describe('RetryHandler', () => {
    describe('withRetry', () => {
      it('should succeed on first attempt', async () => {
        const operation = jest.fn().mockResolvedValue('success');
        
        const result = await RetryHandler.withRetry(operation);
        
        expect(result).toBe('success');
        expect(operation).toHaveBeenCalledTimes(1);
      });

      it('should retry on failure and eventually succeed', async () => {
        const operation = jest.fn()
          .mockRejectedValueOnce(new NetworkError('Network failed'))
          .mockRejectedValueOnce(new NetworkError('Network failed'))
          .mockResolvedValueOnce('success');
        
        const result = await RetryHandler.withRetry(operation, { maxAttempts: 3 });
        
        expect(result).toBe('success');
        expect(operation).toHaveBeenCalledTimes(3);
      });

      it('should fail after max attempts', async () => {
        const error = new NetworkError('Persistent failure');
        const operation = jest.fn().mockRejectedValue(error);
        
        await expect(RetryHandler.withRetry(operation, { maxAttempts: 2 })).rejects.toThrow(error);
        expect(operation).toHaveBeenCalledTimes(2);
      });

      it('should not retry non-retryable errors', async () => {
        const error = new ValidationError('Invalid data');
        const operation = jest.fn().mockRejectedValue(error);
        
        await expect(RetryHandler.withRetry(operation)).rejects.toThrow(error);
        expect(operation).toHaveBeenCalledTimes(1);
      });

      it('should call onRetry callback', async () => {
        const operation = jest.fn()
          .mockRejectedValueOnce(new NetworkError('Network failed'))
          .mockResolvedValueOnce('success');
        const onRetry = jest.fn();
        
        await RetryHandler.withRetry(operation, { onRetry });
        
        expect(onRetry).toHaveBeenCalledWith(
          expect.any(NetworkError),
          1,
          expect.any(Number)
        );
      });
    });
  });

  describe('Utility Functions', () => {
    describe('safeAsync', () => {
      it('should return result on success', async () => {
        const operation = async () => 'success';
        
        const result = await safeAsync(operation);
        
        expect(result).toBe('success');
      });

      it('should return fallback on error', async () => {
        const operation = async () => { throw new Error('Failed'); };
        
        const result = await safeAsync(operation, 'fallback');
        
        expect(result).toBe('fallback');
      });

      it('should return null by default', async () => {
        const operation = async () => { throw new Error('Failed'); };
        
        const result = await safeAsync(operation);
        
        expect(result).toBeNull();
      });
    });

    describe('withTimeout', () => {
      it('should resolve if promise completes in time', async () => {
        const promise = Promise.resolve('success');
        
        const result = await withTimeout(promise, 1000);
        
        expect(result).toBe('success');
      });

      it('should reject if promise times out', async () => {
        const promise = new Promise(resolve => setTimeout(() => resolve('late'), 2000));
        
        await expect(withTimeout(promise, 1000)).rejects.toThrow('Operation timed out');
      });

      it('should use custom timeout message', async () => {
        const promise = new Promise(resolve => setTimeout(() => resolve('late'), 2000));
        
        await expect(withTimeout(promise, 1000, 'Custom timeout')).rejects.toThrow('Custom timeout');
      });
    });

    describe('gracefulDegradation', () => {
      it('should return primary result on success', async () => {
        const primary = async () => 'primary';
        const fallback = async () => 'fallback';
        
        const result = await gracefulDegradation(primary, fallback);
        
        expect(result).toBe('primary');
      });

      it('should return fallback result on primary failure', async () => {
        const primary = async () => { throw new Error('Primary failed'); };
        const fallback = async () => 'fallback';
        
        const result = await gracefulDegradation(primary, fallback);
        
        expect(result).toBe('fallback');
      });

      it('should throw if both fail', async () => {
        const primary = async () => { throw new Error('Primary failed'); };
        const fallback = async () => { throw new Error('Fallback failed'); };
        
        await expect(gracefulDegradation(primary, fallback)).rejects.toThrow('Fallback failed');
      });
    });
  });

  describe('ErrorAggregator', () => {
    let aggregator;

    beforeEach(() => {
      aggregator = new ErrorAggregator();
    });

    it('should add errors', () => {
      const error = new Error('Test error');
      aggregator.add(error, 'Test context');
      
      expect(aggregator.hasErrors()).toBe(true);
      expect(aggregator.getErrors()).toHaveLength(1);
    });

    it('should get critical errors', () => {
      const criticalError = { response: { status: 500 } };
      const normalError = new Error('Normal error');
      
      aggregator.add(criticalError, 'Critical');
      aggregator.add(normalError, 'Normal');
      
      const critical = aggregator.getCriticalErrors();
      expect(critical).toHaveLength(1);
    });

    it('should get retryable errors', () => {
      const retryableError = new NetworkError('Network failed');
      const nonRetryableError = new ValidationError('Invalid data');
      
      aggregator.add(retryableError, 'Retryable');
      aggregator.add(nonRetryableError, 'Non-retryable');
      
      const retryable = aggregator.getRetryableErrors();
      expect(retryable).toHaveLength(1);
    });

    it('should provide summary', () => {
      const error1 = new NetworkError('Network failed');
      const error2 = new ValidationError('Invalid data');
      
      aggregator.add(error1, 'Context 1');
      aggregator.add(error2, 'Context 2');
      
      const summary = aggregator.getSummary();
      
      expect(summary.total).toBe(2);
      expect(summary.types).toContain('network');
      expect(summary.types).toContain('validation');
    });

    it('should clear errors', () => {
      aggregator.add(new Error('Test'), 'Context');
      aggregator.clear();
      
      expect(aggregator.hasErrors()).toBe(false);
      expect(aggregator.getErrors()).toHaveLength(0);
    });
  });
});