from flask import Flask, request, jsonify
from flask_cors import CORS
from web3 import Web3
from pymongo import MongoClient
from bson import ObjectId
from bson.errors import InvalidId
from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import json
import os
import re
import random
from google import genai
from google.genai import types
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

# ============================================================
# INIT
# ============================================================

app = Flask(__name__)
CORS(app)

# ============================================================
# CONFIG
# ============================================================

HARDHAT_RPC = "http://127.0.0.1:8545"
CONTRACT_ADDRESS = os.environ.get("CONTRACT_ADDRESS")
CONSORTIUM_SECRET = os.environ.get("CONSORTIUM_SECRET")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

BURST_WINDOW_MINUTES = 30
RISK_THRESHOLD = 0.75
TRANSFER_THRESHOLD = 10000
MIN_BURST_TX_COUNT = 2

if not CONSORTIUM_SECRET:
    raise Exception("CONSORTIUM_SECRET must be set")

if not CONTRACT_ADDRESS:
    raise Exception("CONTRACT_ADDRESS must be set")

if not GEMINI_API_KEY:
    raise Exception("GEMINI_API_KEY must be set")

# ============================================================
# GEMINI SETUP
# ============================================================

client = genai.Client(api_key=GEMINI_API_KEY)

# ============================================================
# BLOCKCHAIN CONNECTION
# ============================================================

import time
w3 = Web3(Web3.HTTPProvider(HARDHAT_RPC))

connected = False
for i in range(15):
    if w3.is_connected():
        connected = True
        break
    print(f"Waiting for Hardhat (attempt {i+1}/15)...")
    time.sleep(2)

if not connected:
    raise Exception("Cannot connect to Hardhat after 30 seconds")

accounts = w3.eth.accounts
if not accounts:
    raise Exception("No accounts available on the node")

w3.eth.default_account = accounts[0]

abi_path = os.path.join(BASE_DIR, "abi.json")
with open(abi_path) as f:
    abi = json.load(f)

contract = w3.eth.contract(
    address=Web3.to_checksum_address(CONTRACT_ADDRESS),
    abi=abi
)

# ============================================================
# MONGO CONNECTION
# ============================================================

mongo_client = MongoClient("mongodb+srv://Kazuki:DiabloTheDemonLord@cluster0.eyqikqu.mongodb.net/?appName=Cluster0")
db = mongo_client["anchor"]

alerts_collection = db["alerts"]
transactions_collection = db["transactions"]

# ============================================================
# INDEXES
# ============================================================

def create_indexes():
    alerts_collection.create_index("identity")
    alerts_collection.create_index("timestamp")
    alerts_collection.create_index("type")

    transactions_collection.create_index("identity")
    transactions_collection.create_index("timestamp")
    transactions_collection.create_index("from_account")
    transactions_collection.create_index("to_account")

create_indexes()

def reset_database_on_startup():
    print("Purging database for fresh session...")
    alerts_collection.delete_many({})
    transactions_collection.delete_many({})


# ============================================================
# UTIL
# ============================================================

def serialize_timestamp(ts):
    if isinstance(ts, datetime):
        return ts.isoformat()
    return str(ts)

# ============================================================
# BLOCKCHAIN ANCHOR
# ============================================================

def anchor_alert_to_blockchain(alert):

    entity_hash = w3.keccak(
        primitive=hmac.new(
            key=CONSORTIUM_SECRET.encode(),
            msg=alert["identity"].encode(),
            digestmod=hashlib.sha256
        ).digest()
    )

    payload = {
        "identity": alert["identity"],
        "type": alert["type"],
        "risk_score": alert["risk_score"],
        "timestamp": serialize_timestamp(alert["timestamp"])
    }

    event_hash = w3.keccak(text=json.dumps(payload, sort_keys=True))

    tx_hash = contract.functions.logAlert(
        event_hash,
        entity_hash,
        alert["institution"]
    ).transact()

    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

    return {
        "tx_hash": tx_hash.hex(),
        "block_number": receipt.blockNumber,
        "event_hash": event_hash.hex()
    }

# ============================================================
# DETECTION LOGIC
# ============================================================

def detect_transaction_burst(identity):

    cutoff = datetime.now(timezone.utc) - timedelta(minutes=BURST_WINDOW_MINUTES)

    transactions = list(transactions_collection.find({
        "identity": identity,
        "timestamp": {"$gte": cutoff}
    }))

    if not transactions:
        return False, 0, 0

    total_amount = sum(t["amount"] for t in transactions)

    burst = (
        total_amount >= TRANSFER_THRESHOLD and
        len(transactions) >= MIN_BURST_TX_COUNT
    )

    return burst, total_amount, len(transactions)

def calculate_network_risk(alerts, burst_detected):

    if not alerts:
        return 0

    # Base = highest individual risk
    base_risk = max(a["risk_score"] for a in alerts)

    # Diminishing returns per extra alert: 1 - (1-base)**n approach
    # Each additional alert adds less than the previous
    extra = len(alerts) - 1
    volume_bonus = 1 - (1 - base_risk) * (0.85 ** extra)  # softer than linear
    total_risk = volume_bonus

    if burst_detected:
        total_risk = min(total_risk + 0.10, 1.0)

    return float(round(min(total_risk, 1.0), 4))

def should_call_gemini(risk, burst_detected, soc_exists, aml_exists):

    return soc_exists and aml_exists and (
        burst_detected or risk > RISK_THRESHOLD
    )

# ============================================================
# GEMINI INTEGRATION
# ============================================================

def run_gemini_correlation(risk, burst_detected, tx_count, total_amount):

    prompt = f"""
You are an expert financial crime intelligence analyst.

Context:
- Combined network risk score: {round(risk, 2)} (0 to 1 scale)
- Transaction burst detected: {burst_detected}
- Burst transaction count: {tx_count}
- Burst transfer total: {total_amount}

Your task:
1. Assess whether this indicates coordinated cross-domain fraud.
2. Provide a concise explanation (maximum 2 sentences).
3. Recommend exactly one action:
   - freeze_accounts
   - escalate_review
   - monitor

Return ONLY valid JSON in this exact structure:

{{
  "correlated": true/false,
  "confidence": 0.0_to_1.0,
  "summary": "short explanation",
  "recommended_action": "freeze_accounts|escalate_review|monitor"
}}
"""

    try:
        response = client.models.generate_content(
            model='gemini-1.5-flash-8b',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            )
        )
        text = response.text.strip()
        
        # Remove any Markdown code block framing if still present
        if text.startswith("```"):
            lines = text.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            text = "\n".join(lines).strip()
            
        return json.loads(text)

    except Exception as e:
        print(f"Gemini API Error: {e}")
        return {
            "correlated": False,
            "confidence": round(risk, 2),
            "summary": "AI correlation unavailable. Falling back to rule-based monitoring.",
            "recommended_action": "monitor"
        }

# ============================================================
# INGESTION ROUTES
# ============================================================

@app.route("/alerts", methods=["POST"])
def create_alert():

    data = request.json or {}
    required = ["identity", "type", "risk_score", "institution"]

    if not all(k in data for k in required):
        return jsonify({"error": "Missing fields"}), 400

    risk = max(0.0, min(1.0, float(data["risk_score"])))

    alert = {
        "identity": data["identity"],
        "type": data["type"],
        "risk_score": risk,
        "institution": data["institution"],
        "timestamp": datetime.now(timezone.utc),
        "anchored": False
    }

    result = alerts_collection.insert_one(alert)

    return jsonify({"inserted_id": str(result.inserted_id)})

@app.route("/transactions", methods=["POST"])
def create_transaction():

    data = request.json or {}
    required = ["identity", "from_account", "to_account", "amount"]

    if not all(k in data for k in required):
        return jsonify({"error": "Missing fields"}), 400

    txn = {
        "identity": data["identity"],
        "from_account": data["from_account"],
        "to_account": data["to_account"],
        "amount": float(data["amount"]),
        "timestamp": datetime.now(timezone.utc)
    }

    result = transactions_collection.insert_one(txn)

    return jsonify({"inserted_id": str(result.inserted_id)})

# ============================================================
# MAIN ROUTES
# ============================================================

@app.route("/")
def home():
    return jsonify({"message": "ANCHOR Backend Running"})

@app.route("/seed/<identity>", methods=["POST"])
def seed_identity(identity):
    # Clear existing for fresh start
    alerts_collection.delete_many({"identity": identity})
    transactions_collection.delete_many({"identity": identity})

    # Generate mock Fraud Ring for this identity with diverse accounts
    mule = f"MULE-{random.randint(1000, 9999)}"
    sources = [f"ACC-{random.randint(100, 999)}{chr(65+i)}" for i in range(4)]

    # Moderate-risk baseline (not instantly maxed)
    alerts = [
        {"identity": identity, "type": "SOC", "risk_score": 0.52, "institution": "BANK_A", "timestamp": datetime.now(timezone.utc) - timedelta(hours=2), "anchored": False},
        {"identity": identity, "type": "AML", "risk_score": 0.48, "institution": "BANK_B", "timestamp": datetime.now(timezone.utc) - timedelta(hours=1), "anchored": False},
    ]
    alerts_collection.insert_many(alerts)

    # Varied burst transactions across multiple accounts
    txs = [
        {"identity": identity, "from_account": sources[0], "to_account": sources[1], "amount": random.randint(2000, 5000), "timestamp": datetime.now(timezone.utc) - timedelta(minutes=90)},
        {"identity": identity, "from_account": sources[1], "to_account": mule, "amount": random.randint(5000, 9000), "timestamp": datetime.now(timezone.utc) - timedelta(minutes=60)},
        {"identity": identity, "from_account": sources[2], "to_account": mule, "amount": random.randint(5000, 9000), "timestamp": datetime.now(timezone.utc) - timedelta(minutes=45)},
        {"identity": identity, "from_account": sources[3], "to_account": sources[0], "amount": random.randint(3000, 7000), "timestamp": datetime.now(timezone.utc) - timedelta(minutes=30)},
    ]
    transactions_collection.insert_many(txs)

    return jsonify({"status": "seeded", "identity": identity, "mule": mule, "sources": sources})

@app.route("/reset/<identity>", methods=["POST"])
def reset_identity(identity):
    """Wipe all data for this identity and re-seed fresh."""
    alerts_collection.delete_many({"identity": identity})
    transactions_collection.delete_many({"identity": identity})
    return jsonify({"status": "reset", "identity": identity})

@app.route("/intervene/<identity>", methods=["POST"])
def intervene_identity(identity):
    """Halve the risk score of all alerts to simulate gradual mitigation."""
    alerts_collection.update_many(
        {"identity": identity},
        {"$mul": {"risk_score": 0.5}}
    )
    return jsonify({"status": "mitigated", "identity": identity})

@app.route("/gemini/<identity>", methods=["POST"])
def trigger_gemini(identity):
    alerts = list(alerts_collection.find({"identity": identity}))

    burst_detected, total_amount, tx_count = detect_transaction_burst(identity)
    risk = calculate_network_risk(alerts, burst_detected)

    # Force AI correlation regardless of rule-based thresholds
    ai_output = run_gemini_correlation(risk, burst_detected, tx_count, total_amount)
    
    return jsonify(ai_output)

@app.route("/graph/all", methods=["GET"])
def global_graph():

    transactions = list(transactions_collection.find())

    nodes = set()
    edges = []

    for t in transactions:
        nodes.add(t["from_account"])
        nodes.add(t["to_account"])

        edges.append({
            "source": t["from_account"],
            "target": t["to_account"],
            "amount": t["amount"],
            "identity": t.get("identity")
        })

    return jsonify({
        "node_count": len(nodes),
        "edge_count": len(edges),
        "nodes": [{"id": n} for n in sorted(nodes)],
        "edges": edges
    })

@app.route("/anchor-alert", methods=["POST"])
def anchor_alert():

    data = request.json or {}
    alert_id = data.get("alert_id")

    if not alert_id:
        return jsonify({"error": "alert_id required"}), 400

    try:
        oid = ObjectId(alert_id)
    except InvalidId:
        return jsonify({"error": "Invalid alert_id format"}), 400

    alert = alerts_collection.find_one({"_id": oid, "anchored": False})

    if not alert:
        return jsonify({"error": "Alert not found or already anchored"}), 404

    try:
        result = anchor_alert_to_blockchain(alert)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    alerts_collection.update_one(
        {"_id": oid},
        {"$set": {"anchored": True, "blockchain": result}}
    )

    return jsonify(result)

@app.route("/dashboard/<identity>")
def dashboard(identity):

    alerts = list(alerts_collection.find({"identity": identity}))

    burst_detected, total_amount, tx_count = detect_transaction_burst(identity)
    risk = calculate_network_risk(alerts, burst_detected)
    score_display = int(risk * 100)

    soc_exists = any(a["type"] == "SOC" for a in alerts)
    aml_exists = any(a["type"] == "AML" for a in alerts)

    anchored = [a for a in alerts if a.get("anchored") and "blockchain" in a]

    timeline = [{
        "type": a["type"],
        "institution": a["institution"],
        "block_number": a["blockchain"]["block_number"],
        "tx_hash": a["blockchain"]["tx_hash"],
        "timestamp": serialize_timestamp(a["timestamp"])
    } for a in anchored]

    transactions = list(transactions_collection.find({
        "identity": identity
    }))

    nodes_set = set()
    edge_map = {}
    
    latest_tx = None
    if transactions:
        latest_tx = max(transactions, key=lambda tx: tx.get("timestamp", datetime.min.replace(tzinfo=timezone.utc)))

    # 1. Add transaction nodes and edges
    for t in transactions:
        u, v = t["from_account"], t["to_account"]
        nodes_set.add(u)
        nodes_set.add(v)
        
        edge_key = tuple(sorted([u, v]))
        if edge_key not in edge_map:
            edge_map[edge_key] = {"source": u, "target": v, "amount": 0, "is_latest": False}
        edge_map[edge_key]["amount"] += t["amount"]
        
        if latest_tx and t["_id"] == latest_tx["_id"]:
            edge_map[edge_key]["is_latest"] = True

    # 2. Extract specific accounts from alerts to show on graph
    for a in alerts:
        if "account" in a:
            nodes_set.add(a["account"])

    graph = {
        "nodes": [{"id": n} for n in sorted(nodes_set)],
        "edges": list(edge_map.values())
    }

    # Rule-based AI output (no Gemini here to avoid quota spam)
    # Gemini is only called via POST /gemini/<identity>
    if soc_exists and aml_exists and burst_detected:
        ai_output = {
            "correlated": True,
            "confidence": round(risk, 2),
            "summary": "Both SOC and AML alerts detected alongside a transaction burst. High probability of coordinated cross-domain fraud.",
            "recommended_action": "escalate_review"
        }
    elif soc_exists and aml_exists:
        ai_output = {
            "correlated": True,
            "confidence": round(risk, 2),
            "summary": "Cross-domain signals detected from both SOC and AML systems. Correlation pending transaction analysis.",
            "recommended_action": "escalate_review"
        }
    elif risk > 0.6:
        ai_output = {
            "correlated": False,
            "confidence": round(risk, 2),
            "summary": "Elevated risk score detected. Single-domain signal — monitoring active.",
            "recommended_action": "monitor"
        }
    else:
        ai_output = {
            "correlated": False,
            "confidence": round(risk, 2),
            "summary": "Monitoring continues. No cross-domain escalation triggered.",
            "recommended_action": "monitor"
        }

    return jsonify({
        "network_risk": {
            "score": score_display,
            "confidence": round(risk, 2)
        },
        "burst_detected": burst_detected,
        "burst_tx_count": tx_count,
        "burst_total_amount": total_amount,
        "timeline": timeline,
        "graph": graph,
        "ai_output": ai_output
    })

if __name__ == "__main__":
    reset_database_on_startup()
    app.run(host="127.0.0.1", port=5001, debug=False)