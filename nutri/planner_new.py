import pandas as pd
import numpy as np
import hashlib
import json
import traceback

def clean_exclusions(exclusions):
    mapping = {
        'milk': ['paneer', 'cheese', 'butter', 'ghee', 'curd', 'lassi', 'buttermilk', 'milk', 'dairy'],
        'butter': ['butter', 'ghee'],
        'ghee': ['ghee'],
        'paneer': ['paneer'],
        'curd': ['curd', 'lassi', 'buttermilk'],
        'mutton': ['mutton', 'lamb', 'goat', 'meat']
    }
    flat = []
    for exc in exclusions:
        exc_low = exc.lower().strip()
        flat.append(exc_low)
        if exc_low in mapping:
            flat.extend(mapping[exc_low])
    return list(set(flat))

def load_data(exclusions, diet_pref):
    df = pd.read_csv('dataset/new_food_dataset.csv')
    df['ingredients'] = df['ingredients'].fillna('')
    df = df[df['verified'] == True]
    
    if len(exclusions) > 0 or diet_pref in ['vegetarian', 'vegan']:
        df = df[df['ingredients'].str.strip() != '']
    
    if diet_pref == 'vegetarian':
        bad = ['chicken', 'fish', 'egg', 'mutton', 'meat', 'prawn', 'crab']
        df = df[~df['ingredients'].str.lower().str.contains('|'.join(bad), regex=True)]
    elif diet_pref == 'vegan':
        bad = ['chicken', 'fish', 'egg', 'mutton', 'meat', 'prawn', 'crab', 'milk', 'butter', 'ghee', 'cheese', 'curd', 'paneer']
        df = df[~df['ingredients'].str.lower().str.contains('|'.join(bad), regex=True)]
    
    clean_exc = clean_exclusions(exclusions)
    if clean_exc:
        for exc in clean_exc:
            df = df[~df['ingredients'].str.lower().str.contains(exc, regex=False)]
            df = df[~df['food_name'].str.lower().str.contains(exc, regex=False)]
    return df

def seed_random(daily_cal, exclusions, diet_pref, day_str):
    s = f"{daily_cal}-{','.join(sorted(exclusions))}-{diet_pref}-{day_str}"
    h = int(hashlib.md5(s.encode()).hexdigest(), 16) % (10**8)
    np.random.seed(h)

def generate_weekly_plan(daily_cal, exclusions, diet_pref):
    df = load_data(exclusions, diet_pref)
    if df.empty:
        raise ValueError("No foods available after applying filters.")
        
    slots = ['breakfast', 'lunch', 'snack', 'dinner']
    pcts = {'breakfast': 0.25, 'lunch': 0.35, 'snack': 0.15, 'dinner': 0.25}
    
    weekly_output = {}
    history_base_foods = {}
    history_protein = {}
    
    # 4. Non-Veg (Balanced): at least 4 of 14 lunch/dinner slots vegetarian. Max 4 per protein.
    is_nonveg_balanced = (diet_pref.lower() == 'non-vegetarian')
    
    for day in range(1, 8):
        day_key = f"Day {day}"
        seed_random(daily_cal, exclusions, diet_pref, day_key)
        
        day_plan = []
        day_total = 0
        
        for slot in slots:
            target = daily_cal * pcts[slot]
            
            pool = df[df['category'] == slot].copy()
            if pool.empty: pool = df.copy()
            
            # Select 1 main and optionally 1 side
            for attempt in range(100):
                item1 = pool.sample(1).iloc[0]
                cal1 = item1['kcal_per_100g']
                
                # Check caps and logic...
                
        weekly_output[day_key] = day_plan
        
    return weekly_output
