from google.cloud import bigquery
import os
import google.auth
from typing import List, Dict, Any

def get_athlete_cluster(height: float, weight: float, age: int) -> Dict[str, Any]:
    """
    Queries the BigQuery ML model to find the athlete archetype cluster for a given biometric profile.
    
    Args:
        height: The height of the individual in cm.
        weight: The weight of the individual in kg.
        age: The age of the individual.
        
    Returns:
        A dictionary containing the cluster_id and historical archetypes alignment.
    """
    # Check for mock mode (useful for local dev without BQ credentials)
    if os.environ.get("MOCK_BIGQUERY") == "True":
        # Deterministic mock logic based on height/weight
        if weight > 95:
            return {"cluster_id": 5, "label": "Powerhouse"}
        elif height > 190:
            return {"cluster_id": 1, "label": "Leverage"}
        elif age > 40:
            return {"cluster_id": 2, "label": "Hybrid"}
        elif weight < 55:
            return {"cluster_id": 3, "label": "Agility"}
        else:
            return {"cluster_id": 4, "label": "Aerobic"}

    try:
        _, project_id = google.auth.default()
        client = bigquery.Client(project=project_id)
        query = f"""
        SELECT centroid_id
        FROM ML.PREDICT(MODEL `Olympic_Data.athlete_archetypes`,
          (SELECT {height} AS Height, {weight} AS Weight, {age} AS Age))
        """
        results = client.query(query).to_dataframe()
        if results.empty:
            return {"error": "No cluster found"}
        
        cluster_id = int(results['centroid_id'].iloc[0])
        labels = {
            1: "Leverage",
            2: "Hybrid",
            3: "Agility",
            4: "Aerobic",
            5: "Powerhouse"
        }
        return {"cluster_id": cluster_id, "label": labels.get(cluster_id, "Unknown")}
    except Exception as e:
        return {"error": f"BigQuery error: {str(e)}"}

def display_athlete_matches(matches: List[Dict[str, Any]]) -> str:
    """
    Triggers the display of athlete match cards in the UI.
    
    Args:
        matches: A list of athlete dictionaries with keys: Name, Sport, Event, Medal, Year, is_2028.
    """
    return "UI updated with athlete matches."
