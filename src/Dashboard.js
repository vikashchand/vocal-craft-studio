import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Check if user is authenticated
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        // If no user is authenticated, redirect to login
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('user');
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleToolClick = (toolType) => {
    switch (toolType) {
      case 'voice-recording':
        navigate('/voice-recording');
        break;
      case 'text-to-speech':
        navigate('/text-to-speech');
        break;
      case 'voice-cloning':
        navigate('/voice-cloning');
        break;
      case 'audiotoText':
        navigate('/audiotoText');
        break;
      default:
        break;
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  const displayName = user.displayName || 'User';
  const displayEmail = user.email ;

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="vx-watermark">VX</div>
        <div className="logo"><strong>VocalGenX</strong></div>
        
        <div className="profile">
          <div className="avatar">
            {user.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="avatar-img" />
            ) : (
              <div className="avatar-placeholder">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="username"><strong>{displayName}</strong></div>
          <div className="email">{displayEmail}</div>
        </div>

        <nav>
          <ul>
            <li className="nav-item active">
              <span className="material-icons">home</span> Home
            </li>
            <li className="nav-item">
              <span className="material-icons">search</span> Explore
            </li>
            <li className="nav-item">
              <span className="material-icons">folder</span> Activity
            </li>
            <li className="nav-item">
              <span className="material-icons">bar_chart</span> Stats
            </li>
            <li className="nav-item">
              <p onClick={handleLogout} className="logout-btn">
            <span className="material-icons">logout</span> Logout
          </p>
           
            </li>
          </ul>
        </nav>

     
      </aside>

      {/* Main content */}
      <main className="main-content">
        <div className="top-bar">
          <div className="search-container">
            <span className="material-icons search-icon">search</span>
            <input 
              type="text" 
              placeholder="Search" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="top-icons">
            <span className="material-icons icon-btn">photo_camera</span>
            <span className="material-icons icon-btn">send</span>
            <button className="create-button">+ Create New</button>
          </div>
        </div>

        <h2>Recent Work</h2>
        <div className="work-preview"></div>

        <h3>Tools</h3>
        <div className="tools">
          {/* VOICE RECORDING */}
          <div 
            className="tool-card" 
            onClick={() => handleToolClick('voice-recording')}
          >
            <span className="material-icons tool-icon">mic</span>
            <h4>Voice Recording</h4>
            <p>Voice recording captures and stores spoken sound.</p>
          </div>

          {/* TEXT TO SPEECH */}
          <div 
            className="tool-card"
            onClick={() => handleToolClick('text-to-speech')}
          >
            <span className="material-icons tool-icon">record_voice_over</span>
            <h4>TEXT TO SPEECH</h4>
            <p>Text-to-speech converts written text into spoken voice output.</p>
          </div>

          {/* VOICE CLONING */}
          <div 
            className="tool-card"
            onClick={() => handleToolClick('voice-cloning')}
          >
            <span className="material-icons tool-icon">person_add</span>
            <h4>Voice Cloning</h4>
            <p>Clone any voice with AI-powered technology</p>
          </div>



             <div 
            className="tool-card"
            onClick={() => handleToolClick('audiotoText')}
          >
            <span className="material-icons tool-icon">record_voice_over</span>
            <h4>SPEECH TO TEXT</h4>
            <p>Speech-to-text converts spoken voice  into written text output.</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
