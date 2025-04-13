from dotenv import load_dotenv
load_dotenv()

import os
import time
import random
import db
from rich.console import Console
from rich.traceback import install
from rich.logging import RichHandler
import logging
from web3 import Web3

from openai import OpenAI
import websocket
import requests  # Added for Google Maps API requests
import json

import agent


agent_abi = [
	{
		"anonymous": False,
		"inputs": [
			{
				"indexed": True,
				"internalType": "address",
				"name": "userAddress",
				"type": "address"
			},
			{
				"indexed": False,
				"internalType": "string",
				"name": "data",
				"type": "string"
			},
			{
				"indexed": False,
				"internalType": "uint256",
				"name": "max_hops",
				"type": "uint256"
			},
			{
				"indexed": False,
				"internalType": "string",
				"name": "originalData",
				"type": "string"
			},
			{
				"indexed": False,
				"internalType": "address[]",
				"name": "hops",
				"type": "address[]"
			}
		],
		"name": "IRISRequestAgentData",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "userAddress",
				"type": "address"
			},
			{
				"internalType": "string",
				"name": "data",
				"type": "string"
			},
			{
				"internalType": "uint256",
				"name": "max_hops",
				"type": "uint256"
			},
			{
				"internalType": "string",
				"name": "originalData",
				"type": "string"
			},
			{
				"internalType": "address[]",
				"name": "hops",
				"type": "address[]"
			}
		],
		"name": "requestData",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	}
]

# Setup rich and logging
install()
console = Console()
logging.basicConfig(level=logging.INFO, format="%(message)s", handlers=[RichHandler()])
logger = logging.getLogger("oracle")

try:
    w3 = Web3(Web3.HTTPProvider(f"https://eth-sepolia.g.alchemy.com/v2/{os.getenv('ALCHEMY_API_KEY')}"))
    logger.info("Connected to Web3 provider.")
except Exception as e:
    console.print(f"[bold red]Failed to connect to Web3 provider: {e}[/]")
    raise

try:
    oracle_contract = w3.eth.contract(address=os.getenv('ORACLE_ADDR'), abi=agent_abi)
    logger.info("Oracle contract initialized.")
except Exception as e:
    console.print(f"[bold red]Failed to initialize oracle contract: {e}[/]")
    raise

# Function to handle Google Maps API requests
def query_google_maps(query, location=None):
    try:
        api_key = os.getenv("GOOGLE_MAPS_API_KEY")
        
        if not api_key:
            return "Error: Google Maps API key not found in environment variables."
        
        # Format the query correctly
        # search_query = query
        # if location:
        #     search_query = f"{query} in {location}"
        
        # # Find the location from the query if not explicitly provided
        # if not location:
        #     # Try to extract location from the query using simple heuristics
        #     location_keywords = ["in ", "near ", "at ", "around "]
        #     for keyword in location_keywords:
        #         if keyword in query.lower():
        #             location = query.lower().split(keyword)[1].strip()
        #             break
        
        # Places API request
        base_url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
        params = {
            "query": query,
            "key": api_key
        }
        
        response = requests.get(base_url, params=params)
        places_data = response.json()
        
        if places_data["status"] != "OK":
            return f"Error from Google Maps API: {places_data['status']}"
        
        # Format the results
        results = []
        for place in places_data["results"][:5]:  # Limit to top 5 results
            name = place["name"]
            address = place.get("formatted_address", "Address not available")
            rating = place.get("rating", "No rating")
            total_ratings = place.get("user_ratings_total", 0)
            
            results.append(f"• {name}\n  Address: {address}\n  Rating: {rating}/5 ({total_ratings} reviews)")
        
        if results:
            return f"Here are some places I found for '{query}':\n\n" + "\n\n".join(results)
        else:
            return f"No places found for '{query}'."
            
    except Exception as e:
        logger.error(f"Error querying Google Maps API: {e}")
        return f"Sorry, I encountered an error while searching for places: {str(e)}"

async def trigger_external_action(me, *args):
    wallet = args[0]
    data = args[1]
    original = args[2]
    hops = args[3]
    agents = [a for a in db.list_agent() if a["address"] != me]
    my_agent = [a for a in db.list_agent() if a["address"] == me][0]
    hopnames = [agent["id"] for agent in agents if agent["address"] in hops] + [my_agent["id"]]
    
    # Start progress tracking
    await websocket.send_json({
            "type": "progress_started",
            "data": {
                "wallet": wallet,
                "input": data,
                "original": original,
                "hops": hops + [me],
                "current_agent": my_agent
            }
        })
    
    if my_agent["id"] == "google_maps":
        logger.info("Google Maps agent activated. Using Maps API instead of OpenAI.")
        
        location = None
        if "in " in data.lower():
            parts = data.lower().split("in ")
            if len(parts) > 1:
                location = parts[1].strip()
                query = parts[0].strip()
            else:
                query = data
        else:
            query = data
        
        # Query Google Maps API
        text_response = query_google_maps(query, location)
        console.print(f"[bold green]Google Maps Response: {text_response}[/]")
        
        # Send response
        websocket.result = text_response
        await websocket.safe_discard(wallet.lower())
        
        # Log completion
        time.sleep(0.3 + random.uniform(0, 0.7))
        await websocket.send_json({
            "type": "progress_finished",
            "data": {
                "wallet": wallet,
                "input": data,
                "original": original,
                "hops": hops + [me],
                "current_agent": my_agent,
                "response": text_response
            }
        })
        
        return
    
    # Continue with regular OpenAI-based agent functionality for non-Google Maps agents
    agents = [a for a in agents if a["address"] not in hops]
    tools = [{
		"type": "function",
            "function": {
                "name": agent["id"],
                "description": agent["description"],
                "parameters": {
                    "type": "object",
                    "properties": {
                        "input": {
                            "type": "string",
                            "description": f"A text description detailing anything that could relate to {agent['id']}."
                        }
                    },
                    "required": ["input"]
                }
            }        
	} for agent in agents]
    
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    system_prompt = (
        f"NOT ALLOWED TOOLS: {','.join(hopnames)}."
        "Respond to user by: (1) Defer to one of the ALLOWED tools, (2) directly respond to user if it fits within your boundaries."
        "When deferring select the most helpful service."
        f"Your skills include: {my_agent['description']}."
    )
    
    print(system_prompt)
    
    response = client.chat.completions.create(
        model="gpt-4o",
		messages=[
			{"role": "system", "content": system_prompt},
			{"role": "user", "content": f"Context: {original}\nQuery: {data}"},
		],
		tools=tools,
		tool_choice="auto"
	)
    
    # Debug response
    logger.info(f"Response tool calls: {response.choices[0].message.tool_calls}")
    
    if response.choices[0].message.tool_calls:
        next_name = response.choices[0].message.tool_calls[0].function.name
        console.print(f"[bold green]Next AI: {next_name}[/]")
        next_address = [agent["address"] for agent in agents if agent["id"] == next_name][0]
        
        time.sleep(0.3 + random.uniform(0, 0.7))
        await websocket.send_json({
            "type": "progress_finished",
            "data": {
                "wallet": wallet,
                "input": data,
                "original": original,
                "hops": hops + [me],
                "next": next_name,
                "current_agent": my_agent,
                "next_agent": [agent for agent in agents if agent["id"] == next_name][0],
                "next_address": next_address
            }
        })
        agent.call_contract_function(w3, wallet, eval(response.choices[0].message.tool_calls[0].function.arguments)["input"], original, hops + [me], logger, next_address)
    else:
        text_response = response.choices[0].message.content
        console.print(f"[bold green]Response: {text_response}[/]")
        websocket.result = text_response
        console.print(f"[bold yellow]Discarding wallet: {wallet}[/]")
        await websocket.safe_discard(wallet.lower())
    
    
last_block_processed = 0
    
def set_initial_block():
    global last_block_processed
    last_block_processed = w3.eth.block_number

async def listen_for_contract_requests():
    global last_block_processed
    try:        
        # Check for new blocks
        current_block = w3.eth.block_number
        if current_block > last_block_processed:
            logger.info(f"Checking blocks {last_block_processed+1} to {current_block}")
            
            # Loop through each new block
            for block_num in range(last_block_processed + 1, current_block + 1):
                # Get all logs with the IRISRequestAgentData event signature
                event_signature = "0x" + w3.keccak(text="IRISRequestAgentData(address,string,uint256,string,address[])").hex()
                logs = w3.eth.get_logs({
                    'fromBlock': block_num,
                    'toBlock': block_num,
                    'topics': [event_signature]
                })
                
                # Process each log
                for log in logs:
                    # Create a contract instance with the log's address
                    contract_address = log['address']
                    temp_contract = w3.eth.contract(address=contract_address, abi=agent_abi)
                    
                    # Process the event data
                    try:
                        event = temp_contract.events.IRISRequestAgentData().process_log(log)
                        logger.info(f"Event received from {contract_address}: {event}")
                        if event['event'] == 'IRISRequestAgentData':
                            argsdict = dict(event['args'])
                            await trigger_external_action(contract_address, argsdict['userAddress'], argsdict['data'], argsdict['originalData'], argsdict['hops'])
                    except Exception as e:
                        logger.error(f"Failed to process event: {e}")
                        raise e
            
            # Update the last processed block
            last_block_processed = current_block
    except Exception as e:
        console.print(f"[bold red]Error in listen_for_contract_requests: {e}[/]")
        logger.exception("Exception occurred in listen_for_contract_requests.")