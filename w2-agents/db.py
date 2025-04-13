
import firebase_admin
from firebase_admin import firestore
from firebase_admin import credentials

import os

cred = credentials.Certificate("cred.json")
app = firebase_admin.initialize_app(cred)
db = firestore.client()

def add_agent(id, agent):
    """
    Add an agent to the database.
    """
    db.collection("agents").document(id).set(agent)
    
def list_agent() -> list:
    """
    List the agent in the database.
    """
    agents = db.collection("agents").stream()
    agent_list = []
    for agent in agents:
        new_dict = agent.to_dict()
        new_dict["id"] = agent.id
        agent_list.append(new_dict)
    return agent_list