import React, { useState } from 'react';
import { PackageCheck, User, Lock, ArrowRight, ShieldCheck } from 'lucide-react';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    if (username === "admin" && password === "admin123") {
      localStorage.setItem('logisticsAuth', 'true');
      onLogin();
    } else {
      setError(true);
      setTimeout(() => setError(false), 3000);
    }
  };

  return (
    <div className="login-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#050505', color: '#fff', fontFamily: 'sans-serif' }}>
      <div className="login-card" style={{ background: '#161B22', borderRadius: '16px', padding: '40px', maxWidth: '400px', width: '100%', border: '1px solid #1F2937', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
        <div className="login-header" style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div className="login-logo" style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)' }}>
              <ShieldCheck size={36} color="#ffffff" />
            </div>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 8px 0' }}>Logistics Portal</h1>
          <p style={{ color: '#9CA3AF', margin: '0', fontSize: '14px' }}>Log in to access supply chain tracking and transit updates.</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ position: 'relative' }}>
            <User size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }} />
            <input 
              type="text" 
              placeholder="Username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required 
              style={{ width: '100%', boxSizing: 'border-box', background: '#0D1117', border: '1px solid #374151', color: '#fff', padding: '12px 16px 12px 48px', borderRadius: '8px', fontSize: '15px' }}
            />
          </div>
          <div style={{ position: 'relative' }}>
            <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }} />
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
              style={{ width: '100%', boxSizing: 'border-box', background: '#0D1117', border: '1px solid #374151', color: '#fff', padding: '12px 16px 12px 48px', borderRadius: '8px', fontSize: '15px' }}
            />
          </div>
          
          {error && <div style={{ color: '#ef4444', fontSize: '14px', textAlign: 'center', fontWeight: 'bold' }}>Invalid credentials.</div>}

          <button type="submit" style={{ marginTop: '8px', background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', color: '#fff', border: 'none', padding: '14px', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(6, 182, 212, 0.4)' }}>
            Login <ArrowRight size={18} />
          </button>
        </form>

        <div style={{ marginTop: '32px', padding: '20px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '12px' }}>
          <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#9CA3AF', lineHeight: '1.5' }}>
            <strong style={{ color: '#fff' }}>Hackathon Judges:</strong> Please use the following credentials to test the Logistics features.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#0D1117', padding: '12px', borderRadius: '8px', border: '1px solid #374151' }}>
            <span style={{ fontSize: '14px', fontFamily: 'monospace' }}><strong style={{ color: '#9CA3AF', marginRight: '8px' }}>Username:</strong>admin</span>
            <span style={{ fontSize: '14px', fontFamily: 'monospace' }}><strong style={{ color: '#9CA3AF', marginRight: '8px' }}>Password:</strong>admin123</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
