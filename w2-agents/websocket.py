from fastapi import FastAPI, WebSocket
import asyncio
import json
import logging
import os
import agent
import copy
from web3 import Web3

# dotenv
from dotenv import load_dotenv
load_dotenv()



import oracle

import asyncio

# Atomic String:
result = ""

current_websocket = None

active_sockets = set()
set_lock = asyncio.Lock()

async def safe_add(item):
    async with set_lock:
        active_sockets.add(item)

async def safe_contains(item):
    async with set_lock:
        return item in active_sockets

async def safe_discard(item):
    async with set_lock:
        active_sockets.discard(item)

app = FastAPI()
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or specify domains here
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


logger = logging.getLogger("websocket")

async def send_json(json):
    global current_websocket
    if current_websocket:
        await current_websocket.send_json(json)

async def background_loop():
    oracle.set_initial_block()
    while True:
        await oracle.listen_for_contract_requests()
        await asyncio.sleep(0.2)
        
@app.on_event("startup")
async def start_background_loop():
    asyncio.create_task(background_loop())

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    global current_websocket
    await websocket.accept()
    current_websocket = websocket
    data = json.loads(await websocket.receive_text())
    try:
        w3 = Web3(Web3.HTTPProvider(f"https://eth-sepolia.g.alchemy.com/v2/{os.getenv('ALCHEMY_API_KEY')}"))
        logger.info("Connected to Web3 provider.")
    except Exception as e:
        logger.error(f"Failed to connect to Web3 provider: {e}")
        raise e
    data_wallet = data.get("wallet")
    data_input = data.get("input")
    await safe_add(data_wallet)
    agent.call_contract_function(w3, data_wallet, data_input, data_input, [], logger, os.getenv("GATEWAY_ADDR"))
    
    while await safe_contains(data_wallet):
        await asyncio.sleep(1)
        
    my_result = copy.deepcopy(result)
    await websocket.send_json({
        "type": "response",
        "data": my_result
    })
    current_websocket = None
    await websocket.close()
    print("WebSocket closed.")