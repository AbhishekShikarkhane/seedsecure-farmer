import React, { useState } from 'react';
import { Lock, Loader2 } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const LogisticsLogin = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Query Firestore for this username
      const q = query(collection(db, "logistics_users"), where("username", "==", username));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError("User not found.");
        setLoading(false);
        return;
      }

      const userData = querySnapshot.docs[0].data();

      // 2. Verify Password AND Status
      if (userData.password !== password) {
        setError("Invalid password.");
        setLoading(false);
        return;
      }

      if (userData.isActive === false) {
        setError("ACCOUNT DISABLED: Please contact the Manufacturer.");
        setLoading(false);
        return;
      }

      // 3. Success! Log them in.
      localStorage.setItem('isLogisticsAuth', 'true');
      localStorage.setItem('activeLogisticsUser', userData.companyName); // Save name for UI 
      onLoginSuccess();
    } catch (err) {
      console.error("Login error: ", err);
      setError("An error occurred during login. Please try again.");
    } finally {
      if (typeof window !== "undefined") {
        setLoading(false);
      }
    }
  };

  return (
    <div className="logistics-login-container" style={{ padding: '2rem', textAlign: 'center' }}>
      <Lock size={48} style={{ color: 'var(--accent-cyan)', margin: '0 auto 16px', opacity: 0.8 }} />
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px' }}>Logistics Portal</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Restricted access for authorized supply chain partners.</p>
      
      <div style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: '8px', padding: '12px', marginBottom: '24px', textAlign: 'left' }}>
        <p style={{ fontSize: '0.875rem', color: 'var(--accent-cyan)', margin: 0, fontWeight: 600 }}>Demo Credentials (Judges):</p>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>Username: <strong>biotechagro_driver</strong></p>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>Password: <strong>4ecgyl2i</strong></p>
      </div>

      <form onSubmit={handleLogin} className="farmer-form">
        <div className="farmer-form-group" style={{ textAlign: 'left' }}>
          <label className="farmer-form-label">Username</label>
          <input
            type="text"
            className="farmer-form-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            placeholder="Enter username"
          />
        </div>
        <div className="farmer-form-group" style={{ textAlign: 'left' }}>
          <label className="farmer-form-label">Password</label>
          <input
            type="password"
            className="farmer-form-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter password"
          />
        </div>
        
        {error && <p style={{ color: 'var(--danger)', fontSize: '0.875rem', marginBottom: '16px', textAlign: 'left' }}>{error}</p>}
        
        <button
          type="submit"
          disabled={loading}
          className="farmer-btn-primary"
          style={{ background: 'linear-gradient(135deg, var(--accent-cyan) 0%, #0891b2 100%)', boxShadow: '0 20px 40px -10px rgba(6, 182, 212, 0.4)', opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? <Loader2 size={24} className="animate-spin" /> : 'Secure Login'}
        </button>
      </form>
    </div>
  );
};

export default LogisticsLogin;
