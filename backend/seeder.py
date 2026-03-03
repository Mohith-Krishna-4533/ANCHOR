import requests
import random
import time
from datetime import datetime

BASE = "http://localhost:5001"

NUM_IDENTITIES = 120
FRAUD_RING_SIZE = 5
banks = ["Bank A", "Bank B", "Bank C", "Bank D"]

def random_identity():
    return f"PAN{random.randint(100000,999999)}"

def random_account():
    return f"ACC{random.randint(10000,99999)}"

def create_alert(identity, alert_type, risk):
    requests.post(f"{BASE}/alerts", json={
        "identity": identity,
        "type": alert_type,
        "risk_score": risk,
        "institution": random.choice(banks)
    })

def create_tx(identity, from_acc, to_acc, amount):
    requests.post(f"{BASE}/transactions", json={
        "identity": identity,
        "from_account": from_acc,
        "to_account": to_acc,
        "amount": amount
    })

print("Generating advanced financial network...\n")

identities = [random_identity() for _ in range(NUM_IDENTITIES)]

# -----------------------------
# FRAUD RINGS
# -----------------------------

for i in range(0, 20, FRAUD_RING_SIZE):
    ring = identities[i:i+FRAUD_RING_SIZE]

    mule_account = random_account()

    print(f"Creating fraud ring with mule {mule_account}")

    for identity in ring:

        # High risk alerts
        create_alert(identity, "SOC", random.uniform(0.8, 0.95))
        create_alert(identity, "AML", random.uniform(0.8, 0.95))

        # Burst deposits into shared mule
        for _ in range(4):
            create_tx(identity, random_account(), mule_account, random.randint(4000, 9000))
            time.sleep(0.05)

        # Circular laundering inside ring
        next_identity = random.choice(ring)
        create_tx(identity, mule_account, random_account(), random.randint(5000, 12000))

# -----------------------------
# LAYERED LAUNDERING CHAINS
# -----------------------------

for i in range(20, 40):
    identity = identities[i]

    create_alert(identity, "SOC", random.uniform(0.75, 0.9))
    create_alert(identity, "AML", random.uniform(0.7, 0.85))

    accounts = [random_account() for _ in range(4)]

    for j in range(len(accounts)-1):
        create_tx(identity, accounts[j], accounts[j+1], random.randint(3000, 10000))
        time.sleep(0.05)

# -----------------------------
# FALSE POSITIVES
# -----------------------------

for i in range(40, 70):
    identity = identities[i]

    alert_type = random.choice(["SOC", "AML"])
    create_alert(identity, alert_type, random.uniform(0.6, 0.75))

    for _ in range(3):
        create_tx(identity, random_account(), random_account(), random.randint(1000, 4000))

# -----------------------------
# CLEAN USERS
# -----------------------------

for i in range(70, NUM_IDENTITIES):
    identity = identities[i]

    for _ in range(random.randint(2,5)):
        create_tx(identity, random_account(), random_account(), random.randint(500, 2500))

print("\nAdvanced network generation complete.")