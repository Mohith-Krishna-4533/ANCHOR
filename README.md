# █████╗ ███╗   ██╗ ██████╗██╗  ██╗ ██████╗ ██████╗  
# ██╔══██╗████╗  ██║██╔════╝██║  ██║██╔═══██╗██╔══██╗
# ███████║██╔██╗ ██║██║     ███████║██║   ██║██████╔╝
# ██╔══██║██║╚██╗██║██║     ██╔══██║██║   ██║██╔══██╗
# ██║  ██║██║ ╚████║╚██████╗██║  ██║╚██████╔╝██║  ██║
# ╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝

---

## Overview

ANCHOR is a hybrid cyber–financial intelligence platform designed to detect coordinated financial crime by correlating cybersecurity alerts with anti-money laundering (AML) activity.

It integrates:

- Cross-domain alert correlation  
- Transaction burst detection  
- Real-time graph analysis  
- AI-assisted risk reasoning (Google Gemini)  
- Blockchain-based alert anchoring  

The system bridges the gap between cybersecurity compromise signals and financial exploitation patterns.

---

## Problem

Modern fraud is no longer isolated.

### Security Operations Centers (SOC) detect:
- Phishing attacks  
- Account compromise  
- Credential misuse  

### AML systems detect:
- Suspicious transactions  
- Structuring behavior  
- Transaction bursts  

These systems operate independently, leading to:

- Missed cross-domain fraud  
- High false positive rates  
- Lack of unified visibility  
- Weak audit integrity  

ANCHOR addresses this structural gap.

---

## Solution

ANCHOR unifies cyber and financial intelligence into a single pipeline:

1. Ingest SOC and AML alerts  
2. Monitor real-time transactions  
3. Detect burst patterns within temporal windows  
4. Construct transaction network graphs  
5. Compute unified network risk  
6. Invoke AI correlation when threshold conditions are met  
7. Anchor critical alerts to blockchain for immutability  

AI escalation is gated behind deterministic validation to reduce noise and improve reliability.

---

## Architecture

```
React Frontend
        ↓
Flask Backend (Unified Intelligence Engine)
        ↓
MongoDB (Alerts + Transactions + Graph Data)
        ↓
Google Gemini API (AI Correlation Layer)
        ↓
Ethereum Smart Contract (Hardhat) – Blockchain Anchoring
```

---

## Key Features

### 1. Cross-Domain Correlation

Escalates only when:
- SOC + AML alerts exist  
- AND burst or high-risk conditions are met  

Reduces false positives significantly.

---

### 2. Transaction Burst Detection

Identifies clustered high-volume transfers within rolling time windows.

---

### 3. Network Graph Intelligence

Models financial activity as a directed graph:

- **Nodes** = Accounts  
- **Edges** = Transfers  

Detects:
- Mule accounts  
- Transaction chains  
- Fraud rings  
- Circular laundering  

---

### 4. AI-Assisted Risk Reasoning

Google Gemini evaluates structured risk context and returns:

- Correlation decision  
- Confidence score  
- Recommended action  

Includes JSON validation and fallback logic.

---

### 5. Blockchain Anchoring

Critical alerts are:

- HMAC-hashed  
- Written to a smart contract  
- Assigned transaction hash and block number  

Ensures:

- Tamper-proof audit trail  
- Chronological traceability  
- Regulatory defensibility  

---

## Tech Stack

### Backend
- Python (Flask)  
- MongoDB  
- Web3.py  
- Google Gemini API  
- Hardhat (Ethereum)  

### Frontend
- React.js  
- Canvas-based graph visualization  

### Blockchain
- Solidity smart contract  
- Local Ethereum test network (Hardhat)  

---

## Repository Structure

```
ANCHOR/
│
├── backend/
│   ├── app.py
│   ├── abi.json
│   ├── requirements.txt
│   └── .env.example
│
├── blockchain/
│   ├── contracts/
│   ├── scripts/
│   └── hardhat.config.js
│
├── frontend/
│   └── React application
│
└── seed/
    ├── seed_bulk_data.py
    └── seed_advanced_network.py
```

---

## Setup Instructions

### 1. Clone Repository

```bash
git clone https://github.com/your-repo/ANCHOR.git
cd ANCHOR
```

---

### 2. Start MongoDB

Ensure MongoDB is running locally:

```bash
mongod
```

---

### 3. Deploy Smart Contract (Hardhat)

```bash
cd blockchain
npm install
npx hardhat node
```

In another terminal:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

Copy the deployed contract address.

---

### 4. Backend Setup

```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file:

```
CONTRACT_ADDRESS=0xYourDeployedAddress
CONSORTIUM_SECRET=your_secret_key
GEMINI_API_KEY=your_gemini_api_key
```

Run backend:

```bash
python app.py
```

Backend runs at:

```
http://localhost:5000
```

---

### 5. Frontend Setup

```bash
cd frontend
npm install
npm start
```

Frontend runs at:

```
http://localhost:3000
```

---

## Seeding Data (Optional)

To generate realistic fraud scenarios:

```bash
python seed/seed_advanced_network.py
```

This creates:

- Fraud rings  
- Shared mule accounts  
- Burst transactions  
- False positives  
- Clean users  

---

## API Endpoints

### POST `/alerts`
Create SOC or AML alert.

### POST `/transactions`
Create transaction.

### GET `/dashboard/<identity>`
Retrieve:
- Network risk score  
- Burst status  
- Timeline  
- Graph data  
- AI correlation output  

### POST `/anchor-alert`
Anchor alert to blockchain.

### GET `/graph/all`
Retrieve global transaction graph.

---

## Security Design

- Identity protected via HMAC hashing before blockchain anchoring  
- AI invocation gated behind rule-based validation  
- No raw sensitive identifiers written on-chain  
- Fallback logic prevents AI instability from breaking pipeline  

---

## Scalability Considerations

- Blockchain layer can migrate to consortium chain  
- MongoDB graph layer can evolve into Neo4j or distributed graph engine  
- AI thresholds can evolve into adaptive models  
- Backend can transition to microservice architecture  

---

## Future Improvements

- Inter-bank federated identity correlation  
- Advanced graph centrality scoring  
- Real-time streaming ingestion  
- Production blockchain deployment  
- Role-based access controls  

---

## License

Developed for Geminathon. Provided for academic and demonstration purposes.

---

## Team

Mohith Krishna Mahesh
Akshay R
Rahul Raj
Devika S R
