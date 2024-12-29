import { describe, beforeEach, afterEach, test, expect, jest } from '@jest/globals'; // v29.x
import axios from 'axios'; // v1.x
import MockAdapter from 'axios-mock-adapter'; // v1.x

import { ApiService } from '../../src/services/api.service';
import {
  API_VERSION,
  API_BASE_URL,
  API_ENDPOINTS,
  API_METHODS,
  HTTP_STATUS
} from '../../src/constants/api';

describe('ApiService', () => {
  let apiService: ApiService;
  let mockAxios: MockAdapter;
  const TEST_ENDPOINT = '/test';
  const MOCK_DATA = { id: 1, name: 'Test' };

  // Mock successful response format
  const mockSuccessResponse = {
    data: MOCK_DATA,
    status: 'success',
    timestamp: new Date().toISOString(),
    metadata: { source: 'test' }
  };

  // Mock error response format
  const mockErrorResponse = {
    message: 'Test error',
    code: 'TEST_ERROR',
    details: { reason: 'test failure' }
  };

  beforeEach(() => {
    apiService = new ApiService();
    mockAxios = new MockAdapter(axios);
    jest.useFakeTimers();
  });

  afterEach(() => {
    mockAxios.reset();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('HTTP Methods', () => {
    test('GET request should handle query parameters correctly', async () => {
      const params = { filter: 'test' };
      mockAxios.onGet(`${API_VERSION}${TEST_ENDPOINT}`).reply(200, mockSuccessResponse);

      const response = await apiService.get(TEST_ENDPOINT, { params });
      
      expect(response.data).toEqual(MOCK_DATA);
      expect(response.status).toBe('success');
      expect(response.timestamp).toBeDefined();
      expect(mockAxios.history.get[0].params).toEqual(params);
    });

    test('POST request should send data in request body', async () => {
      mockAxios.onPost(`${API_VERSION}${TEST_ENDPOINT}`).reply(201, mockSuccessResponse);

      const response = await apiService.post(TEST_ENDPOINT, MOCK_DATA);
      
      expect(response.data).toEqual(MOCK_DATA);
      expect(mockAxios.history.post[0].data).toBe(JSON.stringify(MOCK_DATA));
    });

    test('PUT request should update existing resource', async () => {
      mockAxios.onPut(`${API_VERSION}${TEST_ENDPOINT}`).reply(200, mockSuccessResponse);

      const response = await apiService.put(TEST_ENDPOINT, MOCK_DATA);
      
      expect(response.data).toEqual(MOCK_DATA);
      expect(mockAxios.history.put[0].data).toBe(JSON.stringify(MOCK_DATA));
    });

    test('DELETE request should remove resource', async () => {
      mockAxios.onDelete(`${API_VERSION}${TEST_ENDPOINT}`).reply(200, mockSuccessResponse);

      const response = await apiService.delete(TEST_ENDPOINT);
      
      expect(response.status).toBe('success');
      expect(mockAxios.history.delete[0].url).toContain(TEST_ENDPOINT);
    });
  });

  describe('Authentication', () => {
    const mockToken = 'test-token';
    const mockCsrfToken = 'csrf-token';

    beforeEach(() => {
      // Mock CSRF token meta tag
      const metaElement = document.createElement('meta');
      metaElement.setAttribute('name', 'csrf-token');
      metaElement.setAttribute('content', mockCsrfToken);
      document.head.appendChild(metaElement);
    });

    test('should include authentication headers in requests', async () => {
      mockAxios.onGet(`${API_VERSION}${TEST_ENDPOINT}`).reply(200, mockSuccessResponse);

      await apiService.get(TEST_ENDPOINT);
      
      const headers = mockAxios.history.get[0].headers;
      expect(headers['X-CSRF-Token']).toBe(mockCsrfToken);
      expect(headers['X-Request-ID']).toBeDefined();
      expect(headers['X-Request-Timestamp']).toBeDefined();
    });

    test('should handle unauthorized responses', async () => {
      mockAxios.onGet(`${API_VERSION}${TEST_ENDPOINT}`).reply(401, {
        message: 'Unauthorized',
        code: 'UNAUTHORIZED'
      });

      await expect(apiService.get(TEST_ENDPOINT)).rejects.toThrow('Unauthorized');
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      mockAxios.onGet(`${API_VERSION}${TEST_ENDPOINT}`).networkError();

      await expect(apiService.get(TEST_ENDPOINT)).rejects.toThrow('Network error occurred');
    });

    test('should handle timeout errors', async () => {
      mockAxios.onGet(`${API_VERSION}${TEST_ENDPOINT}`).timeout();

      await expect(apiService.get(TEST_ENDPOINT)).rejects.toThrow();
    });

    test('should handle rate limiting', async () => {
      mockAxios.onGet(`${API_VERSION}${TEST_ENDPOINT}`).reply(429, {
        message: 'Too Many Requests',
        code: 'RATE_LIMITED'
      });

      await expect(apiService.get(TEST_ENDPOINT)).rejects.toThrow('Too Many Requests');
    });

    test('should implement retry logic for 5xx errors', async () => {
      let attempts = 0;
      mockAxios.onGet(`${API_VERSION}${TEST_ENDPOINT}`).reply(() => {
        attempts++;
        return attempts < 3 ? [500, mockErrorResponse] : [200, mockSuccessResponse];
      });

      const response = await apiService.get(TEST_ENDPOINT);
      expect(attempts).toBe(3);
      expect(response.data).toEqual(MOCK_DATA);
    });
  });

  describe('Response Caching', () => {
    test('should cache GET requests', async () => {
      mockAxios.onGet(`${API_VERSION}${TEST_ENDPOINT}`).reply(200, mockSuccessResponse);

      const response1 = await apiService.get(TEST_ENDPOINT, { cache: true });
      const response2 = await apiService.get(TEST_ENDPOINT, { cache: true });

      expect(mockAxios.history.get.length).toBe(1);
      expect(response1).toEqual(response2);
    });

    test('should bypass cache when specified', async () => {
      mockAxios.onGet(`${API_VERSION}${TEST_ENDPOINT}`).reply(200, mockSuccessResponse);

      await apiService.get(TEST_ENDPOINT, { cache: false });
      await apiService.get(TEST_ENDPOINT, { cache: false });

      expect(mockAxios.history.get.length).toBe(2);
    });
  });

  describe('Circuit Breaker', () => {
    test('should open circuit after threshold failures', async () => {
      mockAxios.onGet(`${API_VERSION}${TEST_ENDPOINT}`).reply(500, mockErrorResponse);

      for (let i = 0; i < 5; i++) {
        await expect(apiService.get(TEST_ENDPOINT)).rejects.toThrow();
      }

      await expect(apiService.get(TEST_ENDPOINT)).rejects.toThrow('Service temporarily unavailable');
    });

    test('should reset circuit after timeout', async () => {
      mockAxios.onGet(`${API_VERSION}${TEST_ENDPOINT}`)
        .reply(500, mockErrorResponse)
        .onGet(`${API_VERSION}${TEST_ENDPOINT}`)
        .reply(200, mockSuccessResponse);

      // Trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        await expect(apiService.get(TEST_ENDPOINT)).rejects.toThrow();
      }

      // Advance timer past reset timeout
      jest.advanceTimersByTime(60000);

      const response = await apiService.get(TEST_ENDPOINT);
      expect(response.data).toEqual(MOCK_DATA);
    });
  });

  describe('Request Queue', () => {
    test('should queue concurrent requests to same endpoint', async () => {
      mockAxios.onGet(`${API_VERSION}${TEST_ENDPOINT}`).reply(200, mockSuccessResponse);

      const requests = Array(3).fill(null).map(() => apiService.get(TEST_ENDPOINT));
      const responses = await Promise.all(requests);

      expect(mockAxios.history.get.length).toBe(1);
      responses.forEach(response => {
        expect(response.data).toEqual(MOCK_DATA);
      });
    });
  });
});