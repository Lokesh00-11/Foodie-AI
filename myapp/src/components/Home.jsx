import React from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();
  // Get the username for the session
  const userName = localStorage.getItem("userName") || "User";

  return (
    <div className="home-wrapper">
      <header className="header">
        <div className="logo-group">
          {/* Using relative path for logo consistency */}
          <img src="/icon.jpg" alt="Logo" style={{ width: '35px', height: '35px' }} />
          <div style={{fontSize: '24px', fontWeight: 'bold', color: '#10b981'}}>Foodie</div>
        </div>
        <div className="user-nav">
          {/* Clicking the name now correctly navigates to Dashboard */}
          <span className="hi-text" onClick={() => navigate("/dashboard")}>
            Hi, {userName}
          </span>
          <button className="btn-logout" onClick={() => navigate("/auth")}>
            Logout
          </button>
        </div>
      </header>

      <section className="hero-section">
        <h1 className="hero-quote">
          "Let food be the medicine and medicine be the food."
        </h1>
        <button className="btn-details" onClick={() => navigate("/inputs")}>
          Enter Your Details
        </button>
      </section>

      <footer className="footer">
        <p>© 2026 Foodie. All rights reserved.</p>
        <p>Support: <a href="mailto:nutri@gmail.com">nutri@gmail.com</a></p>
      </footer>
    </div>
  );
};

export default Home;