import pandas as pd
import numpy as np
import hashlib
import re

def seed_from_profile(daily_cal, exclusions, diet_pref):
    s = f"{daily_cal}-{','.join(sorted(exclusions))}-{diet_pref}"
    return int(hashlib.md5(s.encode()).hexdigest(), 16) % (10**8)

def get_base_name(name):
    return re.sub(r'\(.*?\)', '', str(name)).strip().title()

def clean_exclusions(exclusions):
    mapping = {
        'milk': ['paneer', 'cheese', 'butter', 'ghee', 'curd', 'lassi', 'buttermilk', 'milk'],
        'butter': ['butter'],
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

def load_and_filter_data(exclusions, diet_pref):
    df = pd.read_csv('dataset/new_food_dataset.csv')
    df['base_name'] = df['food_name'].apply(get_base_name)
    df['ingredients'] = df['ingredients'].fillna('')
    df['ingredients_lower'] = df['ingredients'].str.lower()
    df['food_name_lower'] = df['food_name'].str.lower()
    
    # Exclude if unverified
    df = df[df['verified'] == True]
    
    # Exclude blank ingredients if exclusions provided or diet needs it
    if len(exclusions) > 0 or diet_pref in ['vegetarian', 'vegan']:
        df = df[df['ingredients'].str.strip() != '']
    
    # Exclude based on diet_pref (Veg/Vegan)
    if diet_pref == 'vegetarian':
        bad = ['chicken', 'fish', 'egg', 'mutton', 'meat', 'prawn', 'crab']
        df = df[~df['ingredients_lower'].str.contains('|'.join(bad), regex=True)]
    elif diet_pref == 'vegan':
        bad = ['chicken', 'fish', 'egg', 'mutton', 'meat', 'prawn', 'crab', 'milk', 'butter', 'ghee', 'cheese', 'curd', 'paneer']
        df = df[~df['ingredients_lower'].str.contains('|'.join(bad), regex=True)]
    
    # Custom Exclusions
    clean_exc = clean_exclusions(exclusions)
    if clean_exc:
        for exc in clean_exc:
            df = df[~df['ingredients_lower'].str.contains(exc, regex=False)]
            df = df[~df['food_name_lower'].str.contains(exc, regex=False)]
            
    return df

def generate_plan(daily_cal, exclusions, diet_pref):
    seed = seed_from_profile(daily_cal, exclusions, diet_pref)
    np.random.seed(seed)
    
    df = load_and_filter_data(exclusions, diet_pref)
    
    # Define slots and targets
    slots = ['breakfast', 'lunch', 'snack', 'dinner']
    pcts = {'breakfast': 0.25, 'lunch': 0.35, 'snack': 0.15, 'dinner': 0.25}
    
    return {"success": True, "plan": "TODO"}
