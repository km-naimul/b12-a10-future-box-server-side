const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;


app.use(cors());
app.use(express.json())


const uri = "mongodb+srv://fineasedbUser:nOC5Qz8xIk0t0eoO@my-first-cluster1.c0ymrhl.mongodb.net/?appName=MY-First-Cluster1";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

app.get('/', (req, res) =>{
    res.send('Smart server is running')
})

async function run (){
    try{
        await client.connect();
        
        const db = client.db('smart_db')
        const transactionsCollection = db.collection('transactions');

        app.get('/transactions', async(req, res)=>{
            const cursor = transactionsCollection.find();
            const result = await cursor.toArray();
            res.send(result)
        });

        app.get('/transactions/:id',async ( req, res)=>{
            const id = req.params.id;
            const query = { _id: new ObjectId(id)}
            const result = await transactionsCollection.findOne(query);
            res.send(result);
        })

        app.post('/transactions',async (req, res) =>{
                const newTransaction = req.body;
                const result = await transactionsCollection.insertOne(newTransaction);
                res.send(result);
        })
        
        app.patch('/transactions/:id', async(req, res)=>{
            const id = req.params.id;
            const updatedTransaction = req.body;
            const query = { _id: new ObjectId(id)}
            const update = {
                $set: {
                    name: updatedTransaction.name,
                    price: updatedTransaction.price
                }
            }
            const result = await transactionsCollection.updateOne(query, update)
            res.send(result)
        })

        app.delete('/transactions/:id',async(req, res)=>{
            const id = req.params.id;
            const query = { _id: new ObjectId(id)}
            const result = await transactionsCollection.deleteOne(query);
            res.send(result);
        })

        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    }
    finally{

    }
}

run().catch(console.dir)

app.listen(port, ()=>{
    console.log(`Smart server is running on port: ${port}`)
})