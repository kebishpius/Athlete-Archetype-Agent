import os
import sys
import pandas as pd
from google.cloud import bigquery

def get_archetype_details(cluster_id):
    """
    Returns the qualitative label and Paralympic equivalent for a given cluster ID.
    Mapping based on ranking logic:
    - 5: Powerhouse (Highest Weight)
    - 1: Leverage (High Height/Reach, Moderate Age)
    - 2: Hybrid (High Age, Moderate biometrics)
    - 4: Aerobic (Moderate height, younger)
    - 3: Agility (Lowest Height/Weight)
    """
    mapping = {
        "1": {
            "label": "Leverage",
            "description": "Your physical profile historically aligns with athletes who excel through reach and mechanical advantage.",
            "olympic": "Rowing, Basketball, or Swimming",
            "paralympic": "PR3 Rowing or S10 Swimming (focusing on high power-to-weight and stroke length)."
        },
        "2": {
            "label": "Hybrid",
            "description": "Your profile suggests a seasoned athletic profile, common in technical sports requiring maturity and precision.",
            "olympic": "Shooting, Equestrian, or Sailing",
            "paralympic": "Archery (W1/Open) or Shooting Para Sport (focusing on trunk stability and mental focus)."
        },
        "3": {
            "label": "Agility",
            "description": "Your biometric data historically correlates with high-speed, high-mobility athletes.",
            "olympic": "Gymnastics, Diving, or Wrestling (Lightweight)",
            "paralympic": "S9 Swimming or 5-a-side Football (focusing on explosive power and rapid directional changes)."
        },
        "4": {
            "label": "Aerobic",
            "description": "Your profile suggests an efficiency-based physical build, common in endurance disciplines.",
            "olympic": "Distance Running, Cycling, or Triathlon",
            "paralympic": "T54 Wheelchair Racing or PTS5 Paratriathlon (focusing on sustainable power and VO2 max)."
        },
        "5": {
            "label": "Powerhouse",
            "description": "Your physical profile could lead to success in disciplines requiring massive force production.",
            "olympic": "Weightlifting, Shot Put, or Hammer Throw",
            "paralympic": "Para Powerlifting (POW) or F57 Field Throws (focusing on absolute strength and upper body torque)."
        }
    }
    return mapping.get(str(cluster_id))

def run_agent():
    print("--- USA Athlete Archetype Guide ---")
    print("Discover your alignment with Team USA's 120-year history.")
    
    try:
        height = float(input("Enter your height (cm): "))
        weight = float(input("Enter your weight (kg): "))
        age = float(input("Enter your age: "))
    except ValueError:
        print("Error: Please enter numerical values for height, weight, and age.")
        return

    client = bigquery.Client()
    
    # ML.PREDICT query
    query = f"""
    SELECT centroid_id
    FROM ML.PREDICT(MODEL `Olympic_Data.athlete_archetypes`,
      (SELECT {height} AS Height, {weight} AS Weight, {age} AS Age))
    """
    
    try:
        query_job = client.query(query)
        results = query_job.to_dataframe()
        cluster_id = results['centroid_id'].iloc[0]
        
        details = get_archetype_details(cluster_id)
        
        if details:
            print(f"\nArchetype Found: {details['label']}")
            print("-" * 30)
            print(details['description'])
            print(f"\nHistorical Olympic Alignment: {details['olympic']}")
            print(f"Equivalent Paralympic Classification: {details['paralympic']}")
            print("\n*Note: This analysis is based on historical biometric data and suggests physical profiles; it does not guarantee competitive results.")
        else:
            print("\nCould not determine a specific archetype for your profile.")
            
    except Exception as e:
        print(f"\nAn error occurred while accessing the athletic history: {e}")

if __name__ == "__main__":
    run_agent()
