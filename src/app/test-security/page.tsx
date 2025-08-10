"use client";

import { useState, useEffect } from 'react';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  data?: any;
  error?: string;
}

export default function TestSecurityPage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminKey, setAdminKey] = useState<string>('');

  // Check admin access on component mount
  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      // Try to access monitoring endpoint to check admin status
      const response = await fetch('/api/monitoring');
      if (response.status === 403) {
        setIsAdmin(false);
      } else if (response.status === 200) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    } catch (error) {
      setIsAdmin(false);
    }
  };

  const authenticateAdmin = async () => {
    if (!adminKey.trim()) return;
    
    try {
      const response = await fetch('/api/monitoring', {
        headers: {
          'x-admin-key': adminKey
        }
      });
      
      if (response.status === 200) {
        setIsAdmin(true);
        setAdminKey('');
      } else {
        alert('Invalid admin key');
      }
    } catch (error) {
      alert('Authentication failed');
    }
  };

  // Show admin authentication form if not authenticated
  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md w-full space-y-8 p-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Admin Access Required</h1>
            <p className="text-gray-600 mb-6">This page requires administrative privileges.</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="adminKey" className="block text-sm font-medium text-gray-700 mb-2">
                Admin API Key
              </label>
              <input
                id="adminKey"
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Enter admin key"
              />
            </div>
            
            <button
              onClick={authenticateAdmin}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              Authenticate
            </button>
          </div>
          
          <div className="text-center text-sm text-gray-500">
            <p>Or access with admin_secret query parameter in development</p>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while checking admin status
  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Checking access...</p>
        </div>
      </div>
    );
  }

  const addResult = (name: string, data: any) => {
    setResults(prev => [...prev, { name, status: 'success', data }]);
  };

  const addError = (name: string, error: string) => {
    setResults(prev => [...prev, { name, status: 'error', error }]);
  };

  const clearResults = () => {
    setResults([]);
  };

  const testSecurityHeaders = async () => {
    try {
      const response = await fetch('/api/trending');
      const headers = response.headers;

      const securityHeaders = {
        'X-Frame-Options': headers.get('x-frame-options'),
        'X-Content-Type-Options': headers.get('x-content-type-options'),
        'Referrer-Policy': headers.get('referrer-policy'),
        'X-XSS-Protection': headers.get('x-xss-protection'),
        'Content-Security-Policy': headers.get('content-security-policy')
      };

      addResult('Security Headers Test', {
        headers: securityHeaders,
        allPresent: Object.values(securityHeaders).every(h => h !== undefined)
      });
    } catch (error) {
      addError('Security Headers Test', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const testMonitoring = async () => {
    try {
      // Make a few API calls to generate some monitoring data
      await fetch('/api/trending');
      await fetch('/api/search?q=test');
      await fetch('/api/platforms');

      // Check monitoring endpoint
      const monitoringResponse = await fetch('/api/monitoring');
      const monitoringData = await monitoringResponse.json();

      addResult('Monitoring Test', {
        monitoringEndpoint: monitoringResponse.status === 200 ? 'Working' : 'Failed',
        totalRequests: monitoringData.summary?.api?.totalRequests || 0,
        recentErrors: monitoringData.summary?.errors?.recent || 0,
        performanceData: monitoringData.summary?.performance?.total || 0
      });
    } catch (error) {
      addError('Monitoring Test', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Security & Monitoring Test Suite</h1>
          <p className="text-gray-600">Test the security features and monitoring system</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Controls</h2>
            <div className="space-y-4">
              <button
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                onClick={testSecurityHeaders}
              >
                Test Security Headers
              </button>
              
              <button
                className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                onClick={testMonitoring}
              >
                Test Monitoring
              </button>
              
              <button
                className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
                onClick={clearResults}
              >
                Clear Results
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Access Info</h2>
            <div className="space-y-2 text-sm text-gray-600">
              <p><strong>Status:</strong> <span className="text-green-600">Admin Access Granted</span></p>
              <p><strong>Environment:</strong> {process.env.NODE_ENV || 'development'}</p>
              <p><strong>Access Method:</strong> API Key Authentication</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Test Results</h2>
          </div>
          <div className="p-6">
            {results.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No tests run yet. Click a test button above to get started.</p>
            ) : (
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">{result.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        result.status === 'success' ? 'bg-green-100 text-green-800' :
                        result.status === 'error' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {result.status}
                      </span>
                    </div>
                    
                    {result.data && (
                      <pre className="bg-gray-50 p-3 rounded text-sm overflow-x-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    )}
                    
                    {result.error && (
                      <p className="text-red-600 text-sm">{result.error}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
