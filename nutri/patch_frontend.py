import re
import os

frontend_files = [
    r"d:\FINAL PROJECT\myapp\src\components\TrackerDashboard.jsx",
    r"d:\FINAL PROJECT\myapp\src\components\ResultPage.jsx",
    r"d:\FINAL PROJECT\myapp\src\components\Dashboard.jsx"
]

def patch_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_parse = """
  const parseMeals = (dayData) => {
    if (!dayData) return { Breakfast: "", Lunch: "", Snack: "", Dinner: "", Calories: "" };
    if (typeof dayData === 'string') {
        const extract = (type) => {
            const regex = new RegExp(`\\\\[${type.toUpperCase()}\\\\]: (.*?) \\\\[END_MEAL\\\\]`);
            const match = dayData.match(regex);
            return match ? match[1] : "";
        };
        const calorieMatch = dayData.match(/\\\\[CALORIE_COUNT\\\\]: (\\d+)/);
        return {
            Breakfast: extract("BREAKFAST"),
            Lunch: extract("LUNCH"),
            Snack: extract("SNACK"),
            Dinner: extract("DINNER"),
            Calories: calorieMatch ? `${calorieMatch[1]} kcal` : ""
        };
    }
    const formatMeal = (items) => {
        if (!items || !Array.isArray(items)) return "";
        return items.map(i => i.display_string || "").join(" + ");
    };
    return {
        Breakfast: formatMeal(dayData.breakfast),
        Lunch: formatMeal(dayData.lunch),
        Snack: formatMeal(dayData.snack),
        Dinner: formatMeal(dayData.dinner),
        Calories: dayData.day_total ? `${dayData.day_total} kcal` : ""
    };
  };
"""
    
    content = re.sub(
        r'const parseMeals = \(.*?\).*?return \{[\s\S]*?Calories:.*?\n\s*\};\n\s*\};', 
        lambda m: new_parse.strip(), 
        content, 
        flags=re.MULTILINE|re.DOTALL
    )
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

for f in frontend_files:
    if os.path.exists(f):
        patch_file(f)
        print("Patched:", f)
