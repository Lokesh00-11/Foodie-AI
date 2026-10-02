import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faDumbbell, faLeaf, faComments, faHistory, 
  faCog, faHome, faUser, faUtensils, faSearch, faBell, faChevronDown, faCamera, faMoon, faSun, faBars, faTimes
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';

const DashboardLayout = () => {
  const navigate = navigateTo => navigate(navigateTo);
  const routerNavigate = useNavigate();
  const location = useLocation();
  const [userName, setUserName] = useState(localStorage.getItem("userName") || "User");
  const [userEmail, setUserEmail] = useState(localStorage.getItem("currentUserEmail") || "guest@example.com");

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  
  const [profilePic, setProfilePic] = useState(localStorage.getItem("profilePic") || null);
  const fileInputRef = useRef(null);

  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('theme') === 'dark');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Recipe search state
  const [searchQuery, setSearchQuery] = useState("");
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [recipeData, setRecipeData] = useState(null);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [recipeError, setRecipeError] = useState("");

  const handleRecipeSearch = async (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      setRecipeLoading(true);
      setShowRecipeModal(true);
      setRecipeError("");
      try {
        const response = await axios.post(`http://${window.location.hostname}:5000/api/recipe`, {
          food_name: searchQuery.trim()
        });
        if (response.data.success) {
          setRecipeData(response.data.recipe);
        } else {
          setRecipeError(response.data.error || "Failed to fetch recipe");
        }
      } catch (err) {
        setRecipeError("Error connecting to server to fetch recipe");
      } finally {
        setRecipeLoading(false);
      }
    }
  };

  const toggleDarkMode = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    if (newTheme) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    window.dispatchEvent(new Event("themeUpdated"));
  };

  useEffect(() => {
    if (!localStorage.getItem("currentUserEmail")) {
      routerNavigate("/auth");
    }
  }, [routerNavigate]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("userNotifications") || "[]");
      setNotifications(stored);
    } catch(e) {}

    const handleStorageChange = () => {
      setProfilePic(localStorage.getItem("profilePic"));
      setUserName(localStorage.getItem("userName") || "User");
      setUserEmail(localStorage.getItem("currentUserEmail") || "guest@example.com");
    };
    const handleNewNotification = () => {
      try {
        const stored = JSON.parse(localStorage.getItem("userNotifications") || "[]");
        setNotifications(stored);
      } catch(e) {}
    };

    const handleThemeUpdate = () => {
      setIsDarkMode(localStorage.getItem('theme') === 'dark');
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("profilePicUpdated", handleStorageChange);
    window.addEventListener("profileUpdated", handleStorageChange);
    window.addEventListener("newNotification", handleNewNotification);
    window.addEventListener("themeUpdated", handleThemeUpdate);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("profilePicUpdated", handleStorageChange);
      window.removeEventListener("profileUpdated", handleStorageChange);
      window.removeEventListener("newNotification", handleNewNotification);
      window.removeEventListener("themeUpdated", handleThemeUpdate);
    };
  }, []);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result;
      setProfilePic(base64String);
      localStorage.setItem("profilePic", base64String);
      window.dispatchEvent(new Event("profilePicUpdated"));
      
      try {
        await axios.post(`http://${window.location.hostname}:5000/api/update-profile-pic`, {
          email: userEmail,
          profile_pic: base64String
        });
      } catch (err) {
        console.error("Failed to update profile pic", err);
      }
    };
    reader.readAsDataURL(file);
  };

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: faHome },
    { name: 'Diet Planner', path: '/inputs', icon: faUtensils },
    { name: 'Workouts', path: '/workouts', icon: faDumbbell },
    { name: 'AI Health Coach', path: '/coach', icon: faComments },
    { name: 'Saved History', path: '/history', icon: faHistory },
    { name: 'Profile', path: '/profile', icon: faUser },
    { name: 'Settings', path: '/settings', icon: faCog },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-theme-bg font-sans p-2 sm:p-4 gap-4 relative">
      
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-2 sm:inset-y-4 left-2 sm:left-4 z-50 w-[280px] h-[calc(100%-16px)] sm:h-[calc(100%-32px)] md:h-full bg-theme-primary text-white flex flex-col justify-between shrink-0 rounded-2xl overflow-hidden shadow-2xl md:shadow-lg transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-[150%] md:translate-x-0'}`}>
        <div>
          {/* Logo & Close Button */}
          <div className="flex items-center justify-between px-6 py-8 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center border border-white/10">
                <FontAwesomeIcon icon={faLeaf} className="text-white text-xl" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-wide">
                  Foodie <span className="font-extrabold text-theme-accent bg-white/10 px-1.5 py-0.5 rounded">AI</span>
                </h1>
                <p className="text-[10px] text-white/70 tracking-wider uppercase mt-1 font-semibold">Nutrition Recommender</p>
              </div>
            </div>
            <button 
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="px-4 py-6 space-y-1">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              if (item.stateCheck && !location.state && !localStorage.getItem("activePlan")) {
                return null;
              }

              return (
                <button
                  key={item.name}
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    routerNavigate(item.path, { state: location.state });
                  }}
                  className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                    isActive 
                      ? 'bg-theme-accent text-white shadow-sm' 
                      : 'hover:bg-white/10 text-white/80 hover:text-white'
                  }`}
                >
                  <div className="w-5 flex justify-center">
                    <FontAwesomeIcon icon={item.icon} className={`text-[15px] ${isActive ? 'text-white' : 'text-white/60 group-hover:text-white'}`} />
                  </div>
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Card */}
        <div className="p-4 bg-black/10">
          <div className="flex items-center gap-3.5 px-4 py-3 bg-black/20 rounded-xl border border-white/5 relative group cursor-pointer hover:bg-black/30 transition-all shadow-inner" onClick={() => fileInputRef.current.click()}>
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
            <div className="relative w-10 h-10 rounded-full bg-white/20 flex items-center justify-center border border-white/10 overflow-hidden shrink-0">
              {profilePic ? (
                <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <FontAwesomeIcon icon={faUser} className="text-white/80 text-sm" />
              )}
              <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center transition-all">
                <FontAwesomeIcon icon={faCamera} className="text-white text-xs" />
              </div>
            </div>
            <div className="overflow-hidden">
              <h2 className="text-sm font-bold text-white truncate">{userName}</h2>
              <p className="text-[11px] text-white/50 truncate">{userEmail}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 h-full flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Navbar */}
        <header className="h-[64px] sm:h-[72px] bg-theme-card rounded-2xl shadow-sm border border-theme-border flex items-center justify-between px-3 sm:px-6 mb-4 shrink-0">
          
          <div className="flex items-center gap-2 sm:gap-4">
            <button 
              className="md:hidden w-10 h-10 rounded-xl bg-theme-bg/50 hover:bg-theme-bg border border-theme-border flex items-center justify-center text-theme-text transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <FontAwesomeIcon icon={faBars} />
            </button>
            <div className="flex items-center text-theme-muted w-36 sm:w-64 md:w-96 relative group">
              <FontAwesomeIcon icon={faSearch} className="absolute left-3 sm:left-4 text-slate-400 group-focus-within:text-theme-primary transition-colors z-10 pointer-events-none text-xs sm:text-base" />
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleRecipeSearch}
                className="w-full pr-4 py-2 sm:py-2.5 rounded-full border border-slate-200/60 dark:border-theme-border bg-slate-50 hover:bg-white dark:bg-theme-bg/50 dark:hover:bg-theme-bg focus:bg-white dark:focus:bg-theme-card focus:border-theme-primary focus:outline-none focus:ring-2 focus:ring-theme-primary/10 transition-all text-xs sm:text-sm font-medium text-slate-700 dark:text-theme-text shadow-sm relative z-0 focus:placeholder-transparent"
                style={{ paddingLeft: '40px' }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-6 relative">
            {/* Dark Mode Toggle */}
            <button 
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-theme-bg/50 border border-theme-border flex items-center justify-center text-theme-muted hover:text-theme-accent transition-all hover:bg-theme-bg shadow-sm"
              onClick={toggleDarkMode}
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              <FontAwesomeIcon icon={isDarkMode ? faSun : faMoon} className={isDarkMode ? "text-amber-400 text-sm sm:text-lg" : "text-slate-600 text-sm sm:text-lg"} />
            </button>

            <button 
              className="relative w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-theme-muted hover:text-theme-text transition-colors"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <FontAwesomeIcon icon={faBell} className="text-base sm:text-xl" />
              {notifications.length > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-theme-accent rounded-full border-2 border-theme-card"></span>}
            </button>

            {showNotifications && (
              <div className="absolute top-12 right-0 sm:right-48 w-[280px] sm:w-80 bg-white rounded-2xl shadow-xl border border-theme-border overflow-hidden z-50">
                <div className="px-4 py-3 bg-theme-bg/50 border-b border-theme-border flex justify-between items-center">
                   <h3 className="font-bold text-theme-text text-sm">Notifications</h3>
                   {notifications.length > 0 && (
                     <button 
                       className="text-xs text-theme-accent font-bold hover:underline" 
                       onClick={() => { localStorage.setItem("userNotifications", "[]"); setNotifications([]); }}
                     >
                       Clear All
                     </button>
                   )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                   {notifications.length > 0 ? notifications.map((notif, idx) => (
                     <div key={notif.id || idx} className="px-4 py-3 border-b border-theme-border/50 hover:bg-theme-bg/30 text-sm last:border-0">
                       <p className="text-theme-text font-medium">{notif.text}</p>
                       <p className="text-xs text-theme-muted font-bold mt-1">{notif.time}</p>
                     </div>
                   )) : (
                     <div className="p-6 text-center text-theme-muted text-sm font-bold">No new notifications</div>
                   )}
                </div>
              </div>
            )}

            <div className="hidden sm:block h-6 w-px bg-theme-border"></div>
            
            <div className="relative">
              <div 
                className="flex items-center gap-2 sm:gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-theme-primary-light flex items-center justify-center border border-theme-border overflow-hidden shrink-0">
                  {profilePic ? (
                    <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <FontAwesomeIcon icon={faUser} className="text-theme-primary text-xs" />
                  )}
                </div>
                <span className="text-sm font-bold text-theme-text hidden md:block">{getGreeting()}, {userName}!</span>
                <FontAwesomeIcon icon={faChevronDown} className="text-theme-muted text-xs hidden md:block" />
              </div>

              {/* Profile Dropdown Menu */}
              {showProfileMenu && (
                <div className="absolute top-12 right-0 w-56 bg-white dark:bg-theme-card rounded-2xl shadow-xl border border-theme-border overflow-hidden z-50">
                  <div className="px-4 py-4 border-b border-theme-border bg-theme-bg/50">
                    <h3 className="font-bold text-theme-text text-sm truncate">{userName}</h3>
                    <p className="text-xs text-theme-muted truncate mt-0.5">{userEmail}</p>
                  </div>
                  <div className="p-2">
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        routerNavigate('/profile');
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm font-semibold text-theme-text hover:bg-theme-bg rounded-xl transition-colors"
                    >
                      <FontAwesomeIcon icon={faUser} className="text-theme-primary" />
                      View Profile
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto rounded-2xl">
          <Outlet />
        </div>
      </main>

      {/* Recipe Modal */}
      {showRecipeModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-theme-card dark:bg-slate-800 rounded-3xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl relative border border-theme-border">
            <button 
              onClick={() => setShowRecipeModal(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-full text-slate-600 dark:text-slate-300 font-bold"
            >
              ×
            </button>
            <h2 className="text-2xl font-extrabold text-theme-primary mb-1 capitalize">
              {searchQuery} Recipe
            </h2>
            
            {recipeLoading ? (
              <div className="py-12 flex flex-col items-center justify-center">
                <FontAwesomeIcon icon={faUtensils} spin className="text-theme-accent text-4xl mb-4" />
                <p className="text-theme-muted font-bold animate-pulse">Generating perfect recipe...</p>
              </div>
            ) : recipeError ? (
              <div className="py-8 text-center text-red-500 font-bold">{recipeError}</div>
            ) : recipeData ? (
              <div className="mt-4 space-y-6">
                <div className="flex items-center gap-2 bg-theme-primary-light/30 px-4 py-2 rounded-xl w-max">
                  <span className="font-bold text-theme-text text-sm">Prep Time:</span>
                  <span className="text-sm font-semibold text-theme-muted">{recipeData.prep_time}</span>
                </div>
                
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-theme-bg p-3 rounded-xl border border-theme-border text-center">
                    <div className="text-xs text-theme-muted font-bold uppercase mb-1">Calories</div>
                    <div className="text-lg font-extrabold text-theme-text">{recipeData.macros?.calories || 0}</div>
                  </div>
                  <div className="bg-theme-bg p-3 rounded-xl border border-theme-border text-center">
                    <div className="text-xs text-theme-muted font-bold uppercase mb-1">Protein</div>
                    <div className="text-lg font-extrabold text-theme-text">{recipeData.macros?.protein || 0}g</div>
                  </div>
                  <div className="bg-theme-bg p-3 rounded-xl border border-theme-border text-center">
                    <div className="text-xs text-theme-muted font-bold uppercase mb-1">Carbs</div>
                    <div className="text-lg font-extrabold text-theme-text">{recipeData.macros?.carbs || 0}g</div>
                  </div>
                  <div className="bg-theme-bg p-3 rounded-xl border border-theme-border text-center">
                    <div className="text-xs text-theme-muted font-bold uppercase mb-1">Fats</div>
                    <div className="text-lg font-extrabold text-theme-text">{recipeData.macros?.fats || 0}g</div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-extrabold text-theme-text mb-3 border-b border-theme-border pb-2">Ingredients</h3>
                    <ul className="space-y-2">
                      {recipeData.ingredients?.map((ing, idx) => (
                        <li key={idx} className="text-sm text-theme-muted font-medium flex gap-2">
                          <span className="text-theme-primary">•</span> {ing}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-theme-text mb-3 border-b border-theme-border pb-2">Instructions</h3>
                    <ol className="space-y-3">
                      {recipeData.instructions?.map((step, idx) => (
                        <li key={idx} className="text-sm text-theme-muted font-medium flex gap-2">
                          <span className="font-bold text-theme-primary">{idx + 1}.</span> {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardLayout;
