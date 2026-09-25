import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHome, faArrowLeft, faFire, faLightbulb, faStethoscope, 
  faAppleAlt, faDownload, faUser, faTimes, faSpinner, faCamera,
  faEdit, faSave, faDumbbell
} from '@fortawesome/free-solid-svg-icons';

const ResultPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const getInitialData = () => {
    if (location.state && location.state.plan && Object.keys(location.state.plan).length > 0) {
      return location.state;
    }
    const cached = localStorage.getItem("activePlan");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return {
          plan: parsed.weekly_plan || {},
          ai_advice: parsed.ai_advice || "",
          deficiency_analysis: parsed.deficiency_analysis || "",
          target_cal: parsed.target_cal || (parsed.metrics?.target_cal) || 0,
          bmr: parsed.bmr || (parsed.metrics?.bmr) || 0,
          tdee: parsed.tdee || (parsed.metrics?.tdee) || 0,
          user_details: parsed.user_details || parsed.metrics || {}
        };
      } catch (err) {
        console.error("Failed to parse cached activePlan:", err);
      }
    }
    return { 
      plan: {}, ai_advice: "", deficiency_analysis: "", target_cal: 0, 
      bmr: 0, tdee: 0, user_details: {} 
    };
  };

  const initialData = getInitialData();

  const [currentPlan, setCurrentPlan] = useState(initialData.plan);
  const [currentAdvice, setCurrentAdvice] = useState(initialData.ai_advice);
  const [currentDeficiency, setCurrentDeficiency] = useState(initialData.deficiency_analysis);
  const [currentMetrics, setCurrentMetrics] = useState({
    target_cal: initialData.target_cal,
    bmr: initialData.bmr,
    tdee: initialData.tdee
  });
  const [currentUserDetails, setCurrentUserDetails] = useState(initialData.user_details || {});

  const userEmail = localStorage.getItem("currentUserEmail") || "guest@example.com";
  const [eatenWeekly, setEatenWeekly] = useState({});

  useEffect(() => {
    const saved = localStorage.getItem(`eaten_weekly_${userEmail}`);
    if (saved) {
      try {
        setEatenWeekly(JSON.parse(saved));
      } catch (err) {
        console.error("Failed to parse weekly eaten meals:", err);
      }
    }
  }, [userEmail]);

  useEffect(() => {
    const fetchLatestPlan = async () => {
      try {
        const res = await axios.get(`http://${window.location.hostname}:5000/api/user/${userEmail}`);
        if (res.data.success && res.data.history && res.data.history.length > 0) {
          const latestPlan = res.data.history[0];
          
          let planDataParsed = latestPlan.plan_data;
          let parsedObj = {};
          if (typeof planDataParsed === 'string') {
            try { parsedObj = JSON.parse(planDataParsed); } catch(e) {}
          } else if (planDataParsed && typeof planDataParsed === 'object') {
            parsedObj = planDataParsed;
          }

          let plan = {};
          let targetCal = latestPlan.total_calories || 0;
          let bmrVal = 0;
          let tdeeVal = 0;
          let advice = "";
          let deficiency = "";
          let details = {};
          
          if (parsedObj && parsedObj.weekly_plan) {
            plan = parsedObj.weekly_plan;
            targetCal = parsedObj.target_cal || targetCal;
            bmrVal = parsedObj.bmr || 0;
            tdeeVal = parsedObj.tdee || 0;
            advice = parsedObj.ai_advice || "";
            deficiency = parsedObj.deficiency_analysis || "";
            details = parsedObj.user_details || {};
          } else if (parsedObj && Object.keys(parsedObj).length > 0) {
            plan = parsedObj;
            targetCal = latestPlan.total_calories || 0;
          }

          if (res.data.user_info) {
            const info = res.data.user_info;
            details = {
              age: info.age || details.age,
              gender: info.gender || details.gender,
              weight: info.weight || details.weight,
              height: info.height || details.height,
              goal: info.goal || details.goal,
              diet: info.diet || details.diet || "vegetarian",
              exclusions: details.exclusions || []
            };
            if (!bmrVal || bmrVal === 0) bmrVal = info.bmr || 0;
            if (!tdeeVal || tdeeVal === 0) tdeeVal = info.tdee || 0;
          }
          
          setCurrentPlan(plan);
          setCurrentAdvice(advice);
          setCurrentDeficiency(deficiency);
          setCurrentMetrics({
            target_cal: targetCal,
            bmr: bmrVal,
            tdee: tdeeVal
          });
          setCurrentUserDetails(details);
          
          localStorage.setItem("activePlan", JSON.stringify({
            metrics: {
              target_cal: targetCal,
              bmr: bmrVal,
              tdee: tdeeVal,
              age: details.age,
              weight: details.weight,
              height: details.height,
              gender: details.gender,
              goal: details.goal,
              diet: details.diet,
              exclusions: details.exclusions
            },
            weekly_plan: plan,
            ai_advice: advice,
            deficiency_analysis: deficiency,
            user_details: details
          }));
        }
      } catch (err) {
        console.error("Error loading plan from DB:", err);
      }
    };
    fetchLatestPlan();
  }, [userEmail]);

  const toggleEatenWeekly = (day, mealType) => {
    const key = `${day}_${mealType}`;
    const updated = {
      ...eatenWeekly,
      [key]: !eatenWeekly[key]
    };
    setEatenWeekly(updated);
    localStorage.setItem(`eaten_weekly_${userEmail}`, JSON.stringify(updated));
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState(currentUserDetails);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const [displayedAdvice, setDisplayedAdvice] = useState("");
  const userName = localStorage.getItem("userName") || "User";

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFoodName, setSelectedFoodName] = useState("");
  const [isCombo, setIsCombo] = useState(false); 
  const [comboImages, setComboImages] = useState({ img1: "", img2: "" });
  const [singleImage, setSingleImage] = useState(""); 
  const [isImageLoading1, setIsImageLoading1] = useState(false);
  const [isImageLoading2, setIsImageLoading2] = useState(false);

  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [recipeData, setRecipeData] = useState(null);
  const [loadingRecipe, setLoadingRecipe] = useState(false);

  const [isReplanModalOpen, setIsReplanModalOpen] = useState(false);
  const [replanDay, setReplanDay] = useState("");
  const [replanMealType, setReplanMealType] = useState("breakfast");
  const [customBName, setCustomBName] = useState("");
  const [customBCal, setCustomBCal] = useState("");
  const [replanProgress, setReplanProgress] = useState(false);
  const [customBQty, setCustomBQty] = useState("1");
  const [customBUnit, setCustomBUnit] = useState("pieces");
  const [estimatingLoading, setEstimatingLoading] = useState(false);

  const handleEstimateCalories = async () => {
    if (!customBName) {
      alert("Please enter a food name first!");
      return;
    }
    setEstimatingLoading(true);
    try {
      const res = await axios.post(`http://${window.location.hostname}:5000/api/estimate-calories`, {
        food_name: customBName,
        quantity: parseFloat(customBQty || 1),
        unit: customBUnit
      });
      if (res.data.success) {
        setCustomBCal(res.data.calories);
      } else {
        alert("Failed to get estimation. Enter manually.");
      }
    } catch (err) {
      console.error("Estimate error:", err);
      alert("Failed to get estimation. Enter manually.");
    } finally {
      setEstimatingLoading(false);
    }
  };

  const handleExecuteReplan = async () => {
    if (!customBName || !customBCal) return;
    setReplanProgress(true);
    try {
      const activePlan = JSON.parse(localStorage.getItem("activePlan"));
      const dietPref = activePlan?.metrics?.diet || "vegetarian";
      const exclusions = activePlan?.metrics?.exclusions || [];
      
      const payload = {
        email: userEmail,
        day: replanDay,
        meal_type: replanMealType,
        custom_name: customBName,
        custom_calories: parseInt(customBCal),
        breakfast_name: customBName, // fallback
        breakfast_calories: parseInt(customBCal), // fallback
        diet_preference: dietPref,
        exclusions: exclusions
      };

      const res = await axios.post(`http://${window.location.hostname}:5000/api/replan-remaining`, payload);
      if (res.data.success) {
        setCurrentPlan(res.data.weekly_plan);
        if (activePlan) {
          activePlan.weekly_plan = res.data.weekly_plan;
          localStorage.setItem("activePlan", JSON.stringify(activePlan));
        }
        const key = `${replanDay}_${replanMealType.charAt(0).toUpperCase() + replanMealType.slice(1)}`;
        const updatedEaten = {
          ...eatenWeekly,
          [key]: true
        };
        setEatenWeekly(updatedEaten);
        localStorage.setItem(`eaten_weekly_${userEmail}`, JSON.stringify(updatedEaten));
        setIsReplanModalOpen(false);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to replan meals. Ensure backend is running.");
    } finally {
      setReplanProgress(false);
    }
  };

  const openRecipeModal = async (rawFoodString) => {
    if (!rawFoodString || rawFoodString.includes("pending")) return;
    const rawName = rawFoodString.split('-')[0].split('(')[0].trim();
    setSelectedFoodName(rawName);
    setIsRecipeModalOpen(true);
    setLoadingRecipe(true);
    setRecipeData(null);
    try {
      const response = await axios.post(`http://${window.location.hostname}:5000/api/recipe`, {
        food_name: rawName
      });
      if (response.data.success) {
        setRecipeData(response.data.recipe);
      } else {
        throw new Error(response.data.error || "Failed to generate recipe");
      }
    } catch (err) {
      console.error(err);
      setRecipeData({
        prep_time: "15 mins",
        ingredients: ["Ingredients for " + rawName],
        instructions: ["Prepare ingredients", "Cook in traditional style", "Serve hot"],
        macros: { protein: 5, carbs: 25, fats: 8, calories: 200 }
      });
    } finally {
      setLoadingRecipe(false);
    }
  };

  useEffect(() => {
    let i = 0;
    const adviceText = currentAdvice && !currentAdvice.includes("unavailable") 
      ? currentAdvice 
      : "Focus on whole, unprocessed foods rich in natural vitamins. Prioritize a balanced diet incorporating lean proteins and healthy fats.";
    
    setDisplayedAdvice(""); 
    const interval = setInterval(() => {
      setDisplayedAdvice(adviceText.slice(0, i));
      i++;
      if (i > adviceText.length) clearInterval(interval);
    }, 20);
    return () => clearInterval(interval);
  }, [currentAdvice]);

  const sortedDays = Object.keys(currentPlan).sort((a, b) => 
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  );

  const parseMeals = (dayText) => {
    if (!dayText) return { Breakfast: "", Lunch: "", Snack: "", Dinner: "", Calories: "" };
    const extract = (type) => {
      const regex = new RegExp(`\\[${type.toUpperCase()}\\]: (.*?) \\[END_MEAL\\]`);
      const match = dayText.match(regex);
      return match ? match[1] : "Selection pending...";
    };
    const calorieMatch = dayText.match(/\[CALORIE_COUNT\]: (\d+)/);
    
    return {
      Breakfast: extract("BREAKFAST"),
      Lunch: extract("LUNCH"),
      Snack: extract("SNACK"),
      Dinner: extract("DINNER"),
      Calories: calorieMatch ? `${calorieMatch[1]} kcal` : "Balanced"
    };
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData({ ...editFormData, [name]: value });
  };

  const handleSaveProfile = async () => {
    const age = parseInt(editFormData.age);
    const weight = parseFloat(editFormData.weight);
    const height = parseFloat(editFormData.height);

    if (isNaN(age) || age < 12 || age > 100) {
      alert("Age must be a valid number between 12 and 100 years.");
      return;
    }
    if (isNaN(weight) || weight < 30 || weight > 250) {
      alert("Weight must be a valid weight between 30 kg and 250 kg.");
      return;
    }
    if (isNaN(height) || height < 100 || height > 220) {
      alert("Height must be a valid height between 100 cm and 220 cm (approx. 3.3 ft to 7.2 ft).");
      return;
    }
    const computedBmi = weight / ((height / 100) * (height / 100));
    if (computedBmi < 10 || computedBmi > 60) {
      alert(`The calculated BMI (${computedBmi.toFixed(1)}) is outside realistic human limits (10 to 60). Please verify your height and weight.`);
      return;
    }

    setIsRecalculating(true);
    try {
      const payload = {
        email: userEmail,
        age: parseInt(editFormData.age),
        weight: parseFloat(editFormData.weight),
        height: parseFloat(editFormData.height) / 100,
        gender: editFormData.gender,
        goal: editFormData.goal,
        diet_preference: editFormData.diet
      };

      const response = await fetch("http://localhost:5000/api/nutrition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (data.success) {
        setCurrentPlan(data.weekly_plan);
        setCurrentAdvice(data.ai_advice);
        setCurrentDeficiency(data.deficiency_analysis);
        setCurrentMetrics({ target_cal: data.target_cal, bmr: data.bmr, tdee: data.tdee });
        setCurrentUserDetails(data.user_details);
        
        localStorage.setItem("activePlan", JSON.stringify({
          metrics: {
            target_cal: data.target_cal,
            bmr: data.bmr,
            tdee: data.tdee,
            age: data.user_details?.age,
            weight: data.user_details?.weight,
            height: data.user_details?.height,
            gender: data.user_details?.gender,
            goal: data.user_details?.goal,
            diet: data.user_details?.diet,
            exclusions: data.user_details?.exclusions || []
          },
          weekly_plan: data.weekly_plan,
          ai_advice: data.ai_advice,
          deficiency_analysis: data.deficiency_analysis,
          user_details: data.user_details
        }));

        setIsEditing(false);
      } else {
        alert("Failed to recalculate plan: " + data.error);
      }
    } catch (err) {
      alert("Network error connecting to backend.");
    } finally {
      setIsRecalculating(false);
    }
  };

  const openImageModal = (rawFoodString, mealType) => {
    if (!rawFoodString || rawFoodString.includes("pending")) return;

    const rawName = rawFoodString.split('-')[0].split('(')[0].trim();
    setSelectedFoodName(rawName);
    setIsModalOpen(true);
    setIsCombo(false);
    setComboImages({ img1: "", img2: "" });
    setSingleImage("");
    setIsImageLoading1(true);
    setIsImageLoading2(true);

    let cleanText = rawName.toLowerCase().replace(/[0-9]+/g, ''); 
    const stopWords = ['veg', 'vegetable', 'g', 'kg', 'ml', 'cup', 'cups', 'slice', 'slices', 'of', 'medium', 'large', 'small', 'bowl', 'pieces', 'piece', 'glass', 'whole'];
    cleanText = cleanText.split(' ').filter(word => !stopWords.includes(word.trim()) && word.trim().length > 0).join(' ').trim();

    const cacheVersion = 'v8';

    const getBingUrl = (queryText) => {
      const query = encodeURIComponent(`${queryText} authentic plated delicious photography`);
      return `https://tse2.mm.bing.net/th?q=${query}&w=600&h=400&c=7&rs=1&p=0&dpr=2&pid=1.7&mkt=en-IN&adlt=moderate`;
    };

    let comboMatch = null;
    if (cleanText.includes(" with ")) {
        comboMatch = cleanText.split(" with ").map(x => x.trim());
    } else if (cleanText.includes(" and ")) {
        comboMatch = cleanText.split(" and ").map(x => x.trim());
    }

    if (comboMatch && comboMatch.length >= 2) {
      setIsCombo(true);
      const [item1, item2] = comboMatch;
      
      let search1 = `${item1} Indian authentic style`;
      
      let search2 = `${item2} side dish`;
      if (item2.includes("brown rice")) {
          search2 = `whole grain brown rice side dish authentic`;
      }

      const url1 = getBingUrl(search1);
      const url2 = getBingUrl(search2);

      setComboImages({ img1: url1, img2: url2 });

    } else {
      const cacheKeySingle = `imgCache_single_${cacheVersion}_${cleanText}`;
      const cachedSingle = localStorage.getItem(cacheKeySingle);

      if (cachedSingle) {
          setSingleImage(cachedSingle);
          setIsImageLoading1(false);
          setIsImageLoading2(false);
          return;
      }

      let queryText = cleanText;
      if (mealType === 'Snack') {
          queryText = `${cleanText} fresh raw whole fruit isolated`;
      }
      
      const url = getBingUrl(queryText);
      setSingleImage(url);
    }
  };

  const generatePDF = () => {
    try {
      const doc = new jsPDF();
      const primaryColor = [16, 185, 129];
      
      doc.setFontSize(22);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("Foodie: Professional Nutrition Plan", 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Prepared for: ${userName} | Target: ${currentMetrics.target_cal} kcal/day`, 14, 28);

      let finalY = 35;

      const tableData = sortedDays.map(day => {
        const m = parseMeals(currentPlan[day]);
        const cleanItem = (item) => item.split('(')[0].trim();
        return [ day, cleanItem(m.Breakfast), cleanItem(m.Lunch), cleanItem(m.Snack), cleanItem(m.Dinner), m.Calories ];
      });

      autoTable(doc, {
        startY: finalY,
        head: [['Day', 'Breakfast', 'Lunch', 'Snack', 'Dinner', 'Calories']],
        body: tableData,
        headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 4, valign: 'middle' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: { 0: { fontStyle: 'bold', textColor: primaryColor } }
      });

      doc.save(`Foodie_Plan_${userName}_${new Date().toLocaleDateString()}.pdf`);
    } catch (err) {
      alert("Error generating PDF. Check console.");
    }
  };

  return (
    <div style={styles.container}>
      <style>{`
        .meal-hover-effect { display: inline-flex; align-items: center; transition: all 0.2s ease-in-out; }
        .meal-hover-effect:hover { color: #10b981 !important; text-decoration-color: #10b981 !important; transform: translateX(4px); }
        .meal-hover-effect:hover .camera-icon { opacity: 1 !important; color: #10b981 !important; }
        .meal-box-card {
          transition: all 0.25s ease-in-out !important;
        }
        .meal-box-card:hover {
          background-color: #ecfdf5 !important;
          border-color: #a7f3d0 !important;
          transform: translateY(-2px) scale(1.01);
          box-shadow: 0 8px 20px rgba(16, 185, 129, 0.1) !important;
        }
      `}</style>

      {isRecalculating && (
        <div style={styles.modalOverlay}>
          <div style={styles.loadingBox}>
            <FontAwesomeIcon icon={faSpinner} spin size="4x" color="#10b981" />
            <h2 style={{ color: '#fff', marginTop: '20px' }}>Recalculating your macros...</h2>
            <p style={{ color: '#cbd5e1' }}>Generating a new AI-optimized plan based on your updated profile.</p>
          </div>
        </div>
      )}

      {/* MODAL UI */}
      {isModalOpen && (
        <div style={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button style={styles.closeBtn} onClick={() => setIsModalOpen(false)}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
            <h3 style={styles.modalTitle}>{selectedFoodName}</h3>
            
            {isCombo ? (
              <div style={styles.comboImageRow}>
                  <div style={styles.imageContainerCombo}>
                      {isImageLoading1 && (
                          <div style={styles.loadingBoxInside}>
                              <FontAwesomeIcon icon={faSpinner} spin size="3x" color="#10b981" />
                              <p style={{ color: '#64748b' }}>Item 1...</p>
                          </div>
                      )}
                      <img 
                          src={comboImages.img1} 
                          alt="Combo Item 1" 
                          style={{ ...styles.foodImageCombo, display: isImageLoading1 ? 'none' : 'block' }} 
                          onLoad={() => { setIsImageLoading1(false); }}
                          onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "https://images.unsplash.com/photo-1512621843614-b346415cca10?w=600&h=400&fit=crop";
                              setIsImageLoading1(false);
                          }}
                      />
                  </div>
                  
                  <div style={styles.imageContainerCombo}>
                      {isImageLoading2 && (
                          <div style={styles.loadingBoxInside}>
                              <FontAwesomeIcon icon={faSpinner} spin size="3x" color="#10b981" />
                              <p style={{ color: '#64748b' }}>Item 2...</p>
                          </div>
                      )}
                      <img 
                          src={comboImages.img2} 
                          alt="Combo Item 2" 
                          style={{ ...styles.foodImageCombo, display: isImageLoading2 ? 'none' : 'block' }} 
                          onLoad={() => { setIsImageLoading2(false); }}
                          onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "https://images.unsplash.com/photo-1512621843614-b346415cca10?w=600&h=400&fit=crop";
                              setIsImageLoading2(false);
                          }}
                      />
                  </div>
              </div>
            ) : (
              <div style={styles.imageContainer}>
                {isImageLoading1 && (
                  <div style={styles.loadingBoxInside}>
                    <FontAwesomeIcon icon={faSpinner} spin size="3x" color="#10b981" />
                    <p style={{ color: '#64748b' }}>Fetching food photo...</p>
                  </div>
                )}
                <img 
                  src={singleImage} 
                  alt={selectedFoodName} 
                  style={{ ...styles.foodImage, display: isImageLoading1 ? 'none' : 'block' }} 
                  onLoad={() => {
                      setIsImageLoading1(false);
                      const cacheVersion = 'v8';
                      let cleanText = selectedFoodName.split('-')[0].split('(')[0].trim().toLowerCase().replace(/[0-9]+/g, ''); 
                      const stopWords = ['veg', 'vegetable', 'g', 'kg', 'ml', 'cup', 'cups', 'slice', 'slices', 'of', 'medium', 'large', 'small', 'bowl', 'pieces', 'piece', 'glass', 'whole'];
                      cleanText = cleanText.split(' ').filter(word => !stopWords.includes(word.trim()) && word.trim().length > 0).join(' ').trim();
                      localStorage.setItem(`imgCache_single_${cacheVersion}_${cleanText}`, singleImage);
                  }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://images.unsplash.com/photo-1512621843614-b346415cca10?w=600&h=400&fit=crop";
                    setIsImageLoading1(false);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ ...styles.mainTitle, margin: 0, fontSize: '28px' }}>Diet & Macros Analysis</h1>
        <button style={styles.newPlanBtn} onClick={() => navigate("/inputs")}>
          <FontAwesomeIcon icon={faArrowLeft} style={{marginRight: '8px'}}/> Re-Generate Plan
        </button>
      </div>

      <div style={styles.userCard}>
        <div style={styles.userCardHeader}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <FontAwesomeIcon icon={faUser} style={{ color: '#10b981', marginRight: '10px' }} />
            {userName}'s Profile & Metrics
          </div>
          {!isEditing ? (
            <button onClick={() => { 
              const displayHeight = currentUserDetails.height 
                ? (currentUserDetails.height < 10 
                    ? Math.round(currentUserDetails.height * 100) 
                    : Math.round(currentUserDetails.height)) 
                : '';
              setEditFormData({ ...currentUserDetails, height: displayHeight }); 
              setIsEditing(true); 
            }} style={styles.editBtn}>
              <FontAwesomeIcon icon={faEdit} style={{ marginRight: '6px' }} /> Edit Details
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setIsEditing(false)} style={styles.cancelBtn}>Cancel</button>
              <button onClick={handleSaveProfile} style={styles.saveBtn}>
                <FontAwesomeIcon icon={faSave} style={{ marginRight: '6px' }} /> Save & Recalculate
              </button>
            </div>
          )}
        </div>

        <div style={styles.userDetailsContent}>
          <div style={styles.inputsGrid}>
            <div style={styles.inputBadge}>
              <span style={styles.inputLabel}>Age</span>
              {isEditing ? (
                <input type="number" name="age" value={editFormData.age || ''} onChange={handleInputChange} style={styles.editInput} />
              ) : (
                <span style={styles.inputValue}>{currentUserDetails?.age || "--"} yrs</span>
              )}
            </div>
            <div style={styles.inputBadge}>
              <span style={styles.inputLabel}>Gender</span>
              {isEditing ? (
                <select name="gender" value={editFormData.gender || ''} onChange={handleInputChange} style={styles.editInput}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              ) : (
                <span style={{...styles.inputValue, textTransform: 'capitalize'}}>{currentUserDetails?.gender || "--"}</span>
              )}
            </div>
            <div style={styles.inputBadge}>
              <span style={styles.inputLabel}>Weight (kg)</span>
              {isEditing ? (
                <input type="number" name="weight" value={editFormData.weight || ''} onChange={handleInputChange} style={styles.editInput} />
              ) : (
                <span style={styles.inputValue}>{currentUserDetails?.weight || "--"} kg</span>
              )}
            </div>
            <div style={styles.inputBadge}>
              <span style={styles.inputLabel}>Height (cm)</span>
              {isEditing ? (
                <input type="number" name="height" value={editFormData.height || ''} onChange={handleInputChange} style={styles.editInput} />
              ) : (
                <span style={styles.inputValue}>
                  {currentUserDetails?.height 
                    ? (currentUserDetails.height < 10 
                        ? Math.round(currentUserDetails.height * 100) 
                        : Math.round(currentUserDetails.height)) 
                    : "--"
                  } cm
                </span>
              )}
            </div>
            <div style={styles.inputBadge}>
              <span style={styles.inputLabel}>Diet</span>
              {isEditing ? (
                <select name="diet" value={editFormData.diet || ''} onChange={handleInputChange} style={styles.editInput}>
                  <option value="vegetarian">Vegetarian</option>
                  <option value="non-vegetarian">Non-Vegetarian</option>
                  <option value="vegan">Vegan</option>
                </select>
              ) : (
                <span style={{...styles.inputValue, textTransform: 'capitalize'}}>{currentUserDetails?.diet || "--"}</span>
              )}
            </div>
            <div style={styles.inputBadge}>
              <span style={styles.inputLabel}>Goal</span>
              {isEditing ? (
                <select name="goal" value={editFormData.goal || ''} onChange={handleInputChange} style={styles.editInput}>
                  <option value="maintenance">Maintenance</option>
                  <option value="fat loss">Fat Loss</option>
                  <option value="muscle gain">Bulking / Muscle Gain</option>
                  <option value="endurance">Endurance/Cardio</option>
                  <option value="strength">Strength/Power</option>
                </select>
              ) : (
                <span style={{...styles.inputValue, textTransform: 'capitalize'}}>{currentUserDetails?.goal || "Maintenance"}</span>
              )}
            </div>
          </div>
          <div style={styles.circlesWrapper}>
            <div style={{...styles.circleBox, borderColor: '#64748b'}}>
              <span style={styles.circleValue}>{currentMetrics.bmr || "--"}</span>
              <span style={styles.circleLabel}>BMR</span>
            </div>
            <div style={{...styles.circleBox, borderColor: '#334155'}}>
              <span style={styles.circleValue}>{currentMetrics.tdee || "--"}</span>
              <span style={styles.circleLabel}>TDEE</span>
            </div>
            <div style={{...styles.circleBox, borderColor: '#10b981'}}>
              <span style={styles.circleValue}>{currentMetrics.target_cal || "--"}</span>
              <span style={styles.circleLabel}>TARGET</span>
            </div>
          </div>
        </div>
      </div>

      <div style={styles.heroAdvice}>
        <div style={styles.adviceHeader}>
          <FontAwesomeIcon icon={faLightbulb} style={{ color: '#f59e0b', fontSize: '20px' }} />
          <span style={styles.heroLabel}>AI EXPERT ADVICE</span>
        </div>
        <p style={styles.adviceText}>{displayedAdvice}<span style={styles.cursor}>|</span></p>
      </div>

      {currentDeficiency && (
        <div style={styles.recoverySection}>
          <h2 style={styles.sectionTitle}>
            <FontAwesomeIcon icon={faStethoscope} style={{ color: '#10b981', marginRight: '12px' }} />
            Targeted Recovery Strategy
          </h2>
          <div style={styles.recoveryListContainer}>
            <div style={styles.tableHeader}>
              <span style={{flex: 1.5}}>Symptom</span>
              <span style={{flex: 2}}>Recommended Food</span>
              <span style={{flex: 1.5}}>Key Nutrient</span>
              <span style={{flex: 1}}>Qty</span>
            </div>
            {String(currentDeficiency || "")
              .split('\n')
              .filter(line => line.includes('|'))
              .map((line, index) => {
                const parts = line.split('|').map(item => item.trim());
                if (parts.length < 4) return null;
                const [symptom, food, nutrient, qty] = parts;
                return (
                  <div key={index} style={styles.recoveryRow}>
                    <div style={styles.bulletIcon}><FontAwesomeIcon icon={faAppleAlt} /></div>
                    <span style={{flex: 1.5, fontWeight: '700'}}>{symptom}</span>
                    <span style={{flex: 2}}>{food}</span>
                    <span style={{flex: 1.5, color: '#10b981'}}>{nutrient}</span>
                    <span style={{flex: 1, fontWeight: '700'}}>{qty}</span>
                  </div>
                );
            })}
          </div>
        </div>
      )}

      <div style={styles.strategyHeader}>
        <h1 style={styles.mainTitle}>Weekly Nutrition Strategy</h1>
        <div style={styles.targetBadge}>{currentMetrics.target_cal} kcal / Day</div>
      </div>

      <div style={styles.grid}>
        {sortedDays.map((day) => {
          const meals = parseMeals(currentPlan[day]);
          const highlightDay = location.state?.highlightDay || "";
          const isTodayHighlight = (highlightDay && day === highlightDay) || (!highlightDay && day === `Day ${new Date().getDay() === 0 ? 7 : new Date().getDay()}`);
          return (
            <div key={day} style={{
              ...styles.dayCard,
              border: isTodayHighlight ? '2px solid #10b981' : '1px solid #e2e8f0',
              boxShadow: isTodayHighlight ? '0 10px 25px rgba(16, 185, 129, 0.15)' : 'none',
              transform: isTodayHighlight ? 'scale(1.02)' : 'none',
              transition: 'all 0.3s ease'
            }}>
              <div style={styles.cardHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={styles.dayLabel}>{day}</h3>
                  {isTodayHighlight && (
                    <span style={{ background: '#10b981', color: '#fff', fontSize: '9px', fontWeight: '850', padding: '2px 6px', borderRadius: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Today
                    </span>
                  )}
                </div>
                <span style={styles.caloriePill}>
                  <FontAwesomeIcon icon={faFire} style={{marginRight: '5px'}} /> {meals.Calories}
                </span>
              </div>
              <div style={styles.mealList}>
                {['Breakfast', 'Lunch', 'Snack', 'Dinner'].map(type => {
                  const key = `${day}_${type}`;
                  const isChecked = eatenWeekly[key];
                  return (
                    <div key={type} className="meal-box-card" style={{
                      ...styles.mealBox,
                      borderLeft: isChecked ? '4px solid #10b981' : '1px solid #e2e8f0',
                      background: isChecked ? '#f8fafc' : '#fff',
                      opacity: isChecked ? 0.75 : 1,
                      transition: 'all 0.2s ease'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => toggleEatenWeekly(day, type)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: isChecked ? '#10b981' : '#cbd5e1',
                              cursor: 'pointer',
                              padding: 0,
                              fontSize: '16px',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                            title={isChecked ? "Mark as Uneaten" : "Mark as Eaten"}
                          >
                            <span style={{ fontSize: '18px', lineHeight: '1' }}>{isChecked ? '✅' : '⚪'}</span>
                          </button>
                          <span style={{
                            ...styles.mealLabel,
                            textDecoration: isChecked ? 'line-through' : 'none',
                            color: isChecked ? '#64748b' : '#334155'
                          }}>{type}</span>
                        </div>
                      </div>
                      <span style={{ 
                        fontSize: '14px', 
                        color: isChecked ? '#64748b' : '#1e293b', 
                        fontWeight: '750',
                        textDecoration: isChecked ? 'line-through' : 'none',
                        marginBottom: '8px'
                      }}>
                        {meals[type]}
                      </span>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                        <button 
                          onClick={() => {
                            setReplanMealType(type.toLowerCase());
                            setReplanDay(day);
                            setCustomBName("");
                            setCustomBCal("");
                            setIsReplanModalOpen(true);
                          }}
                          style={{ background: '#fef3c7', border: 'none', color: '#d97706', cursor: 'pointer', fontSize: '10px', fontWeight: '850', padding: '4px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          title={`Ate a different ${type.toLowerCase()}? Re-plan remaining meals.`}
                        >
                          🍽️ Alternative
                        </button>
                        <button 
                          onClick={() => openImageModal(meals[type], type)}
                          style={{ background: '#f1f5f9', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '10px', fontWeight: '800', padding: '4px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          title="View Food Photo"
                        >
                          <FontAwesomeIcon icon={faCamera} /> Photo
                        </button>
                        <button 
                          onClick={() => openRecipeModal(meals[type])}
                          style={{ background: '#ecfdf5', border: 'none', color: '#059669', cursor: 'pointer', fontSize: '10px', fontWeight: '800', padding: '4px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          title="View AI Recipe"
                        >
                          🍳 Recipe
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <footer style={styles.footer}>
        <button style={styles.downloadBtn} onClick={generatePDF}>
          <FontAwesomeIcon icon={faDownload} style={{marginRight: '8px'}}/> Export PDF
        </button>
        {/* 🔥 UPDATED WORKOUT BUTTON WITH GENDER PROP */}
        <button 
          style={styles.workoutBtn} 
          onClick={() => navigate("/workouts", { 
            state: { 
              goal: currentUserDetails?.goal || "maintenance",
              gender: currentUserDetails?.gender || "male"
            } 
          })}
        >
          <FontAwesomeIcon icon={faDumbbell} style={{marginRight: '8px'}}/> Get 45-Min Workout
        </button>
        <button style={styles.homeBtn} onClick={() => navigate("/dashboard")}>
          <FontAwesomeIcon icon={faHome} style={{marginRight: '8px'}}/> View Dashboard
        </button>
      </footer>

      {/* RECIPE DETAILS MODAL */}
      {isRecipeModalOpen && (
        <div style={styles.modalOverlay} onClick={() => setIsRecipeModalOpen(false)}>
          <div style={{...styles.modalContent, maxWidth: '580px', maxHeight: '85vh', overflowY: 'auto'}} onClick={(e) => e.stopPropagation()}>
            <button style={styles.closeBtn} onClick={() => setIsRecipeModalOpen(false)}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
            
            {loadingRecipe ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <FontAwesomeIcon icon={faSpinner} spin size="3x" color="#10b981" />
                <h3 style={{ marginTop: '20px', color: '#1e293b', fontWeight: '800' }}>Generating AI Recipe...</h3>
                <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>Curating ingredients, preparation steps, and macros via Gemini.</p>
              </div>
            ) : recipeData ? (
              <div style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                <h3 style={{...styles.modalTitle, borderBottom: '2px solid #f1f5f9', paddingBottom: '12px', marginBottom: '15px'}}>🍳 Recipe: {selectedFoodName}</h3>
                
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  <span style={{ background: '#f8fafc', color: '#475569', px: '10px', py: '6px', borderRadius: '8px', fontSize: '11px', fontWeight: '800', border: '1px solid #e2e8f0', padding: '6px 12px' }}>
                    ⏱️ Prep: {recipeData.prep_time}
                  </span>
                  <span style={{ background: '#ecfdf5', color: '#047857', px: '10px', py: '6px', borderRadius: '8px', fontSize: '11px', fontWeight: '800', border: '1px solid #a7f3d0', padding: '6px 12px' }}>
                    💪 Protein: {recipeData.macros?.protein || recipeData.macros?.protein_g || 0}g
                  </span>
                  <span style={{ background: '#f8fafc', color: '#475569', px: '10px', py: '6px', borderRadius: '8px', fontSize: '11px', fontWeight: '800', border: '1px solid #e2e8f0', padding: '6px 12px' }}>
                    🍞 Carbs: {recipeData.macros?.carbs || recipeData.macros?.carbs_g || 0}g
                  </span>
                  <span style={{ background: '#f1f5f9', color: '#334155', px: '10px', py: '6px', borderRadius: '8px', fontSize: '11px', fontWeight: '800', border: '1px solid #cbd5e1', padding: '6px 12px' }}>
                    🧈 Fats: {recipeData.macros?.fats || recipeData.macros?.fats_g || 0}g
                  </span>
                  <span style={{ background: '#0f172a', color: '#10b981', px: '10px', py: '6px', borderRadius: '8px', fontSize: '11px', fontWeight: '800', padding: '6px 12px' }}>
                    🔥 {recipeData.macros?.calories || 0} kcal
                  </span>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🛒 Ingredients</h4>
                  <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '13px', color: '#334155', lineHeight: '1.6' }}>
                    {(recipeData.ingredients || []).map((ing, idx) => (
                      <li key={idx} style={{ marginBottom: '4px' }}>{ing}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📖 Instructions</h4>
                  <ol style={{ paddingLeft: '20px', margin: 0, fontSize: '13px', color: '#334155', lineHeight: '1.6' }}>
                    {(recipeData.instructions || []).map((step, idx) => (
                      <li key={idx} style={{ marginBottom: '8px' }}>{step}</li>
                    ))}
                  </ol>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <p style={{ color: '#ef4444', fontWeight: '600' }}>Unable to load recipe details. Please try again.</p>
              </div>
            )}
          </div>
        </div>
      )}
      {/* RE-PLAN ALTERNATIVE BREAKFAST MODAL */}
      {isReplanModalOpen && (
        <div style={styles.modalOverlay} onClick={() => setIsReplanModalOpen(false)}>
          <div style={{...styles.modalContent, maxWidth: '440px', padding: '24px'}} onClick={(e) => e.stopPropagation()}>
            <button style={styles.closeBtn} onClick={() => setIsReplanModalOpen(false)}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
            <h3 style={{...styles.modalTitle, marginBottom: '8px'}}>Alternative {replanMealType.charAt(0).toUpperCase() + replanMealType.slice(1)}</h3>
            <p style={{fontSize: '12px', color: '#64748b', marginBottom: '20px'}}>
              Log what you ate instead for <strong>{replanDay}</strong>. The AI engine will automatically recalculate subsequent meals to balance your macros.
            </p>
            
            <div style={{display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px'}}>
              <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
                <label style={{fontSize: '10px', color: '#64748b', fontWeight: '850', textTransform: 'uppercase'}}>Food Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Masala Dosa" 
                  value={customBName}
                  onChange={(e) => setCustomBName(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    fontSize: '14px',
                    fontWeight: '700',
                    color: '#334155',
                    outline: 'none',
                    fontFamily: 'Arial, Helvetica, sans-serif'
                  }}
                />
              </div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
                  <label style={{fontSize: '10px', color: '#64748b', fontWeight: '850', textTransform: 'uppercase'}}>Quantity</label>
                  <input 
                    type="number" 
                    min="0.25"
                    step="0.25"
                    value={customBQty}
                    onChange={(e) => setCustomBQty(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '12px 16px',
                      fontSize: '14px',
                      fontWeight: '700',
                      color: '#334155',
                      outline: 'none',
                      fontFamily: 'Arial, Helvetica, sans-serif'
                    }}
                  />
                </div>
                <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
                  <label style={{fontSize: '10px', color: '#64748b', fontWeight: '850', textTransform: 'uppercase'}}>Unit</label>
                  <select 
                    value={customBUnit}
                    onChange={(e) => setCustomBUnit(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '12px 16px',
                      fontSize: '14px',
                      fontWeight: '700',
                      color: '#334155',
                      outline: 'none',
                      fontFamily: 'Arial, Helvetica, sans-serif'
                    }}
                  >
                    <option value="pieces">piece(s)</option>
                    <option value="plates">plate(s)</option>
                    <option value="cups">cup(s)</option>
                    <option value="bowls">bowl(s)</option>
                    <option value="grams">gram(s)</option>
                  </select>
                </div>
              </div>
              <button
                type="button"
                onClick={handleEstimateCalories}
                disabled={estimatingLoading || !customBName}
                style={{
                  width: '100%',
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  color: '#065f46',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '800',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  fontFamily: 'Arial, Helvetica, sans-serif',
                  opacity: (estimatingLoading || !customBName) ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {estimatingLoading ? 'Calculating...' : '⚡ Get AI Calorie Estimate'}
              </button>
              <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
                <label style={{fontSize: '10px', color: '#64748b', fontWeight: '850', textTransform: 'uppercase'}}>Calories (kcal)</label>
                <input 
                  type="number" 
                  placeholder="e.g. 350" 
                  value={customBCal}
                  onChange={(e) => setCustomBCal(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    fontSize: '14px',
                    fontWeight: '700',
                    color: '#334155',
                    outline: 'none',
                    fontFamily: 'Arial, Helvetica, sans-serif'
                  }}
                />
              </div>
            </div>
            
            <div style={{display: 'flex', gap: '12px', justifyContent: 'flex-end'}}>
              <button 
                onClick={() => setIsReplanModalOpen(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  color: '#475569',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '800',
                  padding: '12px 20px',
                  borderRadius: '12px',
                  fontFamily: 'Arial, Helvetica, sans-serif'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={handleExecuteReplan}
                disabled={replanProgress || !customBName || !customBCal}
                style={{
                  background: '#10b981',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '800',
                  padding: '12px 20px',
                  borderRadius: '12px',
                  fontFamily: 'Arial, Helvetica, sans-serif',
                  opacity: (replanProgress || !customBName || !customBCal) ? 0.6 : 1
                }}
              >
                {replanProgress ? 'Re-planning...' : 'Re-plan Day'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { padding: '40px 60px', background: '#f8fafc', minHeight: '100vh', fontFamily: "Arial, Helvetica, sans-serif" },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' },
  logoGroup: { display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' },
  logoImg: { width: '45px', height: '45px', borderRadius: '10px' },
  logoText: { fontSize: '28px', fontWeight: '800', color: '#10b981' },
  newPlanBtn: { padding: '10px 24px', background: '#fff', color: '#10b981', border: '2px solid #10b981', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' },
  userCard: { background: '#fff', padding: '30px', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', marginBottom: '40px' },
  userCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '22px', fontWeight: '800', color: '#1e293b', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px', marginBottom: '20px' },
  editBtn: { background: '#f1f5f9', color: '#64748b', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' },
  saveBtn: { background: '#10b981', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' },
  cancelBtn: { background: 'transparent', color: '#94a3b8', border: 'none', padding: '8px 16px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' },
  userDetailsContent: { display: 'flex', flexWrap: 'wrap', gap: '30px', justifyContent: 'space-between', alignItems: 'center' },
  inputsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '15px', flex: 1 },
  inputBadge: { display: 'flex', flexDirection: 'column', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', minHeight: '62px', justifyContent: 'center' },
  inputLabel: { color: '#94a3b8', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' },
  inputValue: { color: '#0f172a', fontSize: '14px', fontWeight: '700' },
  editInput: { width: '100%', padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', fontWeight: '600', color: '#1e293b', outline: 'none' },
  circlesWrapper: { display: 'flex', gap: '15px' },
  circleBox: { width: '90px', height: '90px', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '5px solid', backgroundColor: '#fff' },
  circleValue: { fontSize: '16px', fontWeight: '900' },
  circleLabel: { fontSize: '9px', fontWeight: '800', color: '#64748b' },
  heroAdvice: { background: '#fff', padding: '30px', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', marginBottom: '40px', borderLeft: '8px solid #f59e0b' },
  adviceHeader: { display: 'flex', alignItems: 'center', marginBottom: '15px' },
  heroLabel: { marginLeft: '12px', fontWeight: '800', color: '#f59e0b', fontSize: '14px' },
  adviceText: { margin: 0, color: '#334155', fontSize: '18px', fontWeight: '500', minHeight: '54px' },
  cursor: { color: '#10b981', fontWeight: 'bold' },
  recoverySection: { marginBottom: '50px' },
  sectionTitle: { fontSize: '22px', fontWeight: '800', color: '#1e293b', marginBottom: '20px', display: 'flex', alignItems: 'center' },
  recoveryListContainer: { background: '#ffffff', borderRadius: '16px', padding: '10px 20px', border: '1px solid #e2e8f0' },
  tableHeader: { display: 'flex', padding: '12px 0 12px 47px', borderBottom: '2px solid #f1f5f9', fontSize: '12px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' },
  recoveryRow: { display: 'flex', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid #f1f5f9' },
  bulletIcon: { background: '#ecfdf5', color: '#10b981', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '15px' },
  strategyHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '30px', borderBottom: '2px solid #e2e8f0', paddingBottom: '20px' },
  mainTitle: { color: '#1e293b', fontSize: '32px', fontWeight: '800' },
  targetBadge: { background: '#1e293b', color: '#fff', padding: '8px 20px', borderRadius: '30px', fontWeight: '700' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px' },
  dayCard: { background: '#fff', padding: '25px', borderRadius: '24px', boxShadow: '0 15px 35px rgba(0,0,0,0.05)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  dayLabel: { fontSize: '20px', color: '#10b981', fontWeight: '800' },
  caloriePill: { background: '#ecfdf5', color: '#059669', padding: '6px 14px', borderRadius: '50px', fontSize: '12px', fontWeight: '800' },
  mealList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  mealBox: { background: '#f8fafc', padding: '12px 15px', borderRadius: '12px', display: 'flex', flexDirection: 'column', border: '1px solid #edf2f7' },
  mealLabel: { fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' },
  clickableMealValue: { fontSize: '14px', color: '#0ea5e9', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: '#bae6fd' },
  footer: { marginTop: '60px', textAlign: 'center', paddingBottom: '80px', display: 'flex', justifyContent: 'center', gap: '20px' },
  downloadBtn: { padding: '16px 40px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '16px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  workoutBtn: { padding: '16px 40px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '16px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', marginLeft: '15px' },
  homeBtn: { padding: '16px 40px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: '16px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', marginLeft: '15px' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 1000, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(8px)' },
  modalContent: { background: '#fff', padding: '30px', borderRadius: '24px', width: '90%', maxWidth: '800px', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }, 
  closeBtn: { position: 'absolute', top: '15px', right: '15px', background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '50%', color: '#64748b', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  modalTitle: { margin: '0 0 20px 0', color: '#1e293b', fontSize: '22px', fontWeight: '800' },
  imageContainer: { width: '100%', height: '300px', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#f1f5f9', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  foodImage: { width: '100%', height: '100%', objectFit: 'cover' },
  loadingBoxInside: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' },
  comboImageRow: { display: 'flex', gap: '20px', width: '100%' },
  imageContainerCombo: { flex: 1, height: '300px', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#f1f5f9', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  foodImageCombo: { width: '100%', height: '100%', objectFit: 'cover' },
};

export default ResultPage;