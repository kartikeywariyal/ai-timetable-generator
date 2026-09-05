import React, { useState } from 'react';
import { Download, Upload, CheckCircle, AlertTriangle } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function ExcelTest() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState([]);

  const addResult = (test, status, message) => {
    setResults(prev => [...prev, { test, status, message, timestamp: new Date().toISOString() }]);
  };

  const testExcelRoutes = async () => {
    setTesting(true);
    setResults([]);

    // Test 1: Excel test route (original)
    try {
      const response = await api.get('/excel/test');
      addResult('Excel Test Route (Original)', 'success', `Response: ${response.data.message}`);
    } catch (error) {
      addResult('Excel Test Route (Original)', 'error', `Failed: ${error.response?.status} ${error.message}`);
    }

    // Test 1b: Excel test route (via auth - backup)
    try {
      const response = await api.get('/auth/excel-test');
      addResult('Excel Test Route (Via Auth)', 'success', `Response: ${response.data.message}`);
    } catch (error) {
      addResult('Excel Test Route (Via Auth)', 'error', `Failed: ${error.response?.status} ${error.message}`);
    }

    // Test 2: Template download (original)
    try {
      const response = await api.get('/excel/template', { responseType: 'blob' });
      addResult('Template Download (Original)', 'success', `Downloaded ${response.data.size} bytes`);
      
      // Actually download the file
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'test-template.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Template downloaded successfully!');
    } catch (error) {
      addResult('Template Download (Original)', 'error', `Failed: ${error.response?.status} ${error.message}`);
      
      // Try backup route
      try {
        const response = await api.get('/auth/excel-template', { responseType: 'blob' });
        addResult('Template Download (Via Auth)', 'success', `Downloaded ${response.data.size} bytes`);
        
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'test-template-auth.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        toast.success('Template downloaded via auth route!');
      } catch (authError) {
        addResult('Template Download (Via Auth)', 'error', `Failed: ${authError.response?.status} ${authError.message}`);
      }
    }

    // Test 3: Upload route (original)
    try {
      const response = await api.post('/excel/upload', { test: 'data' });
      addResult('Upload Route (Original)', 'success', `Response: ${response.data.message}`);
    } catch (error) {
      addResult('Upload Route (Original)', 'error', `Failed: ${error.response?.status} ${error.message}`);
      
      // Try backup route
      try {
        const response = await api.post('/auth/excel-upload', { test: 'data' });
        addResult('Upload Route (Via Auth)', 'success', `Response: ${response.data.message}`);
      } catch (authError) {
        addResult('Upload Route (Via Auth)', 'error', `Failed: ${authError.response?.status} ${authError.message}`);
      }
    }

    setTesting(false);
  };

  const getStatusIcon = (status) => {
    return status === 'success' ? 
      <CheckCircle size={16} style={{ color: '#16a34a' }} /> : 
      <AlertTriangle size={16} style={{ color: '#dc2626' }} />;
  };

  return (
    <div className="card" style={{ margin: '20px 0' }}>
      <div className="card-header">
        <span className="card-title">Excel Routes Test</span>
      </div>
      
      <div style={{ padding: 16 }}>
        <button 
          className="btn btn-primary" 
          onClick={testExcelRoutes}
          disabled={testing}
        >
          {testing ? 'Testing...' : 'Test Excel Routes'}
        </button>

        {results.length > 0 && (
          <div style={{ marginTop: 16 }}>
            {results.map((result, index) => (
              <div key={index} style={{
                padding: 12,
                marginBottom: 8,
                borderRadius: 8,
                background: result.status === 'success' ? '#f0f9ff' : '#fef2f2',
                border: `1px solid ${result.status === 'success' ? '#bae6fd' : '#fecaca'}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {getStatusIcon(result.status)}
                  <strong>{result.test}</strong>
                </div>
                <div style={{ fontSize: '0.85rem', marginTop: 4 }}>
                  {result.message}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}