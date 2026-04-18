<!-- 
money-coach-sms/
├── .env                           ← CREATE THIS
├── .env.example                   ← CREATE THIS
├── .gitignore                     ← CREATE THIS
├── package.json                   ← CREATE THIS
├── README.md                      ← CREATE THIS (optional but good practice)
│
├── src/
│   ├── db/
│   │   ├── schema.sql            ← CREATE THIS
│   │   ├── client.js             ← CREATE THIS
│   │   └── queries.js            ← CREATE THIS (can be empty for now)
│   │
│   ├── routes/
│   │   └── knot-oauth.js         ← CREATE THIS
│   │
│   └── index.js                  ← CREATE THIS
│
├── scripts/
│   └── seed-test-data.js         ← CREATE THIS
│
└── public/
    └── knot-connect.html         ← CREATE THIS -->

# Money Coach SMS

AI financial assistant powered by Knot API + Claude + Photon SMS

## Setup

1. Install dependencies:
```bash
npm install


```
### Set up database:

```
# Create database
createdb moneycoach

# Run schema
npm run db:setup

# Seed test data
npm run db:seed
```


### Configure environment:

```
cp .env.example .env
# Fill in your credentials
```

### Run server:

```
npm run dev
```

