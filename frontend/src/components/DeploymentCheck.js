import React, { useState } from 'react';
import { Server, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function DeploymentCheck() {
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState([]);

  const addResult = (test, status, message, details = null) => {
    setResults(prev => [...prev, { test, status, message, details, timestamp: new Date().toISOString() }]);
  };

  const checkDeployment = async () => {
    setChecking(true);
    setResults([]);

    const baseURL = api.defaults.baseURL.replace('/api', '');
    
    // Test what's actually deployed
    const testRoutes = [
      { path: '/', name: 'Root Route' },
      { path: '/health', name: 'Health Route' },
      { path: '/api/health', name: 'API Health Route' },
      { path: '/api/excel/test', name: 'Excel Test Route' },
      { path: '/api/excel/template', name: 'Excel Template Route' },
      { path: '/api/auth/test', name: 'Auth Test Route (should 404)' },
      { path: '/api/teachers', name: 'Teachers Route (needs auth)' },
      { path: '/api/nonexistent', name: 'Non-existent Route (should 404)' }
    ];

    for (const route of testRoutes) {
      try {
        const url = route.path.startsWith('/api/') ? `${api.defaults.baseURL}${route.path.replace('/api', '')}` : `${baseURL}${route.path}`;
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Accept': 'application/json,text/csv,*/*'
          }
        });

        if (response.ok) {
          const contentType = response.headers.get('content-type');
          let data;
          
          if (contentType && contentType.includes('application/json')) {
            data = await response.json();
          } else {
            data = await response.text();
          }
          
          addResult(route.name, 'success', `${response.status} ${response.statusText}`, {
            contentType,
            dataPreview: typeof data === 'string' ? data.substring(0, 100) : data
          });
        } else {
          const errorText = await response.text();
          addResult(route.name, 'error', `${response.status} ${response.statusText}`, errorText);
        }
      } catch (error) {
        addResult(route.name, 'error', 'Network error', error.message);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    setChecking(false);
  };

  const forceRedeploy = () => {
    toast.success('To force redeploy: Go to Render dashboard → Services → chronogen-backend → Manual Deploy → Deploy Latest Commit');
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return <CheckCircle size={16} style={{ color: '#16a34a' }} />;
      case 'error': return <AlertTriangle size={16} style={{ color: '#dc2626' }} />;
      default: return <Server size={16} style={{ color: '#6b7280' }} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return '#f0f9ff';
      case 'error': return '#fef2f2';
      default: return '#f8fafc';
    }
  };

  return (
    <div className="card" style={{ margin: '20px 0' }}>
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Server size={20} />
          <span className="card-title">Deployment Verification</span>
        </div>
      </div>
      
      <div style={{ padding: 16 }}>
        <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button 
            className="btn btn-primary" 
            onClick={checkDeployment}
            disabled={checking}
          >
            {checking ? <RefreshCw size={16} className="spinner" /> : <Server size={16} />}
            {checking ? 'Checking...' : 'Check What\'s Deployed'}
          </button>
          
          <button 
            className="btn btn-warning" 
            onClick={forceRedeploy}
          >
            <RefreshCw size={16} /> Force Redeploy Instructions
          </button>
        </div>

        <div style={{ marginBottom: 16, fontSize: '0.9rem', color: '#64748b' }}>
          <strong>Purpose:</strong> This checks what routes are actually deployed on Render, 
          not what's in the code. If routes show 404 but code looks correct, there's a deployment issue.
        </div>

        {results.length > 0 && (
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            <h4 style={{ marginBottom: 12 }}>Deployment Status:</h4>
            
            {results.map((result, index) => (
              <div key={index} style={{
                padding: 12,
                marginBottom: 8,
                borderRadius: 8,
                background: getStatusColor(result.status),
                border: `1px solid ${result.status === 'success' ? '#bae6fd' : '#fecaca'}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  {getStatusIcon(result.status)}
                  <strong>{result.test}</strong>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    {new Date(result.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                
                <div style={{ fontSize: '0.85rem', marginBottom: 4 }}>
                  {result.message}
                </div>
                
                {result.details && (
                  <details style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    <summary style={{ cursor: 'pointer' }}>Response Details</summary>
                    <pre style={{ 
                      background: '#f8fafc', 
                      padding: 8, 
                      borderRadius: 4, 
                      marginTop: 4,
                      overflow: 'auto',
                      maxHeight: 100
                    }}>
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}

        {results.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: 40, 
            color: '#6b7280',
            background: '#f8fafc',
            borderRadius: 8
          }}>
            Click "Check What's Deployed" to verify which routes are actually available on the server
          </div>
        )}
      </div>
    </div>
  );
}