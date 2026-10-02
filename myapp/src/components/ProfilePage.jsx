import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCamera, faUser, faUserEdit, faEnvelope, faPhone, faSave, faCheck } from '@fortawesome/free-solid-svg-icons';

const ProfilePage = () => {
  const fileInputRef = useRef(null);
  
  const [userEmail, setUserEmail] = useState(localStorage.getItem("currentUserEmail") || "guest@example.com");
  const [profilePic, setProfilePic] = useState(localStorage.getItem("profilePic") || null);
  
  const [userDetails, setUserDetails] = useState(null);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Email update flow state
  const [emailUpdateState, setEmailUpdateState] = useState('idle'); // idle, verifying, updating
  const [otp, setOtp] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const addNotification = (msg) => {
    try {
      const existing = JSON.parse(localStorage.getItem("userNotifications") || "[]");
      const newNotif = { id: Date.now(), text: msg, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) };
      const updated = [newNotif, ...existing].slice(0, 10); // keep last 10
      localStorage.setItem("userNotifications", JSON.stringify(updated));
      window.dispatchEvent(new Event("newNotification"));
    } catch(e) {}
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get(`http://${window.location.hostname}:5000/api/user/${userEmail}`);
        if (response.data.success) {
          setUserDetails(response.data.user_info);
          setNewName(response.data.user_info.name !== "User" ? response.data.user_info.name : localStorage.getItem("userName") || "");
          
          let fetchedPhone = response.data.user_info.phone || "";
          if (fetchedPhone.startsWith("+91")) {
            fetchedPhone = fetchedPhone.replace("+91", "").trim();
          }
          setNewPhone(fetchedPhone);
        }
      } catch (err) {
        console.error("Fetch profile error", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProfile();
    
    const handleStorageChange = () => setProfilePic(localStorage.getItem("profilePic"));
    window.addEventListener("profilePicUpdated", handleStorageChange);
    return () => window.removeEventListener("profilePicUpdated", handleStorageChange);
  }, [userEmail]);

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
        addNotification("Profile picture was updated.");
      } catch (err) {
        console.error("Failed to update profile pic", err);
      }
    };
    reader.readAsDataURL(file);
  };

  const [phoneError, setPhoneError] = useState("");
  const [emailError, setEmailError] = useState("");

  const handleSaveProfile = async () => {
    setPhoneError("");
    const phoneRegex = /^[0-9]{10}$/;
    if (newPhone && !phoneRegex.test(newPhone)) {
      setPhoneError("Please enter a valid 10-digit Indian mobile number.");
      return;
    }
    
    const formattedPhone = newPhone ? `+91 ${newPhone}` : "";

    try {
      const response = await axios.post(`http://${window.location.hostname}:5000/api/update-profile`, {
        old_email: userEmail,
        name: newName,
        phone: formattedPhone
      });
      if (response.data.success) {
        if (newName !== userDetails?.name && newName !== localStorage.getItem("userName")) {
            addNotification(`Display name updated to ${newName}.`);
        }
        if (formattedPhone !== userDetails?.phone && formattedPhone) {
            addNotification(`Phone number updated to ${formattedPhone}.`);
        }
        
        localStorage.setItem("userName", newName);
        window.dispatchEvent(new Event("profileUpdated"));
        setIsEditing(false);
      } else {
        alert(response.data.error || "Failed to update");
      }
    } catch(err) {
      alert("Error updating profile");
    }
  };

  const initiateEmailUpdate = async () => {
    try {
      const response = await axios.post(`http://${window.location.hostname}:5000/api/send-otp`, { email: userEmail });
      if (response.data.success) {
        setEmailUpdateState('verifying');
      } else {
        alert(response.data.error);
      }
    } catch(err) {
      alert("Failed to send OTP");
    }
  };

  const verifyOtp = async () => {
    try {
      const response = await axios.post(`http://${window.location.hostname}:5000/api/verify-otp`, { email: userEmail, otp });
      if (response.data.success) {
        setEmailUpdateState('updating');
      } else {
        alert("Invalid OTP");
      }
    } catch(err) {
      alert("Failed to verify OTP");
    }
  };

  const saveNewEmail = async () => {
    setEmailError("");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
        setEmailError("Please enter a valid email address.");
        return;
    }

    try {
      const response = await axios.post(`http://${window.location.hostname}:5000/api/update-profile`, {
        old_email: userEmail,
        new_email: newEmail
      });
      if (response.data.success) {
        addNotification(`Email address changed from ${userEmail} to ${newEmail}.`);
        localStorage.setItem("currentUserEmail", newEmail);
        window.dispatchEvent(new Event("profileUpdated"));
        setUserEmail(newEmail);
        setEmailUpdateState('success');
        setOtp('');
        setNewEmail('');
        setTimeout(() => setEmailUpdateState('idle'), 4000);
      } else {
        alert(response.data.error);
      }
    } catch(err) {
      alert("Error updating email");
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-4 sm:space-y-6 min-h-full">
      <div className="container max-w-5xl mx-auto">
        <div className="bg-theme-card p-4 sm:p-8 rounded-2xl sm:rounded-3xl shadow-sm mb-6 sm:mb-8 border border-slate-200/60">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 mb-6 sm:mb-8">Account Settings</h2>
          
          {isLoading ? (
            <div className="text-center py-12 text-theme-muted">Loading profile...</div>
          ) : (
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-12">
              <div className="relative group cursor-pointer shrink-0" onClick={() => fileInputRef.current.click()}>
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                <div className="w-32 h-32 rounded-full bg-theme-primary-light flex items-center justify-center border-4 border-theme-border overflow-hidden shadow-sm">
                  {profilePic ? (
                    <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <FontAwesomeIcon icon={faUser} className="text-theme-primary-light text-5xl" />
                  )}
                  <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center transition-all rounded-full">
                    <FontAwesomeIcon icon={faCamera} className="text-white text-2xl" />
                  </div>
                </div>
              </div>
              
              <div className="flex-1 w-full space-y-6">
                
                {/* Email Flow */}
                <div className="bg-theme-bg/50 p-6 rounded-2xl border border-theme-border">
                  <label className="block text-sm font-bold text-theme-muted mb-3 uppercase flex items-center gap-2"><FontAwesomeIcon icon={faEnvelope}/> Email Address</label>
                  
                  {emailUpdateState === 'idle' && (
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center">
                      <input 
                        type="text" 
                        disabled
                        className="w-full sm:flex-1 px-4 py-3 rounded-xl border border-theme-border bg-transparent text-theme-text font-medium cursor-not-allowed" 
                        value={userEmail} 
                      />
                      <button className="w-full sm:w-auto justify-center bg-theme-accent text-white px-6 py-3 rounded-xl font-bold hover:brightness-110 shadow-sm transition-all flex items-center gap-2 whitespace-nowrap" onClick={initiateEmailUpdate}>
                         Change Email
                      </button>
                    </div>
                  )}

                  {emailUpdateState === 'verifying' && (
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center">
                      <input 
                        type="text" 
                        className="w-full sm:flex-1 px-4 py-3 rounded-xl border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" 
                        placeholder="Enter 6-digit OTP sent to current email"
                        value={otp}
                        onChange={e => setOtp(e.target.value)}
                      />
                      <button className="w-full sm:w-auto justify-center bg-theme-accent text-white px-6 py-3 rounded-xl font-bold hover:brightness-110 shadow-sm transition-all whitespace-nowrap" onClick={verifyOtp}>
                         Verify OTP
                      </button>
                      <button className="w-full sm:w-auto text-gray-400 hover:text-gray-600 font-bold px-3 py-2" onClick={() => setEmailUpdateState('idle')}>Cancel</button>
                    </div>
                  )}

                  {emailUpdateState === 'updating' && (
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center">
                        <input 
                          type="email" 
                          className="w-full sm:flex-1 px-4 py-3 rounded-xl border border-theme-primary focus:outline-none focus:ring-2 focus:ring-theme-primary bg-white" 
                          placeholder="Enter new email address"
                          value={newEmail}
                          onChange={e => { setNewEmail(e.target.value); setEmailError(""); }}
                        />
                        <button className="w-full sm:w-auto justify-center bg-theme-accent text-white px-6 py-3 rounded-xl font-bold hover:brightness-110 shadow-sm transition-all whitespace-nowrap" onClick={saveNewEmail}>
                           Save New Email
                        </button>
                        <button className="w-full sm:w-auto text-gray-400 hover:text-gray-600 font-bold px-3 py-2" onClick={() => setEmailUpdateState('idle')}>Cancel</button>
                      </div>
                      {emailError && <p className="text-red-500 text-xs font-bold pl-1">{emailError}</p>}
                    </div>
                  )}

                  {emailUpdateState === 'success' && (
                    <div className="flex items-center gap-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl animate-fade-in">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 shadow-sm border border-emerald-200">
                        <FontAwesomeIcon icon={faCheck} className="text-xl"/>
                      </div>
                      <div>
                        <h4 className="text-emerald-800 font-extrabold text-lg">Email Updated Successfully!</h4>
                        <p className="text-sm text-emerald-600 font-medium">Your primary email address has been securely changed and linked to your account.</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-theme-muted mb-1 ml-1 uppercase">Display Name</label>
                    <input 
                      type="text" 
                      disabled={!isEditing}
                      className={`w-full px-4 py-3 rounded-xl border border-theme-border focus:outline-none focus:ring-2 focus:ring-theme-accent text-theme-text ${!isEditing ? 'bg-theme-bg/50 cursor-not-allowed' : 'bg-white'}`} 
                      value={newName} 
                      onChange={(e)=>setNewName(e.target.value)} 
                      placeholder="Display Name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-theme-muted mb-1 ml-1 uppercase"><FontAwesomeIcon icon={faPhone} className="mr-1"/> Phone Number</label>
                    <div className="flex flex-col gap-2">
                      <div className="flex">
                        <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-theme-border bg-theme-bg/50 text-theme-muted font-bold">
                          +91
                        </span>
                        <input 
                          type="tel" 
                          disabled={!isEditing}
                          maxLength="10"
                          className={`flex-1 px-4 py-3 rounded-r-xl border border-theme-border focus:outline-none focus:ring-2 focus:ring-theme-accent text-theme-text ${!isEditing ? 'bg-theme-bg/50 cursor-not-allowed' : 'bg-white'}`} 
                          value={newPhone} 
                          onChange={(e)=> {
                            const val = e.target.value.replace(/\D/g, ''); // keep only digits
                            setNewPhone(val);
                            setPhoneError("");
                          }} 
                          placeholder="10-digit mobile number"
                        />
                      </div>
                      {phoneError && <p className="text-red-500 text-xs font-bold pl-1">{phoneError}</p>}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end pt-4 w-full">
                  {!isEditing ? (
                    <button 
                      className="w-full sm:w-auto justify-center bg-theme-accent text-white px-8 py-3 rounded-xl font-bold hover:brightness-110 transition-all shadow-sm flex items-center gap-2" 
                      onClick={() => setIsEditing(true)}
                    >
                      <FontAwesomeIcon icon={faUserEdit}/> Edit Profile
                    </button>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
                      <button 
                        className="w-full sm:w-auto text-gray-500 hover:text-gray-700 font-bold px-4 py-3 transition-all" 
                        onClick={() => {
                          setIsEditing(false);
                          // Revert values to userDetails if desired, or let it be
                          setNewName(userDetails?.name !== "User" ? userDetails?.name : localStorage.getItem("userName") || "");
                          let p = userDetails?.phone || "";
                          if (p.startsWith("+91")) p = p.replace("+91", "").trim();
                          setNewPhone(p);
                        }}
                      >
                        Cancel
                      </button>
                      <button 
                        className="w-full sm:w-auto justify-center bg-theme-accent text-white px-8 py-3 rounded-xl font-bold hover:brightness-110 transition-all shadow-sm flex items-center gap-2" 
                        onClick={handleSaveProfile}
                      >
                        <FontAwesomeIcon icon={faSave}/> Save Details
                      </button>
                    </div>
                  )}
                </div>
                
              </div>
            </div>
          )}
        </div>

        {userDetails && (
          <div className="bg-theme-card p-4 sm:p-8 rounded-2xl sm:rounded-3xl shadow-sm border border-emerald-50">
             <h3 className="text-lg sm:text-xl font-bold text-theme-text mb-4 sm:mb-6">Health Profile Snapshot</h3>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
               <div className="bg-theme-bg/50 p-4 rounded-xl text-center">
                 <div className="text-theme-muted text-xs font-bold uppercase mb-1">Age</div>
                 <div className="text-lg font-extrabold text-theme-text">{userDetails.age || "--"} yrs</div>
               </div>
               <div className="bg-theme-bg/50 p-4 rounded-xl text-center">
                 <div className="text-theme-muted text-xs font-bold uppercase mb-1">Gender</div>
                 <div className="text-lg font-extrabold text-theme-text capitalize">{userDetails.gender || "--"}</div>
               </div>
               <div className="bg-theme-bg/50 p-4 rounded-xl text-center">
                 <div className="text-theme-muted text-xs font-bold uppercase mb-1">Weight</div>
                 <div className="text-lg font-extrabold text-theme-text">{userDetails.weight || "--"} kg</div>
               </div>
               <div className="bg-theme-bg/50 p-4 rounded-xl text-center">
                 <div className="text-theme-muted text-xs font-bold uppercase mb-1">Height</div>
                 <div className="text-lg font-extrabold text-theme-text">{userDetails.height ? Math.round(userDetails.height) : "--"} cm</div>
               </div>
               <div className="bg-theme-bg/50 p-4 rounded-xl text-center">
                 <div className="text-theme-muted text-xs font-bold uppercase mb-1">Goal</div>
                 <div className="text-lg font-extrabold text-theme-text capitalize">{userDetails.goal || "--"}</div>
               </div>
               <div className="bg-theme-bg/50 p-4 rounded-xl text-center">
                 <div className="text-theme-muted text-xs font-bold uppercase mb-1">Diet</div>
                 <div className="text-lg font-extrabold text-theme-text capitalize">{userDetails.diet || "--"}</div>
               </div>
               <div className="bg-theme-bg/50 p-4 rounded-xl text-center border border-emerald-200">
                 <div className="text-emerald-600 text-xs font-bold uppercase mb-1">Target BMR</div>
                 <div className="text-lg font-extrabold text-emerald-700">{userDetails.bmr || "--"}</div>
               </div>
               <div className="bg-theme-bg/50 p-4 rounded-xl text-center border border-emerald-200">
                 <div className="text-emerald-600 text-xs font-bold uppercase mb-1">Target TDEE</div>
                 <div className="text-lg font-extrabold text-emerald-700">{userDetails.tdee || "--"}</div>
               </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
