import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faHome, faUserEdit, faTrash, faEye, faCamera, faUser } from '@fortawesome/free-solid-svg-icons';

const Dashboard = () => {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const userEmail = localStorage.getItem("currentUserEmail") || "guest@example.com";

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await axios.get(`http://${window.location.hostname}:5000/api/user/${userEmail}`);
        if (response.data.success) {
          setHistory(response.data.history.reverse());
        }
      } catch (err) {
        console.error("Database fetch error:", err);
      } finally {
        setIsLoading(false);
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [userEmail]);



  const viewSavedPlan = (entry) => {
    let parsedPlan = entry.plan_data;
    if (typeof parsedPlan === 'string') {
       try { parsedPlan = JSON.parse(parsedPlan); } catch(e) {}
    }
    const weeklyPlan = parsedPlan.weekly_plan || parsedPlan;

    navigate('/results', { 
      state: { 
        plan: weeklyPlan, 
        target_cal: entry.total_calories,
        ai_advice: parsedPlan.ai_advice || `Reloaded plan from ${entry.created_at}`,
        deficiency_analysis: parsedPlan.deficiency_analysis || "",
        bmr: parsedPlan.bmr,
        tdee: parsedPlan.tdee,
        user_details: parsedPlan.user_details
      } 
    });
  };

  const deleteEntry = async (id) => {
    if (window.confirm("are you sure to confirm the action")) {
      try {
        const response = await axios.delete(`http://${window.location.hostname}:5000/api/plan/${id}`);
        if (response.data.success) {
          setHistory(history.filter(entry => entry.plan_id !== id));
          alert("Plan removed from view.");
        } else {
          alert("Failed to delete plan from database.");
        }
      } catch (err) {
        console.error("Delete error:", err);
        alert("Failed to delete plan.");
      }
    }
  };

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

  const downloadHistoryPDF = (entry) => {
    const doc = new jsPDF();
    const primaryColor = [16, 185, 129];

    doc.setFontSize(22);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`Foodie: Professional Nutrition Plan`, 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Prepared for: ${userEmail.split('@')[0]} | Target: ${entry.total_calories} kcal/day | Date: ${entry.created_at}`, 14, 28);

    let parsedPlan = entry.plan_data;
    if (typeof parsedPlan === 'string') {
       try { parsedPlan = JSON.parse(parsedPlan); } catch(e) {}
    }
    const weeklyPlan = parsedPlan.weekly_plan || parsedPlan;

    const tableData = Object.keys(weeklyPlan)
      .filter(key => key.startsWith('Day'))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map(day => {
        const m = parseMeals(weeklyPlan[day]);
        const cleanItem = (item) => item.split('(')[0].trim();
        return [ day, cleanItem(m.Breakfast), cleanItem(m.Lunch), cleanItem(m.Snack), cleanItem(m.Dinner), m.Calories ];
      });

    autoTable(doc, {
      startY: 35,
      head: [['Day', 'Breakfast', 'Lunch', 'Snack', 'Dinner', 'Calories']],
      body: tableData,
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 4, valign: 'middle' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 0: { fontStyle: 'bold', textColor: primaryColor } }
    });

    doc.save(`Foodie_History_${entry.plan_id}.pdf`);
  };

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-4 sm:space-y-6 min-h-full">
      <div className="container max-w-5xl mx-auto">
        <h2 className="text-theme-text text-2xl font-extrabold mb-6">Your Saved Journey</h2>
        
        {isLoading ? (
          <div className="text-center py-12 text-theme-muted">Connecting to database...</div>
        ) : history.length > 0 ? history.map((entry) => (
          <div key={entry.plan_id} className="bg-theme-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl mb-4 border border-emerald-50 shadow-sm flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-4 transition-all hover:shadow-md">
            <div>
              <h3 className="text-theme-text font-bold text-base sm:text-lg mb-1">Plan from {entry.created_at}</h3>
              <span className="text-theme-primary font-extrabold text-sm sm:text-base">{entry.total_calories} kcal / Day</span>
            </div>
            <div className="flex flex-wrap sm:flex-nowrap gap-2 sm:gap-3 w-full sm:w-auto">
              <button className="flex-1 sm:flex-none justify-center bg-theme-primary-light text-theme-primary px-4 py-2.5 rounded-xl font-bold hover:bg-theme-primary-light hover:scale-105 hover:shadow-md hover:brightness-105 transition-all flex items-center gap-2 text-sm sm:text-base" onClick={() => viewSavedPlan(entry)}>
                <FontAwesomeIcon icon={faEye}/> View
              </button>
              <button className="flex-1 sm:flex-none justify-center bg-blue-50 text-blue-500 px-4 py-2.5 rounded-xl font-bold hover:bg-blue-100 hover:scale-105 hover:shadow-md hover:brightness-105 transition-all flex items-center gap-2 text-sm sm:text-base" onClick={() => downloadHistoryPDF(entry)}>
                <FontAwesomeIcon icon={faDownload}/> PDF
              </button>
              <button className="bg-theme-danger/10 text-theme-danger px-4 py-2.5 rounded-xl hover:bg-red-100 hover:scale-105 hover:shadow-md hover:brightness-105 transition-all flex items-center justify-center" onClick={() => deleteEntry(entry.plan_id)}>
                <FontAwesomeIcon icon={faTrash}/>
              </button>
            </div>
          </div>
        )) : (
          <div className="bg-theme-card text-center p-12 rounded-3xl text-theme-muted shadow-sm">
            No meal history found in the database for <strong>{userEmail}</strong>.
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;