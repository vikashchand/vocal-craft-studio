import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import './Signup.css'; // Reusing the same styles

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Sign in with Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Store user info in localStorage
      localStorage.setItem('user', JSON.stringify({ 
        email: user.email, 
        uid: user.uid,
        provider: 'email'
      }));

      // Navigate to dashboard after successful login
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      
      // Handle specific Firebase error codes
      switch (err.code) {
        case 'auth/user-not-found':
          setError('No account found with this email. Please sign up first.');
          break;
        case 'auth/wrong-password':
          setError('Incorrect password. Please try again.');
          break;
        case 'auth/invalid-email':
          setError('Please enter a valid email address.');
          break;
        case 'auth/user-disabled':
          setError('This account has been disabled. Please contact support.');
          break;
        case 'auth/network-request-failed':
          setError('Network error. Please check your connection and try again.');
          break;
        case 'auth/too-many-requests':
          setError('Too many failed attempts. Please try again later.');
          break;
        default:
          setError('Login failed. Please check your credentials and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      // Sign in with Google
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Store user info in localStorage
      localStorage.setItem('user', JSON.stringify({ 
        email: user.email, 
        uid: user.uid,
        displayName: user.displayName,
        provider: 'google'
      }));

      // Navigate to dashboard after successful Google login
      navigate('/dashboard');
    } catch (err) {
      console.error('Google login error:', err);
      
      // Handle specific Firebase error codes
      switch (err.code) {
        case 'auth/popup-closed-by-user':
          setError('Sign-in cancelled. Please try again.');
          break;
        case 'auth/popup-blocked':
          setError('Popup blocked. Please allow popups and try again.');
          break;
        case 'auth/account-exists-with-different-credential':
          setError('An account already exists with this email using a different sign-in method.');
          break;
        case 'auth/network-request-failed':
          setError('Network error. Please check your connection and try again.');
          break;
        default:
          setError('Google sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    navigate('/');
  };

  return (
    <div className="signup-container">
      <div className="signup-box">
        <button className="back-button" onClick={goBack}>
          ← Back
        </button>
        
        <h1>Welcome Back</h1>
        
        <button 
          className="google-btn" 
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <img 
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
            width="20" 
            alt="Google"
          />
          Sign in with Google
        </button>
        
        <p className="divider">or continue with email</p>
        
        <form onSubmit={handleEmailLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        
        {error && <p className="error-msg">{error}</p>}
        
        <p className="login-link">
          Don't have an account? 
          <span onClick={() => navigate('/signup')} className="link-text">
            Sign up
          </span>
        </p>
      </div>
    </div>
  );
};

export default Login;
