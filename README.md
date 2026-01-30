# Local Crust Bakery 🥖

A full-stack bakery e-commerce platform with multi-database support (SQLite & AWS DynamoDB).

## Features
- Customer ordering system
- Baker dashboard with analytics
- Product reviews and ratings
- Razorpay payment integration
- Email notifications
- AI-powered recommendations
- AWS SNS notifications

## Tech Stack
- **Backend**: Flask (Python)
- **Frontend**: React + Vite + TypeScript
- **Database**: SQLite / AWS DynamoDB
- **Payment**: Razorpay
- **Cloud**: AWS (SNS, DynamoDB)

## Setup Instructions

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements_sns.txt
cp .env.example .env  # Configure your environment variables
python app.py  # For SQLite version
# OR
python aws_app.py  # For AWS DynamoDB version
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Environment Variables
Create `.env` files in both `backend/` and `frontend/` directories.
See `.env.example` files for required variables.

## License
MIT
