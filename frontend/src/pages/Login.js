import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import styles from './AuthPage.module.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to log in');
    }
  };

return (
  <div
    className={styles["auth-full-bg"]}
    style={{
      backgroundImage: "linear-gradient(110deg, #181729 60%, #301960 100%), url('/auth-bg.png')",
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
    }}
  >
    <div className={styles["auth-blur-area"]}></div>
    <div className={styles["auth-side-panel"]}>
<img src={`${process.env.PUBLIC_URL}/link icon.png`} alt="logo" className={styles["auth-logo-3d"]} />
      <div className={styles["auth-headline"]}>
        Save, organize, and discover your favorite links with
        <br />AI-powered summaries and smart categorization.
      </div>
      <form onSubmit={handleSubmit} className={styles["auth-form"]}>
        <label className={styles["auth-label"]}>Email</label>
        <input
          className={styles["auth-input"]}
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
        />
        <label className={styles["auth-label"]}>Password</label>
        <input
          className={styles["auth-input"]}
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Enter your password"
          required
        />
        {error && <div className={styles["auth-error"]}>{error}</div>}
        <button type="submit" className={styles["auth-submit-btn"]}>Login</button>
      </form>
      <div className={styles["auth-form-msg"]}>
        Don't have an account?
        <Link to="/register" className={styles["auth-link"]}> Register</Link>
      </div>
    </div>
  </div>
);
};

export default Login;
