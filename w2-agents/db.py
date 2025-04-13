
import firebase_admin
from firebase_admin import firestore
from firebase_admin import credentials

import os
from dotenv import load_dotenv
import base64
import json

# Load environment variables from .env file
load_dotenv()

# Decode the base64 encoded private key and other sensitive data
private_key = base64.b64decode(os.getenv("DB_PKEY_REAL")).decode("utf-8").replace("\\n", "\n")
print(private_key)
cred = credentials.Certificate({
    "type": "service_account",
    "project_id": "encode2025",
    "private_key_id": os.getenv("DB_PKEY"),
    "private_key": private_key,
    "client_email": "firebase-adminsdk-fbsvc@encode2025.iam.gserviceaccount.com",
    "client_id": os.getenv("FIREBASE_CLIENT_ID"),
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40encode2025.iam.gserviceaccount.com",
    "universe_domain": "googleapis.com"
})
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