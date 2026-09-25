import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faFire, faAppleAlt, faArrowRight, faWeight, faRulerVertical, 
  faCalculator, faRunning, faExclamationCircle, faCheck, faLock, faClock, faLeaf, faTint, faPlus, faMinus, faFilePdf
} from '@fortawesome/free-solid-svg-icons';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const TrackerDashboard = () => {
  const navigate = useNavigate();
  const userEmail = localStorage.getItem("currentUserEmail") || "guest@example.com";
  const userName = localStorage.getItem("userName") || "User";

  // State for user details and metrics
  const [metrics, setMetrics] = useState({
    target_cal: 2000,
    bmr: 1600,
    tdee: 2400,
    age: 24,
    weight: 70,
    height: 1.75,
    gender: 'male',
    goal: 'maintenance',
    diet: 'vegetarian'
  });
  
  const [hasPlan, setHasPlan] = useState(false);
  const [loading, setLoading] = useState(true);

  // Calorie and meal state
  const [eatenMeals, setEatenMeals] = useState({
    breakfast: false,
    lunch: false,
    snack: false,
    dinner: false
  });

  const [customMeals, setCustomMeals] = useState({
    breakfast: null,
    lunch: null,
    snack: null,
    dinner: null
  });
  const [activeCustomForm, setActiveCustomForm] = useState(null); // 'breakfast', 'lunch', 'snack', 'dinner' or null
  const [unlockedMeals, setUnlockedMeals] = useState({});
  const [currentPlan, setCurrentPlan] = useState({});

  // Water Tracker State
  const [waterGlasses, setWaterGlasses] = useState(0);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const saved = localStorage.getItem(`water_${userEmail}_${today}`);
    if (saved) setWaterGlasses(parseInt(saved));
  }, [userEmail]);

  const addWater = () => {
    const today = new Date().toISOString().split('T')[0];
    const newValue = Math.min(waterGlasses + 1, 15);
    setWaterGlasses(newValue);
    localStorage.setItem(`water_${userEmail}_${today}`, newValue);
  };

  const removeWater = () => {
    const today = new Date().toISOString().split('T')[0];
    const newValue = Math.max(waterGlasses - 1, 0);
    setWaterGlasses(newValue);
    localStorage.setItem(`water_${userEmail}_${today}`, newValue);
  };

  const getTodayDayKey = () => {
    const today = new Date();
    // Monday is Day 1, Sunday is Day 7
    const dayIndex = today.getDay();
    const dayNum = dayIndex === 0 ? 7 : dayIndex;
    return `Day ${dayNum}`;
  };

  const getMealStatus = (mealKey) => {
    const hour = new Date().getHours();
    if (mealKey === 'breakfast') {
      if (hour < 12) return { status: 'open', label: 'Active', time: '12 AM - 12 PM' };
      return { status: 'closed', label: 'Closed at 12 PM', time: '12 AM - 12 PM' };
    }
    if (mealKey === 'lunch') {
      if (hour < 12) return { status: 'future', label: 'Opens at 12 PM', time: '12 PM - 4 PM' };
      if (hour < 16) return { status: 'open', label: 'Active', time: '12 PM - 4 PM' };
      return { status: 'closed', label: 'Closed at 4 PM', time: '12 PM - 4 PM' };
    }
    if (mealKey === 'snack') {
      if (hour < 16) return { status: 'future', label: 'Opens at 4 PM', time: '4 PM - 7 PM' };
      if (hour < 19) return { status: 'open', label: 'Active', time: '4 PM - 7 PM' };
      return { status: 'closed', label: 'Closed at 7 PM', time: '4 PM - 7 PM' };
    }
    if (mealKey === 'dinner') {
      if (hour < 19) return { status: 'future', label: 'Opens at 7 PM', time: '7 PM - 11 PM' };
      if (hour < 23) return { status: 'open', label: 'Active', time: '7 PM - 11 PM' };
      return { status: 'closed', label: 'Closed at 11 PM', time: '7 PM - 11 PM' };
    }
    return { status: 'closed', label: 'Closed', time: '' };
  };

  const parseMeals = (dayText) => {
    if (!dayText) return { Breakfast: "", Lunch: "", Snack: "", Dinner: "", Calories: "" };
    const extract = (type) => {
      const regex = new RegExp(`\\[${type.toUpperCase()}\\]: (.*?) \\[END_MEAL\\]`);
      const match = dayText.match(regex);
      return match ? match[1] : "";
    };
    const calorieMatch = dayText.match(/\[CALORIE_COUNT\]: (\d+)/);
    return {
      Breakfast: extract("BREAKFAST"),
      Lunch: extract("LUNCH"),
      Snack: extract("SNACK"),
      Dinner: extract("DINNER"),
      Calories: calorieMatch ? `${calorieMatch[1]} kcal` : ""
    };
  };

  const extractCalorie = (foodStr, defaultVal) => {
    if (!foodStr) return defaultVal;
    const match = foodStr.match(/\((\d+)\s*kcal\)/i);
    return match ? parseInt(match[1]) : defaultVal;
  };
  const [customMealName, setCustomMealName] = useState("");
  const [customMealCal, setCustomMealCal] = useState("");
  const [customMealQty, setCustomMealQty] = useState("1");
  const [customMealUnit, setCustomMealUnit] = useState("pieces");
  const [replanSuccessAlert, setReplanSuccessAlert] = useState(false);
  const [reminderAlert, setReminderAlert] = useState(null);
  const [replanLoading, setReplanLoading] = useState(false);
  const [estimatingLoading, setEstimatingLoading] = useState(false);

  const handleEstimateCalories = async () => {
    if (!customMealName) {
      alert("Please enter a food name first!");
      return;
    }
    setEstimatingLoading(true);
    try {
      const res = await axios.post(`http://${window.location.hostname}:5000/api/estimate-calories`, {
        food_name: customMealName,
        quantity: parseFloat(customMealQty || 1),
        unit: customMealUnit
      });
      if (res.data.success) {
        setCustomMealCal(res.data.calories);
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

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const saved = localStorage.getItem(`eaten_meals_${userEmail}_${today}`);
    if (saved) {
      try {
        setEatenMeals(JSON.parse(saved));
      } catch (err) {
        console.error("Failed to parse eaten meals:", err);
      }
    }
  }, [userEmail]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const savedNew = localStorage.getItem(`custom_meals_${userEmail}_${today}`);
    if (savedNew) {
      try {
        setCustomMeals(JSON.parse(savedNew));
      } catch (err) {
        console.error("Failed to parse custom meals:", err);
      }
    } else {
      const savedOld = localStorage.getItem(`custom_breakfast_${userEmail}_${today}`);
      if (savedOld) {
        try {
          const parsed = JSON.parse(savedOld);
          setCustomMeals({
            breakfast: parsed,
            lunch: null,
            snack: null,
            dinner: null
          });
        } catch (err) {}
      }
    }
  }, [userEmail]);

  useEffect(() => {
    if (loading) return;
    
    const today = new Date().toISOString().split('T')[0];
    const currentHour = new Date().getHours();
    
    const mealChecks = [
      { key: 'breakfast', type: 'Breakfast', hourLimit: 12, displayLimit: "12 PM" },
      { key: 'lunch', type: 'Lunch', hourLimit: 16, displayLimit: "4 PM" },
      { key: 'snack', type: 'Snack', hourLimit: 19, displayLimit: "7 PM" },
      { key: 'dinner', type: 'Dinner', hourLimit: 23, displayLimit: "11 PM" }
    ];

    mealChecks.forEach(meal => {
      const notifiedKey = `meal_notified_${meal.type}_${userEmail}_${today}`;
      const wasNotified = localStorage.getItem(notifiedKey);
      
      // If past the hour limit, meal is not checked, and they haven't been notified today
      if (currentHour >= meal.hourLimit && !eatenMeals[meal.key] && !wasNotified) {
        axios.post(`http://${window.location.hostname}:5000/api/notify-forgot-meal`, { 
          email: userEmail,
          meal_type: meal.type
        })
        .then(res => {
          if (res.data.success) {
            localStorage.setItem(notifiedKey, 'true');
            setReminderAlert({
              title: `${meal.type} Reminder Sent!`,
              message: `We noticed you forgot to update your meal logger for ${meal.type} today before ${meal.displayLimit}. A polite reminder has been sent to your email.`
            });
            setTimeout(() => {
              setReminderAlert(null);
            }, 10000);
          }
        })
        .catch(err => console.error(`Error sending ${meal.type} notification:`, err));
      }
    });
  }, [eatenMeals, userEmail, loading]);

  // Calculate calories based on checks
  const mealCalorieSplits = (() => {
    const target = metrics.target_cal || 2000;
    const splits = {
      breakfast: Math.round(target * 0.25),
      lunch: Math.round(target * 0.35),
      snack: Math.round(target * 0.15),
      dinner: Math.round(target * 0.25)
    };

    // Try extracting from today's plan
    const todayKey = getTodayDayKey();
    const todayMealsText = currentPlan[todayKey] || "";
    const todayMeals = parseMeals(todayMealsText);

    if (todayMeals.Breakfast) splits.breakfast = extractCalorie(todayMeals.Breakfast, splits.breakfast);
    if (todayMeals.Lunch) splits.lunch = extractCalorie(todayMeals.Lunch, splits.lunch);
    if (todayMeals.Snack) splits.snack = extractCalorie(todayMeals.Snack, splits.snack);
    if (todayMeals.Dinner) splits.dinner = extractCalorie(todayMeals.Dinner, splits.dinner);

    if (customMeals.breakfast) {
      splits.breakfast = customMeals.breakfast.calories;
      const remaining = Math.max(100, target - splits.breakfast);
      splits.lunch = Math.round(remaining * (0.35 / 0.75));
      splits.snack = Math.round(remaining * (0.15 / 0.75));
      splits.dinner = Math.round(remaining * (0.25 / 0.75));
    }

    if (customMeals.lunch) {
      splits.lunch = customMeals.lunch.calories;
      const remaining = Math.max(100, target - splits.breakfast - splits.lunch);
      splits.snack = Math.round(remaining * (0.15 / 0.40));
      splits.dinner = Math.round(remaining * (0.25 / 0.40));
    }

    if (customMeals.snack) {
      splits.snack = customMeals.snack.calories;
      const remaining = Math.max(100, target - splits.breakfast - splits.lunch - splits.snack);
      splits.dinner = remaining;
    }

    if (customMeals.dinner) {
      splits.dinner = customMeals.dinner.calories;
    }

    return splits;
  })();

  // Targets for micro nutrients
  const microTargets = {
    fiber: Math.round((metrics.target_cal / 1000) * 14),
    iron: metrics.gender === 'female' ? 18 : 8,
    calcium: 1000,
    vitaminC: metrics.gender === 'female' ? 75 : 90
  };

  const consumedMicros = {
    fiber: Object.keys(eatenMeals).reduce((total, meal) => {
      return total + (eatenMeals[meal] ? Math.round(mealCalorieSplits[meal] * 0.015) : 0);
    }, 0),
    iron: Object.keys(eatenMeals).reduce((total, meal) => {
      return total + (eatenMeals[meal] ? Math.round(mealCalorieSplits[meal] * 0.005 * 10) / 10 : 0);
    }, 0),
    calcium: Object.keys(eatenMeals).reduce((total, meal) => {
      return total + (eatenMeals[meal] ? Math.round(mealCalorieSplits[meal] * 0.4) : 0);
    }, 0),
    vitaminC: Object.keys(eatenMeals).reduce((total, meal) => {
      return total + (eatenMeals[meal] ? Math.round(mealCalorieSplits[meal] * 0.035) : 0);
    }, 0)
  };

  const consumedCalories = Object.keys(eatenMeals).reduce((total, meal) => {
    return total + (eatenMeals[meal] ? mealCalorieSplits[meal] : 0);
  }, 0);

  // Targets for macros (Protein 25%, Carbs 50%, Fats 25%)
  const macroTargets = {
    protein: Math.round((metrics.target_cal * 0.25) / 4),
    carbs: Math.round((metrics.target_cal * 0.50) / 4),
    fats: Math.round((metrics.target_cal * 0.25) / 9)
  };

  const consumedMacros = {
    protein: Object.keys(eatenMeals).reduce((total, meal) => {
      return total + (eatenMeals[meal] ? Math.round((mealCalorieSplits[meal] * 0.25) / 4) : 0);
    }, 0),
    carbs: Object.keys(eatenMeals).reduce((total, meal) => {
      return total + (eatenMeals[meal] ? Math.round((mealCalorieSplits[meal] * 0.50) / 4) : 0);
    }, 0),
    fats: Object.keys(eatenMeals).reduce((total, meal) => {
      return total + (eatenMeals[meal] ? Math.round((mealCalorieSplits[meal] * 0.25) / 9) : 0);
    }, 0)
  };

  const handleLogCustomMeal = async (mealKey) => {
    if (!customMealName || !customMealCal) return;
    setReplanLoading(true);
    try {
      const activePlan = JSON.parse(localStorage.getItem("activePlan"));
      const dietPref = activePlan?.metrics?.diet || "vegetarian";
      const exclusions = activePlan?.metrics?.exclusions || [];

      const payload = {
        email: userEmail,
        day: 'Day 1',
        meal_type: mealKey,
        custom_name: customMealName,
        custom_calories: parseInt(customMealCal),
        diet_preference: dietPref,
        exclusions: exclusions
      };

      const res = await axios.post(`http://${window.location.hostname}:5000/api/replan-remaining`, payload);
      if (res.data.success) {
        const mealData = { name: customMealName, calories: parseInt(customMealCal) };
        const today = new Date().toISOString().split('T')[0];
        
        const updatedCustomMeals = { ...customMeals, [mealKey]: mealData };
        localStorage.setItem(`custom_meals_${userEmail}_${today}`, JSON.stringify(updatedCustomMeals));
        setCustomMeals(updatedCustomMeals);

        setEatenMeals(prev => {
          const updated = { ...prev, [mealKey]: true };
          const today = new Date().toISOString().split('T')[0];
          localStorage.setItem(`eaten_meals_${userEmail}_${today}`, JSON.stringify(updated));
          return updated;
        });

        if (activePlan) {
          activePlan.weekly_plan = res.data.weekly_plan;
          localStorage.setItem("activePlan", JSON.stringify(activePlan));
        }

        setActiveCustomForm(null);
        setReplanSuccessAlert(true);
        setTimeout(() => setReplanSuccessAlert(false), 5000);
      }
    } catch (err) {
      console.error("Failed to replan remaining meals:", err);
      alert("Failed to replan meals. Confirm your backend is running.");
    } finally {
      setReplanLoading(false);
    }
  };

  const handleClearCustomMeal = (mealKey) => {
    const today = new Date().toISOString().split('T')[0];
    const updatedCustomMeals = { ...customMeals, [mealKey]: null };
    localStorage.setItem(`custom_meals_${userEmail}_${today}`, JSON.stringify(updatedCustomMeals));
    setCustomMeals(updatedCustomMeals);
    setCustomMealName("");
    setCustomMealCal("");
  };

  useEffect(() => {
    // Try fetching metrics from local storage first (instant load)
    const cachedPlan = localStorage.getItem("activePlan");
    if (cachedPlan) {
      try {
        const parsed = JSON.parse(cachedPlan);
        if (parsed.metrics) setMetrics(parsed.metrics);
        if (parsed.weekly_plan) setCurrentPlan(parsed.weekly_plan);
      } catch(e) {}
    }

    // Fetch latest user details and plan history from the backend
    const fetchLatestDetails = async () => {
      try {
        const response = await axios.get(`http://${window.location.hostname}:5000/api/user/${userEmail}`);
        if (response.data.success && response.data.history.length > 0) {
          const latestPlan = response.data.history[0]; // Newest plan
          setHasPlan(true);
          
          let planDataParsed = latestPlan.plan_data;
          let plan = {};
          if (typeof planDataParsed === 'string') {
            try { plan = JSON.parse(planDataParsed); } catch(e) {}
          } else if (planDataParsed && typeof planDataParsed === 'object') {
            plan = planDataParsed;
          }
          
          const info = response.data.user_info;
          let weeklyPlanObj = plan.weekly_plan || plan;

          if (weeklyPlanObj && Object.keys(weeklyPlanObj).length > 0) {
            setCurrentPlan(weeklyPlanObj);
            
            // Sync database plan to local storage activePlan
            try {
              let parsed = {};
              parsed.weekly_plan = weeklyPlanObj;
              parsed.ai_advice = plan.ai_advice || "";
              parsed.deficiency_analysis = plan.deficiency_analysis || "";
              parsed.user_details = plan.user_details || {};
              parsed.target_cal = plan.target_cal || latestPlan.total_calories;
              parsed.bmr = plan.bmr || info.bmr;
              parsed.tdee = plan.tdee || info.tdee;
              
              parsed.metrics = {
                target_cal: parsed.target_cal,
                bmr: parsed.bmr,
                tdee: parsed.tdee,
                age: parsed.user_details.age || info.age,
                weight: parsed.user_details.weight || info.weight,
                height: parsed.user_details.height || info.height,
                gender: parsed.user_details.gender || info.gender,
                goal: parsed.user_details.goal || info.goal,
                diet: parsed.user_details.diet || info.diet
              };

              localStorage.setItem("activePlan", JSON.stringify(parsed));
            } catch(e) {}
          }

          setMetrics(prev => ({
            ...prev,
            target_cal: plan.target_cal || latestPlan.total_calories || prev.target_cal,
            bmr: plan.bmr || info.bmr || prev.bmr,
            tdee: plan.tdee || info.tdee || prev.tdee,
            age: plan.user_details?.age || info.age || prev.age,
            weight: plan.user_details?.weight || info.weight || prev.weight,
            height: plan.user_details?.height || info.height || prev.height,
            gender: plan.user_details?.gender || info.gender || prev.gender,
            goal: plan.user_details?.goal || info.goal || prev.goal,
            diet: plan.user_details?.diet || info.diet || prev.diet
          }));
        }
      } catch (err) {
        console.error("Error fetching tracker data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestDetails();
  }, [userEmail]);

  const handleToggleMeal = (meal) => {
    setEatenMeals(prev => {
      const updated = {
        ...prev,
        [meal]: !prev[meal]
      };
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem(`eaten_meals_${userEmail}_${today}`, JSON.stringify(updated));
      return updated;
    });
  };

  // Percentage for progress ring (SVG strokeOffset calculation)
  const ringRadius = 80;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const calPercent = Math.min(consumedCalories / metrics.target_cal, 1);
  const strokeDashoffset = ringCircumference - calPercent * ringCircumference;

  // 📄 Generate PDF Report
  const generatePDF = () => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(22);
    doc.setTextColor(22, 101, 52); // theme-primary
    doc.text("Foodie AI - Daily Health Report", 14, 20);
    
    // User Info
    doc.setFontSize(12);
    doc.setTextColor(50, 50, 50);
    doc.text(`User: ${userName} (${userEmail})`, 14, 30);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 38);
    
    // Metrics
    const heightCm = metrics.height ? (metrics.height < 10 ? Math.round(metrics.height * 100) : Math.round(metrics.height)) : '--';
    doc.text(`Body Metrics: ${metrics.weight}kg | ${heightCm}cm | ${metrics.age} yrs`, 14, 46);
    doc.text(`Target Calories: ${metrics.target_cal} kcal`, 14, 54);
    
    // Macros Table
    doc.autoTable({
      startY: 64,
      head: [['Nutrient', 'Consumed', 'Target', 'Progress']],
      body: [
        ['Calories', `${consumedCalories} kcal`, `${metrics.target_cal} kcal`, `${Math.round(calPercent * 100)}%`],
        ['Protein', `${consumedMacros.protein}g`, `${macroTargets.protein}g`, `${Math.round((consumedMacros.protein/macroTargets.protein)*100)}%`],
        ['Carbohydrates', `${consumedMacros.carbs}g`, `${macroTargets.carbs}g`, `${Math.round((consumedMacros.carbs/macroTargets.carbs)*100)}%`],
        ['Fats', `${consumedMacros.fats}g`, `${macroTargets.fats}g`, `${Math.round((consumedMacros.fats/macroTargets.fats)*100)}%`]
      ],
      headStyles: { fillColor: [22, 101, 52] },
      styles: { fontSize: 11, cellPadding: 5 }
    });
    
    // Hydration
    doc.text(`Hydration Tracker: ${waterGlasses} / 8 Glasses (${waterGlasses * 250} ml)`, 14, doc.lastAutoTable.finalY + 15);
    
    // Footer
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text("Generated by Foodie AI Coach", 14, 280);
    
    doc.save(`Health_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-theme-bg">
        <div className="text-center">
          <FontAwesomeIcon icon={faFire} spin className="text-theme-accent text-5xl mb-4" />
          <h2 className="text-lg font-bold text-slate-800 animate-pulse">Assembling Your Dashboard...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="p-0 bg-theme-bg min-h-full relative overflow-hidden">
      <div className="flex flex-col xl:flex-row gap-6 h-full">
        
        {/* Main Left Content */}
        <div className="flex-1 space-y-6 min-w-0 flex flex-col">
          
          {/* Hero Banner */}
          <section className="bg-theme-primary-light rounded-2xl overflow-hidden shadow-sm relative h-[220px] shrink-0 border border-theme-border">
             <div className="absolute inset-0 bg-gradient-to-r from-theme-primary-light via-theme-primary-light/90 to-transparent z-10 p-8 flex flex-col justify-center">
                 <h1 className="text-2xl md:text-3xl font-extrabold text-theme-text max-w-sm mb-2 leading-snug">A Healthier You, <br/>One Meal at a Time</h1>
                 <p className="text-theme-text font-medium text-sm max-w-md mb-6 hidden sm:block">"Your body is a temple, but only if you treat it as one." Let's hit your macro targets today!</p>
                 <div className="flex flex-wrap gap-3 relative z-20 mt-2 sm:mt-0">
                   <button onClick={() => navigate('/inputs')} className="bg-theme-primary hover:bg-theme-primary/90 text-white font-bold px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer">
                       <span>Open Diet Planner</span>
                       <FontAwesomeIcon icon={faArrowRight} />
                   </button>
                   <button onClick={generatePDF} className="bg-white text-theme-primary hover:bg-slate-50 font-bold px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-sm border border-slate-200 transition-all cursor-pointer">
                       <FontAwesomeIcon icon={faFilePdf} />
                       <span className="hidden sm:inline">Export PDF Report</span>
                       <span className="sm:hidden">Export</span>
                   </button>
                 </div>
             </div>
             <img src="/hero_salad.jpg" alt="Healthy Salad" className="absolute right-[-10%] top-[-20%] h-[140%] w-[60%] object-cover object-left opacity-90 mix-blend-multiply" />
          </section>

      {/* Reminder Alert Banner */}
      {reminderAlert && (
        <div className="bg-amber-50 border border-amber-200/80 text-amber-900 p-5 rounded-3xl flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-3">
            <span className="text-xl">⏰</span>
            <div>
              <p className="font-extrabold text-sm">{reminderAlert.title}</p>
              <p className="text-xs text-amber-800 mt-0.5">{reminderAlert.message}</p>
            </div>
          </div>
          <button onClick={() => setReminderAlert(null)} className="text-amber-500 hover:text-amber-700 font-extrabold text-xs px-2 py-1 cursor-pointer">Dismiss</button>
        </div>
      )}

      {/* Replan Success Alert */}
      {replanSuccessAlert && (
        <div className="bg-theme-primary-light border border-emerald-250 text-slate-800 p-5 rounded-3xl flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-3">
            <span className="text-xl">✅</span>
            <div>
              <p className="font-extrabold text-sm">Diet Plan Recalculated!</p>
              <p className="text-xs text-slate-600 mt-0.5">The remaining meals for today (Lunch, Snack, Dinner) have been automatically re-planned to balance your daily budget.</p>
            </div>
          </div>
          <button onClick={() => setReplanSuccessAlert(false)} className="text-theme-primary hover:text-theme-primary font-extrabold text-xs px-2 py-1 cursor-pointer">Dismiss</button>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Calorie Tracker Progress Ring */}
        <div className="bg-theme-card rounded-3xl p-6 border border-slate-200/60 shadow-sm flex flex-col items-center justify-center text-center col-span-1 xl:col-span-3">
          <h2 className="text-lg font-extrabold text-slate-800 mb-6">Calorie Target</h2>
          
          <div className="relative w-48 h-48 flex items-center justify-center">
            {/* SVG Ring */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="96"
                cy="96"
                r={ringRadius}
                className="stroke-slate-100 fill-none"
                strokeWidth="14"
              />
              <circle
                cx="96"
                cy="96"
                r={ringRadius}
                className="stroke-emerald-500 fill-none transition-all duration-500 ease-out"
                strokeWidth="14"
                strokeDasharray={ringCircumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-slate-800">{consumedCalories}</span>
              <span className="text-xs text-theme-muted font-bold tracking-wider mt-1 uppercase">of {metrics.target_cal} kcal</span>
            </div>
          </div>

          <div className="flex gap-2 mt-8 w-full border-t border-slate-100 pt-6">
            <div className="flex-1 text-center">
              <div className="text-xs text-theme-muted font-bold uppercase tracking-wider">Remaining</div>
              <div className="text-lg font-extrabold text-slate-700 mt-1">
                {Math.max(metrics.target_cal - consumedCalories, 0)} kcal
              </div>
            </div>
            <div className="w-[1px] bg-slate-100 h-10"></div>
            <div className="flex-1 text-center">
              <div className="text-xs text-theme-muted font-bold uppercase tracking-wider">Progress</div>
              <div className="text-lg font-extrabold text-theme-primary mt-1">
                {Math.round(calPercent * 100)}%
              </div>
            </div>
          </div>
        </div>

        {/* Meal Logging Checklist */}
        <div className="bg-theme-card rounded-3xl p-6 border border-slate-200/60 shadow-sm col-span-1 xl:col-span-5 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-extrabold text-slate-800">Today's Meal Logger</h2>
              <button 
                onClick={() => navigate('/results', { state: { highlightDay: getTodayDayKey() } })}
                className="text-xs text-emerald-650 hover:text-theme-primary font-bold flex items-center gap-1.5 bg-theme-primary-light/50 px-3 py-1.5 rounded-xl border border-theme-border hover:border-theme-border transition cursor-pointer"
                title="View this day in Weekly Plan"
              >
                <span>Weekly Plan</span>
                <FontAwesomeIcon icon={faArrowRight} />
              </button>
            </div>
            <div className="space-y-3.5">
              {Object.keys(eatenMeals).map((meal) => {
                const isChecked = eatenMeals[meal];
                const mealNameCapitalized = meal.charAt(0).toUpperCase() + meal.slice(1);
                const todayKey = getTodayDayKey();
                const todayMealsText = currentPlan[todayKey] || "";
                const todayMeals = parseMeals(todayMealsText);
                const plannedFood = todayMeals[mealNameCapitalized];
                const timeInfo = getMealStatus(meal);
                const isOpen = timeInfo.status === 'open' || unlockedMeals[meal];

                return (
                  <div key={meal} className="flex flex-col gap-2">
                    <button
                      onClick={() => isOpen && handleToggleMeal(meal)}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 ${
                        !isOpen
                          ? isChecked
                            ? 'bg-theme-primary-light/20 border-theme-border text-theme-border opacity-60 cursor-not-allowed'
                            : 'bg-theme-bg/20 border-slate-100 text-theme-muted opacity-55 cursor-not-allowed'
                          : isChecked 
                            ? 'bg-theme-primary-light/50 border-theme-border/80 text-slate-800 cursor-pointer hover:shadow-sm' 
                            : 'bg-theme-bg/50 border-slate-200/60 hover:bg-slate-100/30 text-slate-600 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                          isChecked 
                            ? isOpen
                              ? 'bg-theme-accent border-emerald-500 text-slate-950'
                              : 'bg-theme-accent/50 border-emerald-500/40 text-theme-border'
                            : 'border-slate-300 bg-theme-card'
                        }`}>
                          {isChecked && <FontAwesomeIcon icon={faCheck} className="text-xs font-black" />}
                        </div>
                        <div className="flex flex-col text-left">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold capitalize">{meal}</span>
                            {timeInfo.status === 'open' || unlockedMeals[meal] ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-theme-primary-light text-theme-primary">
                                <span className="w-1 h-1 rounded-full bg-theme-accent mr-1 animate-pulse"></span>
                                {unlockedMeals[meal] ? 'Unlocked' : 'Active'}
                              </span>
                            ) : timeInfo.status === 'future' ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-600 border border-amber-100">
                                <FontAwesomeIcon icon={faLock} className="mr-1 text-[8px]" />
                                Locked
                              </span>
                            ) : (
                              <span 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setUnlockedMeals(prev => ({ ...prev, [meal]: true }));
                                }}
                                className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-theme-border border border-slate-250 cursor-pointer hover:bg-slate-200 transition-colors"
                                title="Click to unlock past meal"
                              >
                                <FontAwesomeIcon icon={faLock} className="mr-1 text-[8px]" />
                                Closed (Unlock)
                              </span>
                            )}
                          </div>
                          {plannedFood && (
                            <span className="text-[11px] text-theme-muted font-semibold mt-0.5 max-w-[170px] truncate" title={plannedFood}>
                              {plannedFood}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`text-xs font-extrabold ${isChecked ? 'text-theme-primary' : 'text-theme-muted'}`}>
                        +{mealCalorieSplits[meal]} kcal
                      </span>
                    </button>
                    <div className="pl-9 flex flex-col gap-2">
                      {customMeals[meal] ? (
                        <div className="text-[11px] text-slate-600 bg-theme-bg p-2.5 rounded-xl border border-slate-200 flex justify-between items-center">
                          <span>Eaten: <strong>{customMeals[meal].name}</strong> ({customMeals[meal].calories} kcal)</span>
                          {isOpen && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleClearCustomMeal(meal);
                              }} 
                              className="text-theme-danger hover:underline font-bold text-[10px] cursor-pointer"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      ) : (
                        isOpen && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (activeCustomForm === meal) {
                                setActiveCustomForm(null);
                              } else {
                                setActiveCustomForm(meal);
                                setCustomMealName("");
                                setCustomMealCal("");
                                setCustomMealQty("1");
                                setCustomMealUnit("pieces");
                              }
                            }}
                            className="text-left text-xs text-theme-primary hover:text-theme-primary font-extrabold flex items-center gap-1.5 cursor-pointer mt-1"
                          >
                            🍽️ Ate a different {meal}?
                          </button>
                        )
                      )}
                      
                      {activeCustomForm === meal && (
                        <div className="bg-theme-bg border border-slate-200 p-4 rounded-2xl flex flex-col gap-3 mt-1 shadow-sm">
                          <div className="text-xs font-extrabold text-slate-700">Log Custom {meal.charAt(0).toUpperCase() + meal.slice(1)}</div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] text-theme-muted font-extrabold uppercase">Food Name</label>
                            <input 
                              type="text" 
                              placeholder="e.g. Masala Dosa" 
                              className="w-full bg-theme-card border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                              value={customMealName}
                              onChange={(e) => setCustomMealName(e.target.value)}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] text-theme-muted font-extrabold uppercase">Quantity</label>
                              <input 
                                type="number" 
                                min="0.25"
                                step="0.25"
                                className="w-full bg-theme-card border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                                value={customMealQty}
                                onChange={(e) => setCustomMealQty(e.target.value)}
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] text-theme-muted font-extrabold uppercase">Unit</label>
                              <select 
                                className="w-full bg-theme-card border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                                value={customMealUnit}
                                onChange={(e) => setCustomMealUnit(e.target.value)}
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
                            disabled={estimatingLoading || !customMealName}
                            className="w-full bg-theme-primary-light text-theme-primary hover:bg-theme-primary-light disabled:opacity-50 text-[10px] font-black py-2 rounded-xl border border-theme-border cursor-pointer transition flex items-center justify-center gap-1.5"
                          >
                            {estimatingLoading ? 'Calculating...' : '⚡ Get AI Calorie Estimate'}
                          </button>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] text-theme-muted font-extrabold uppercase">Calories (kcal)</label>
                            <input 
                              type="number" 
                              placeholder="e.g. 350" 
                              className="w-full bg-theme-card border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                              value={customMealCal}
                              onChange={(e) => setCustomMealCal(e.target.value)}
                            />
                          </div>
                          <div className="flex gap-2 justify-end mt-1">
                            <button 
                              onClick={() => setActiveCustomForm(null)} 
                              className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold px-3 py-2 rounded-lg cursor-pointer transition"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={() => handleLogCustomMeal(meal)} 
                              disabled={replanLoading || !customMealName || !customMealCal}
                              className="bg-theme-accent hover:bg-emerald-600 disabled:opacity-50 text-slate-950 text-[10px] font-black px-3 py-2 rounded-lg cursor-pointer transition"
                            >
                              {replanLoading ? 'Recalculating...' : 'Log & Re-plan'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-theme-bg border border-slate-100 rounded-2xl p-4 mt-6 text-center text-xs text-theme-border font-medium">
            Check off meals as you consume them to sync macros.
          </div>
        </div>

        {/* Macro Nutrients Progress */}
        <div className="bg-theme-card rounded-3xl p-6 border border-slate-200/60 shadow-sm col-span-1 xl:col-span-4 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-800 mb-6">Macro Balance</h2>
            
            <div className="space-y-5">
              {/* Protein */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-extrabold">
                  <span className="text-slate-600 uppercase tracking-wider text-[11px]">Protein (25%)</span>
                  <span className="text-theme-muted uppercase tracking-wide text-[11px]">
                    <strong className="text-slate-700 font-black">{consumedMacros.protein}g</strong> / {macroTargets.protein}g
                  </span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-slate-700 transition-all duration-500" 
                    style={{ width: `${Math.min((consumedMacros.protein / macroTargets.protein) * 100, 100)}%` }}
                  />
                </div>
              </div>
 
              {/* Carbs */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-extrabold">
                  <span className="text-slate-600 uppercase tracking-wider text-[11px]">Carbohydrates (50%)</span>
                  <span className="text-theme-muted uppercase tracking-wide text-[11px]">
                    <strong className="text-slate-700 font-black">{consumedMacros.carbs}g</strong> / {macroTargets.carbs}g
                  </span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-theme-accent transition-all duration-500" 
                    style={{ width: `${Math.min((consumedMacros.carbs / macroTargets.carbs) * 100, 100)}%` }}
                  />
                </div>
              </div>
 
              {/* Fats */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-extrabold">
                  <span className="text-slate-600 uppercase tracking-wider text-[11px]">Fats (25%)</span>
                  <span className="text-theme-muted uppercase tracking-wide text-[11px]">
                    <strong className="text-slate-700 font-black">{consumedMacros.fats}g</strong> / {macroTargets.fats}g
                  </span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-slate-400 transition-all duration-500" 
                    style={{ width: `${Math.min((consumedMacros.fats / macroTargets.fats) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <h2 className="text-lg font-extrabold text-slate-800 mb-6 mt-8 pt-6 border-t border-slate-100">Micro Nutrients</h2>
            
            <div className="space-y-5">
              {/* Fiber */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-extrabold">
                  <span className="text-slate-600 uppercase tracking-wider text-[11px]">Dietary Fiber</span>
                  <span className="text-theme-muted uppercase tracking-wide text-[11px]">
                    <strong className="text-slate-700 font-black">{consumedMicros.fiber}g</strong> / {microTargets.fiber}g
                  </span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-teal-500 transition-all duration-500" 
                    style={{ width: `${Math.min((consumedMicros.fiber / microTargets.fiber) * 100, 100)}%` }}
                  />
                </div>
              </div>

              {/* Vitamin C */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-extrabold">
                  <span className="text-slate-600 uppercase tracking-wider text-[11px]">Vitamin C</span>
                  <span className="text-theme-muted uppercase tracking-wide text-[11px]">
                    <strong className="text-slate-700 font-black">{consumedMicros.vitaminC}mg</strong> / {microTargets.vitaminC}mg
                  </span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-orange-400 transition-all duration-500" 
                    style={{ width: `${Math.min((consumedMicros.vitaminC / microTargets.vitaminC) * 100, 100)}%` }}
                  />
                </div>
              </div>

              {/* Calcium */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-extrabold">
                  <span className="text-slate-600 uppercase tracking-wider text-[11px]">Calcium</span>
                  <span className="text-theme-muted uppercase tracking-wide text-[11px]">
                    <strong className="text-slate-700 font-black">{consumedMicros.calcium}mg</strong> / {microTargets.calcium}mg
                  </span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-sky-500 transition-all duration-500" 
                    style={{ width: `${Math.min((consumedMicros.calcium / microTargets.calcium) * 100, 100)}%` }}
                  />
                </div>
              </div>

              {/* Iron */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-extrabold">
                  <span className="text-slate-600 uppercase tracking-wider text-[11px]">Iron</span>
                  <span className="text-theme-muted uppercase tracking-wide text-[11px]">
                    <strong className="text-slate-700 font-black">{consumedMicros.iron.toFixed(1)}mg</strong> / {microTargets.iron}mg
                  </span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-600 transition-all duration-500" 
                    style={{ width: `${Math.min((consumedMicros.iron / microTargets.iron) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between text-xs font-bold text-theme-border bg-theme-bg/50 p-4 border border-slate-100 rounded-2xl">
            <span>Fat (9 kcal/g)</span>
            <span>Carbs/Protein (4 kcal/g)</span>
          </div>
        </div>

      </div>

      {/* Body Metrics Summary */}
      <section className="bg-theme-card rounded-3xl p-6 border border-slate-200/60 shadow-sm">
        <h2 className="text-lg font-extrabold text-slate-800 mb-6">Your Diagnostic Baseline</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-theme-bg/50 border border-slate-100 rounded-2xl p-4 flex items-center gap-3">
            <FontAwesomeIcon icon={faWeight} className="text-theme-accent text-lg bg-theme-primary-light p-2.5 rounded-xl" />
            <div>
              <div className="text-theme-muted text-xs font-bold uppercase tracking-wider">Weight</div>
              <div className="text-slate-800 text-sm font-extrabold mt-0.5">{metrics.weight} kg</div>
            </div>
          </div>
          <div className="bg-theme-bg/50 border border-slate-100 rounded-2xl p-4 flex items-center gap-3">
            <FontAwesomeIcon icon={faRulerVertical} className="text-theme-accent text-lg bg-theme-primary-light p-2.5 rounded-xl" />
            <div>
              <div className="text-theme-muted text-xs font-bold uppercase tracking-wider">Height</div>
              <div className="text-slate-800 text-sm font-extrabold mt-0.5">
                {metrics.height ? (metrics.height < 10 ? Math.round(metrics.height * 100) : Math.round(metrics.height)) : "--"} cm
              </div>
            </div>
          </div>
          <div className="bg-theme-bg/50 border border-slate-100 rounded-2xl p-4 flex items-center gap-3">
            <FontAwesomeIcon icon={faCalculator} className="text-theme-accent text-lg bg-theme-primary-light p-2.5 rounded-xl" />
            <div>
              <div className="text-theme-muted text-xs font-bold uppercase tracking-wider">BMR</div>
              <div className="text-slate-800 text-sm font-extrabold mt-0.5">{metrics.bmr} kcal</div>
            </div>
          </div>
          <div className="bg-theme-bg/50 border border-slate-100 rounded-2xl p-4 flex items-center gap-3">
            <FontAwesomeIcon icon={faRunning} className="text-theme-accent text-lg bg-theme-primary-light p-2.5 rounded-xl" />
            <div>
              <div className="text-theme-muted text-xs font-bold uppercase tracking-wider">TDEE</div>
              <div className="text-slate-800 text-sm font-extrabold mt-0.5">{metrics.tdee} kcal</div>
            </div>
          </div>
        </div>
      </section>

      {/* No Plan Fallback Card */}
      {!hasPlan && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-3xl p-6 flex gap-4 text-amber-900 shadow-sm">
          <FontAwesomeIcon icon={faExclamationCircle} className="text-2xl shrink-0 mt-0.5 text-amber-500" />
          <div>
            <h3 className="text-md font-extrabold">No Active Diet Plan</h3>
            <p className="text-sm text-amber-800 mt-1 max-w-2xl leading-relaxed">
              We couldn't detect any generated diet plans in your history database. Head over to the **Diet Planner** to enter your body parameters and launch your first AI-tailored nutrition strategy!
            </p>
            <button 
              onClick={() => navigate('/inputs')} 
              className="bg-amber-900 hover:bg-amber-950 text-amber-100 font-extrabold text-xs px-4 py-2.5 rounded-xl mt-4 cursor-pointer transition shadow"
            >
              Generate Meal Plan
            </button>
          </div>
        </div>
      )}
        </div> {/* End Main Left Content */}
        
        {/* Right Sidebar */}
        <aside className="w-full xl:w-72 shrink-0 space-y-6 flex flex-col xl:sticky xl:top-0 h-fit">
           
           {/* Hydration Tracker */}
           <div className="bg-theme-card rounded-3xl p-6 border border-slate-200/60 shadow-sm flex flex-col items-center">
             <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mb-3">
               <FontAwesomeIcon icon={faTint} className="text-2xl" />
             </div>
             <h3 className="font-extrabold text-slate-800 text-lg">Hydration Tracker</h3>
             <p className="text-xs text-theme-muted font-semibold mb-6">Daily Goal: 8 Glasses (2L)</p>
             
             <div className="flex items-center gap-6 mb-6">
               <button onClick={removeWater} className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer">
                 <FontAwesomeIcon icon={faMinus} />
               </button>
               
               <div className="text-3xl font-black text-blue-600 w-16 text-center">
                 {waterGlasses}<span className="text-lg text-slate-400 font-bold">/8</span>
               </div>
               
               <button onClick={addWater} className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 flex items-center justify-center transition-colors cursor-pointer">
                 <FontAwesomeIcon icon={faPlus} />
               </button>
             </div>
             
             {/* Visual Glasses */}
             <div className="grid grid-cols-4 gap-4 mt-4 mb-2 mx-auto w-fit">
               {[...Array(8)].map((_, i) => (
                 <div key={i} className={`relative w-7 h-9 rounded-b-[10px] border-x-2 border-b-2 overflow-hidden shadow-[inset_0_0_6px_rgba(0,0,0,0.05)] flex items-end transition-colors ${i < waterGlasses ? 'border-blue-300' : 'border-theme-border bg-theme-bg/50'}`}>
                   {/* Water Fill */}
                   <div className={`absolute bottom-0 w-full transition-all duration-500 ease-in-out ${i < waterGlasses ? 'h-full bg-gradient-to-t from-blue-600 via-blue-400 to-cyan-300' : 'h-0'}`}>
                     {/* Water Surface reflection */}
                     {i < waterGlasses && <div className="w-full h-1 bg-white/40 absolute top-0"></div>}
                   </div>
                   {/* Glass Reflection */}
                   <div className="absolute top-0 left-1.5 w-1.5 h-full bg-gradient-to-r from-white/0 via-white/80 to-white/0 transform skew-x-[-15deg] z-10 pointer-events-none opacity-50"></div>
                 </div>
               ))}
             </div>
           </div>

           {/* Small steps card */}
           <div className="bg-theme-bg rounded-3xl p-6 border border-theme-border shadow-sm">
             <div className="flex items-center gap-3 mb-4">
                <FontAwesomeIcon icon={faLeaf} className="text-2xl text-theme-primary" />
                <h3 className="font-extrabold text-theme-text text-lg leading-tight">Quick Tips</h3>
             </div>
             <ul className="space-y-3">
               {['Plan your meals ahead', 'Stay consistent', 'Eat whole foods'].map(item => (
                 <li key={item} className="flex items-center gap-3 text-xs font-semibold text-theme-text">
                    <FontAwesomeIcon icon={faCheck} className="text-white bg-theme-accent rounded-full p-0.5 text-[10px] w-3 h-3 shadow-sm" />
                    {item}
                 </li>
               ))}
             </ul>
           </div>
           
           <div className="bg-white rounded-3xl p-5 border border-theme-border shadow-sm text-center relative mt-auto">
              <p className="italic text-theme-text font-medium text-xs z-10 relative leading-relaxed">"Good nutrition fuels a better you."</p>
              <FontAwesomeIcon icon={faLeaf} className="absolute bottom-3 right-3 text-theme-primary-light text-xl -rotate-12" />
           </div>
        </aside>

      </div>
    </div>
  );
};

export default TrackerDashboard;
