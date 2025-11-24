const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const uri = process.env.MONGO_URI || "mongodb+srv://fineasedbUser:nOC5Qz8xIk0t0eoO@my-first-cluster1.c0ymrhl.mongodb.net/?appName=MY-First-Cluster1";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();
    const db = client.db('smart_db');

    const transactionsCollection = db.collection('transactions');
    const usersCollection = db.collection('users');
    const budgetsCollection = db.collection('budgets');     // new
    const savingsCollection = db.collection('savings');     // new
    const reportsCollection = db.collection('reports');
    app.get('/', (req, res) => {
      res.send('Smart server is running');
    });
    app.post('/users', async (req, res) => {
      const newUser = req.body;
      if (!newUser?.email) return res.status(400).send({ message: 'email required' });
      const existing = await usersCollection.findOne({ email: newUser.email });
      if (existing) return res.send({ message: 'User already exists' });
      const result = await usersCollection.insertOne(newUser);
      res.send(result);
    });

    app.get('/transactions', async (req, res) => {
      const { email, category, type, sort } = req.query;
      const query = {};
      if (email) query.email = email;
      if (category) query.category = category;
      if (type) query.type = type;
      let sortOption = { date: -1 };
      if (sort === 'amount') sortOption = { amount: -1 };
      if (sort === 'date') sortOption = { date: -1 };

      const result = await transactionsCollection.find(query).sort(sortOption).toArray();
      res.send(result);
    });

    app.get('/transactions/:id', async (req, res) => {
      const id = req.params.id;
      const result = await transactionsCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    app.post('/transactions', async (req, res) => {
      const data = req.body;
      if (!data.email || !data.amount || !data.category || !data.type) {
        return res.status(400).send({ message: "Missing fields!" });
      }
      data.amount = Number(data.amount); 
      data.createdAt = new Date();
      if (data.date) data.date = new Date(data.date).toISOString();

      const result = await transactionsCollection.insertOne(data);
      res.send(result);
    });
    app.patch('/transactions/:id', async (req, res) => {
      const id = req.params.id;
      const updated = req.body;
      const updateDoc = {
        $set: {
          type: updated.type,
          category: updated.category,
          amount: Number(updated.amount),
          description: updated.description,
          date: updated.date ? new Date(updated.date).toISOString() : updated.date,
        }
      };
      const result = await transactionsCollection.updateOne({ _id: new ObjectId(id) }, updateDoc);
      res.send(result);
    });

    app.delete('/transactions/:id', async (req, res) => {
      const id = req.params.id;
      const result = await transactionsCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });
app.post("/budget", async (req, res) => {
  const { email, category, amount } = req.body;
  if (!email || !category || !amount)
    return res.status(400).send({ message: "Fields missing" });

  const result = await budgetsCollection.updateOne(
    { email, category },
    { $set: { amount: Number(amount) } },
    { upsert: true }
  );

  res.send(result);
});
app.get('/expenses-summary-monthly', async (req, res) => {
  const email = req.query.email;
  const month = parseInt(req.query.month); // 1-12

  if (!email || !month) {
    return res.status(400).send({ message: "Email and month required" });
  }
  try {
    const pipeline = [
      {
        $match: {
          email: email,
          type: "expense"
        }
      },
      {
        $addFields: {
          month: { $month: { $toDate: "$date" } }
        }
      },
      {
        $match: {
          month: month
        }
      },
      {
        $group: {
          _id: "$category",
          totalSpent: { $sum: "$amount" }
        }
      }
    ];
    const result = await transactionsCollection.aggregate(pipeline).toArray();
    res.send(result);

  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Error processing monthly summary" });
  }
});

app.get("/budget", async (req, res) => {
  const email = req.query.email;
  const result = await budgetsCollection.find({ email }).toArray();
  res.send(result);
});

app.post("/save-leftover", async (req, res) => {
  const { email, category, leftover } = req.body;

  const targetExists = await savingsCollection.findOne({
    email,
    name: category,
  });

  if (!targetExists) {
    await savingsCollection.insertOne({
      email,
      name: category,
      target: leftover * 5,
      current: leftover,
    });
  } else {
    await savingsCollection.updateOne(
      { email, name: category },
      { $inc: { current: leftover } }
    );
  }
  res.send({ message: "Leftover saved!" });
});

    app.delete('/budget/:id', async (req, res) => {
      const id = req.params.id;
      const result = await budgetsCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    app.post("/savings", async (req, res) => {
  const data = req.body;
  if (!data.email || !data.name || !data.target) {
    return res.status(400).send({ message: "Missing fields" });
  }
  data.current = 0;
  const result = await savingsCollection.insertOne(data);
  res.send(result);
});

app.get("/savings", async (req, res) => {
  const email = req.query.email;
  const result = await savingsCollection.find({ email }).toArray();
  res.send(result);
});

    app.patch('/savings/add/:name', async (req, res) => {
      const name = req.params.name;
      const { email, amount } = req.body;
      if (!email || amount == null) return res.status(400).send({ message: 'Missing fields' });

      const result = await savingsCollection.updateOne(
        { email, name },
        { $inc: { current: Number(amount) }, $set: { updatedAt: new Date() } }
      );
      res.send(result);
    });

   app.get("/expenses-summary", async (req, res) => {
  const email = req.query.email;

  const pipeline = [
    { $match: { email, type: "expense" } },
    {
      $group: {
        _id: "$category",
        totalSpent: { $sum: "$amount" }
      }
    }
  ];

  const result = await transactionsCollection.aggregate(pipeline).toArray();
  res.send(result);
});

app.get("/savings", async (req, res) => {
  const result = await savingsCollection.find({ email: req.query.email }).toArray();
  res.send(result);
});

    app.get('/transaction-balance', async (req, res) => {
      const email = req.query.email;
      if (!email) return res.status(400).send({ message: "Email required" });
      const result = await transactionsCollection.find({ email }).toArray();
      res.send(result);
    });

    console.log('Connected to MongoDB and routes are ready.');
  } finally {

  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`Smart server is running on port: ${port}`);
});
