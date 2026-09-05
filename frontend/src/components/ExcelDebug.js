import React, { useState } from 'react';
import { Server, CheckCircle, AlertTriangle, Download } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function ExcelDebug() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);

  const testBackend = async () => {
    setTesting(true);
    setResult(null);

    const tests = [];

    // Test 1: Health check
    try {
      const healthResponse = await api.get('/health');
      tests.push({ name: 'Health Check', status: 'success', data: healthResponse.data });
    } catch (error) {
      tests.push({ name: 'Health Check', status: 'failed', error: error.message });
    }

    // Test 2: Auth check
    try {
      const authResponse = await api.get('/teachers');
      tests.push({ name: 'Auth Check', status: 'success', data: 'Authenticated' });
    } catch (error) {
      tests.push({ name: 'Auth Check', status: 'failed', error: error.message });
    }

    // Test 3: Excel route check (with auth)
    try {
      const excelResponse = await api.get('/excel/template', { 
        responseType: 'blob',
        timeout: 10000
      });
      tests.push({ 
        name: 'Excel Template (Auth)', 
        status: 'success', 
        data: `File size: ${excelResponse.data.size} bytes` 
      });
    } catch (error) {
      tests.push({ 
        name: 'Excel Template (Auth)', 
        status: 'failed', 
        error: error.response?.data || error.message,
        status_code: error.response?.status
      });
    }

    // Test 4: Excel route check (no auth)
    try {
      const testResponse = await api.get('/excel/template-test', { 
        responseType: 'blob',
        timeout: 10000
      });
      tests.push({ 
        name: 'Excel Template (No Auth)', 
        status: 'success', 
        data: `File size: ${testResponse.data.size} bytes` 
      });
    } catch (error) {
      tests.push({ 
        name: 'Excel Template (No Auth)', 
        status: 'failed', 
        error: error.response?.data || error.message,
        status_code: error.response?.status
      });
    }

    setResult({ tests, apiUrl: api.defaults.baseURL });
    setTesting(false);
  };

  const downloadSimpleTemplate = async () => {
    try {
      // Create a simple Excel file on frontend as fallback
      const csvContent = `Class Name,Section,Strength,Course
BTech CSE,A,60,BTech
BTech CSE,B,58,BTech
BCS,A,45,BCS

Subject Name,Subject Code,Hours Per Week,Is Lab,Course
Data Structures,CS201,4,No,BTech
Database Systems,CS301,3,No,BTech
Database Lab,CS301L,2,Yes,BTech

Teacher Name,Email,Subjects,Max Hours Per Day,Max Hours Per Week,Course
Dr. John Smith,john@college.edu,"Data Structures,Algorithms",6,24,BTech
Prof. Jane Doe,jane@college.edu,"Database Systems,Database Lab",5,20,BTech`;

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'ChronoGen_Template.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Fallback CSV template downloaded!');
    } catch (error) {
      toast.error('Failed to create fallback template');
    }
  };

  return (
    <div className="card" style={{ margin: '20px 0' }}>
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Server size={20} />
          <span className="card-title">Excel Debug Test</span>
        </div>
      </div>
      
      <div style={{ padding: 16 }}>
        <div style={{ marginBottom: 16 }}>
          <p style={{ color: '#64748b', marginBottom: 12 }}>
            Current API URL: <code>{api.defaults.baseURL}</code>
          </p>
          
          <div style={{ display: 'flex', gap: 8 }}>
            <button 
              className="btn btn-primary" 
              onClick={testBackend}
              disabled={testing}
            >
              {testing ? 'Testing...' : 'Run Debug Tests'}
            </button>
            
            <button 
              className="btn btn-secondary" 
              onClick={downloadSimpleTemplate}
            >
              <Download size={16} /> Download CSV Template (Fallback)
            </button>
          </div>
        </div>

        {result && (
          <div style={{ marginTop: 16 }}>
            <h4 style={{ marginBottom: 12 }}>Test Results:</h4>
            
            {result.tests.map((test, index) => (
              <div key={index} style={{
                padding: 12,
                marginBottom: 8,
                borderRadius: 8,
                background: test.status === 'success' ? '#f0f9ff' : '#fef2f2',
                border: `1px solid ${test.status === 'success' ? '#bae6fd' : '#fecaca'}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  {test.status === 'success' ? (
                    <CheckCircle size={16} style={{ color: '#16a34a' }} />
                  ) : (
                    <AlertTriangle size={16} style={{ color: '#dc2626' }} />
                  )}
                  <strong>{test.name}</strong>
                  <span style={{ 
                    fontSize: '0.8rem',
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: test.status === 'success' ? '#16a34a' : '#dc2626',
                    color: 'white'
                  }}>
                    {test.status}
                  </span>
                </div>
                
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  {test.status === 'success' ? (
                    <div>{test.data}</div>
                  ) : (
                    <div>
                      <div style={{ color: '#dc2626' }}>Error: {test.error}</div>
                      {test.status_code && (
                        <div>Status Code: {test.status_code}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            <div style={{ marginTop: 16, padding: 12, background: '#fef3c7', borderRadius: 8 }}>
              <strong>Next Steps:</strong>
              <ul style={{ marginTop: 8, fontSize: '0.85rem' }}>
                <li>If Health Check fails: Your backend is not accessible</li>
                <li>If Auth Check fails: You need to login or set REACT_APP_API_URL</li>
                <li>If Excel Template fails: Backend doesn't have Excel routes or dependencies</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}