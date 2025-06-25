import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, sendEmailNotification } from './firebase';
import './Signup.css';

const Signup = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailSignup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Create user with Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Store user info in localStorage
      localStorage.setItem('user', JSON.stringify({ 
        email: user.email, 
        uid: user.uid,
        provider: 'email'
      }));

      // Send email notification using Cloud Function
      try {
        await sendEmailNotification({ email: user.email });
        console.log('Email notification sent successfully');
      } catch (emailError) {
        console.warn('Failed to send email notification:', emailError);
        // Don't block user registration if email fails
      }

      // Navigate to dashboard after successful signup
      navigate('/dashboard');
    } catch (err) {
      console.error('Signup error:', err);
      
      // Handle specific Firebase error codes
      switch (err.code) {
        case 'auth/email-already-in-use':
          setError('This email is already registered. Please try logging in.');
          break;
        case 'auth/weak-password':
          setError('Password should be at least 6 characters long.');
          break;
        case 'auth/invalid-email':
          setError('Please enter a valid email address.');
          break;
        case 'auth/network-request-failed':
          setError('Network error. Please check your connection and try again.');
          break;
        default:
          setError('Signup failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
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

      // Send email notification using Cloud Function
      try {
        await sendEmailNotification({ email: user.email });
        console.log('Email notification sent successfully');
      } catch (emailError) {
        console.warn('Failed to send email notification:', emailError);
        // Don't block user registration if email fails
      }

      // Navigate to dashboard after successful Google signup
      navigate('/dashboard');
    } catch (err) {
      console.error('Google signup error:', err);
      
      // Handle specific Firebase error codes
      switch (err.code) {
        case 'auth/popup-closed-by-user':
          setError('Sign-in cancelled. Please try again.');
          break;
        case 'auth/popup-blocked':
          setError('Popup blocked. Please allow popups and try again.');
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
        
        <h1>VocalGenX</h1>
        
        <button 
          className="google-btn" 
          onClick={handleGoogleSignup}
          disabled={loading}
        >
          <img 
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
            width="20" 
            alt="Google"
          />
          Sign up with Google
        </button>
        
        <p className="divider">or continue with email</p>
        
        <form onSubmit={handleEmailSignup}>
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
            minLength="6"
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Signing up...' : 'Sign up'}
          </button>
        </form>
        
        {error && <p className="error-msg">{error}</p>}
        
        <p className="login-link">
          Already have an account? 
          <span onClick={() => navigate('/login')} className="link-text">
            Log in
          </span>
        </p>
      </div>
    </div>
  );
};

export default Signup;
