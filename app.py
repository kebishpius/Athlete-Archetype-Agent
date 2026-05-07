import streamlit as st
import pandas as pd
import altair as alt
from google.cloud import bigquery
from google import genai
import os
import re

# Page config
st.set_page_config(page_title="USA Athlete Archetype Guide", layout="wide")

# Initialize clients
if 'bq_client' not in st.session_state:
    st.session_state.bq_client = bigquery.Client()


def get_cluster_id(height, weight, age):
    query = f"""
    SELECT centroid_id
    FROM ML.PREDICT(MODEL `Olympic_Data.athlete_archetypes`,
      (SELECT {height} AS Height, {weight} AS Weight, {age} AS Age))
    """
    try:
        results = st.session_state.bq_client.query(query).to_dataframe()
        if results.empty:
            st.error("Could not retrieve cluster ID from BigQuery. Please check the model and query.")
            st.stop()
        return int(results['centroid_id'].iloc[0])
    except Exception as e:
        st.error(f"Error querying BigQuery: {e}")
        st.stop()

def parse_cluster_context(cluster_context_str):
    archetypes = {}
    lines = cluster_context_str.strip().split('\n')
    for line in lines:
        match = re.match(r"Cluster (\d+): (.*?) - Olympic: (.*?)\. Paralympic: (.*?)\.", line.strip())
        if match:
            cluster_id, description, olympic_sports, paralympic_sports = match.groups()
            archetypes[int(cluster_id)] = {
                "description": description,
                "olympic_sports": [s.strip() for s in olympic_sports.split(',')],
                "paralympic_sports": [s.strip() for s in paralympic_sports.split(',')]
            }
    return archetypes

def generate_profile(height, weight, age, cluster_id):
    cluster_context_str = """
    Cluster 1: Leverage (High Height/Reach, Moderate Age) - Olympic: Rowing, Basketball, Swimming. Paralympic: PR3 Rowing, S10 Swimming.
    Cluster 2: Hybrid (High Age, Moderate biometrics) - Olympic: Shooting, Equestrian, Sailing. Paralympic: Archery (W1/Open), Shooting Para Sport.
    Cluster 3: Agility (Lowest Height/Weight) - Olympic: Gymnastics, Diving, Wrestling. Paralympic: S9 Swimming, 5-a-side Football.
    Cluster 4: Aerobic (Moderate height, younger) - Olympic: Distance Running, Cycling, Triathlon. Paralympic: T54 Wheelchair Racing, PTS5 Paratriathlon.
    Cluster 5: Powerhouse (Highest Weight) - Olympic: Weightlifting, Shot Put, Hammer Throw. Paralympic: Para Powerlifting, F57 Field Throws.
    """
    
    archetypes_data = parse_cluster_context(cluster_context_str)
    
    if cluster_id not in archetypes_data:
        return "Could not find archetype data for cluster ID.", None

    archetype_info = archetypes_data[cluster_id]
    
    os.environ["GEMINI_API_KEY"] = "YOUR_API_KEY"
    client = genai.Client()
    
    prompt = f"""
    You are an analytical, inclusive, and encouraging Historical Athletic Guide for Team USA.
    The user has inputted their biometrics: {height} cm, {weight} kg, {age} years old.
    Based on 120 years of historical Olympic data, their body type maps to Cluster {cluster_id}.

    Here is the context for the clusters:
    {cluster_context_str}

    Rule 1: Clearly identify their archetype label based on the cluster and explain their historical body type alignment.
    Rule 2: You MUST use conditional, non-deterministic phrasing throughout (e.g., "Your profile could suggest," "Historical data correlates with," "This body type might be well-suited for"). Never guarantee success or athletic potential.
    Rule 3: You MUST provide an equivalent Paralympic classification for that body type with the same depth, technical detail, and analytical rigor as your Olympic sport explanations.
    Rule 4: Maintain a professional, encouraging, and fan-facing tone.

    Draft a personalized response informing the user of their archetype, what it means physically, and their historical Olympic and Paralympic matches based on this data.
    """
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        profile_text = response.text
    except Exception as e:
        profile_text = f"Error generating AI profile: {e}"

    return profile_text, archetype_info

# UI
st.title("USA Athlete Archetype Guide")
st.subheader("Discover your alignment with Team USA's 120-year history.")

st.header("Enter Biometrics")
height = st.number_input("Height (cm)", min_value=100.0, max_value=250.0, value=180.0, step=1.0)
weight = st.number_input("Weight (kg)", min_value=30.0, max_value=200.0, value=75.0, step=1.0)
age = st.number_input("Age", min_value=10, max_value=100, value=25, step=1)

if st.button("Generate Profile"):
    with st.spinner("Analyzing historical data..."):
        cluster_id = get_cluster_id(height, weight, age)
        profile_text, archetype_data = generate_profile(height, weight, age, cluster_id)
        st.session_state.profile_text = profile_text
        st.session_state.archetype_data = archetype_data
        st.session_state.cluster_id = cluster_id

if 'profile_text' in st.session_state and st.session_state.profile_text:
    st.info(st.session_state.profile_text)
    
    if 'archetype_data' in st.session_state and st.session_state.archetype_data:
        st.subheader(f"Archetype Details: Cluster {st.session_state.cluster_id}")
        st.write(f"**Description:** {st.session_state.archetype_data['description']}")
        
        # Generative UI style sports display
        st.markdown("### Suggested Sports Matches")
        
        def make_badges(sports, color):
            return " ".join([f"<span style='background-color: {color}; color: white; padding: 6px 14px; border-radius: 20px; margin: 4px; display: inline-block; font-size: 14px; font-weight: 500; box-shadow: 0 2px 4px rgba(0,0,0,0.1);'>{s}</span>" for s in sports])
            
        olympic_badges = make_badges(st.session_state.archetype_data['olympic_sports'], "#1E3A8A")
        paralympic_badges = make_badges(st.session_state.archetype_data['paralympic_sports'], "#9333EA")
        
        col1, col2 = st.columns(2)
        with col1:
            with st.container(border=True):
                st.markdown("#### 🏅 Olympic", unsafe_allow_html=True)
                st.markdown(olympic_badges, unsafe_allow_html=True)
                
        with col2:
            with st.container(border=True):
                st.markdown("#### ♿ Paralympic", unsafe_allow_html=True)
                st.markdown(paralympic_badges, unsafe_allow_html=True)
