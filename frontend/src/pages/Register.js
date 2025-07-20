import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import styles from './AuthPage.module.css';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    const result = await register(email, password);
    
    if (result.success) {
      navigate('/');
    } else {
      setError(result.error);
    }
    
    setLoading(false);
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
      <div className={styles["auth-headline"]}>Create your account<br />and join us!</div>
      <form onSubmit={handleSubmit} className={styles["auth-form"]}>
        <label htmlFor="email" className={styles["auth-label"]}>Email</label>
        <input
          type="email"
          id="email"
          className={styles["auth-input"]}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="Enter your email"
        />
        <label htmlFor="password" className={styles["auth-label"]}>Password</label>
        <input
          type="password"
          id="password"
          className={styles["auth-input"]}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="Enter your password"
        />
        <label htmlFor="confirmPassword" className={styles["auth-label"]}>Confirm Password</label>
        <input
          type="password"
          id="confirmPassword"
          className={styles["auth-input"]}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          placeholder="Confirm your password"
        />
        {error && <div className={styles["auth-error"]}>{error}</div>}
        <button type="submit" disabled={loading} className={styles["auth-submit-btn"]}>
          {loading ? 'Creating account...' : 'Register'}
        </button>
      </form>
      <div className={styles["auth-form-msg"]}>
        Already have an account?
        <Link to="/login" className={styles["auth-link"]}> Login here</Link>
      </div>
    </div>
  </div>
);
};

export default Register;
