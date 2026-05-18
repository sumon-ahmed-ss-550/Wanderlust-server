const express = require("express");
const app = express();
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
const port = process.env.PORT;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
const uri = process.env.MONGODB_URI;

app.use(cors());
app.use(express.json());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const JWKS = createRemoteJWKSet(new URL("http://localhost:3000/api/auth/jwks"));

const verifyToken = async (req, res, next) => {
  const authToken = req?.headers?.authorization;
  if (!authToken) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authToken?.split(" ")[1];
  console.log(token);
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS);
    next();
  } catch (error) {
    return res.status(403).json({ message: "Forbidden" });
  }
};

const run = async () => {
  try {
    await client.connect();

    const db = client.db("wanderlust_data");
    const collection = db.collection("data");
    const collection2 = db.collection("productData");

    // get all data
    app.get("/destination", async (req, res) => {
      const cursor = collection.find();
      const allData = await cursor.toArray();
      res.send(allData);
    });

    // get one data
    app.get("/destination/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id),
      };
      const result = await collection.findOne(query);
      res.send(result);
    });

    // post one data
    app.post("/destination", verifyToken, async (req, res) => {
      const info = req.body;
      const query = await collection.insertOne(info);
      console.log(query);
      res.send(query);
    });

    // update date
    app.patch("/destination/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id),
      };
      const data = req.body;
      const newData = {
        $set: {
          destinationName: data.destinationName,
          country: data.country,
          category: data.category,
          price: data.price,
          duration: data.duration,
          departureDate: data.departureDate,
          imageUrl: data.imageUrl,
          description: data.description,
        },
      };

      const result = await collection.updateOne(query, newData);
      res.send(result);
    });

    // delete data
    app.delete("/destination/:id", async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id),
      };
      const result = await collection.deleteOne(query);
      res.send(result);
    });

    // get all data user and product
    app.get("/product", async (req, res) => {
      const cursor = collection2.find();
      const allValues = await cursor.toArray();
      res.send(allValues);
    });

    // get one data user and product
    app.get("/product/:userId", async (req, res) => {
      const userId = req.params.userId;
      const selectId = collection2.find({ userId });
      const result = await selectId.toArray();
      res.send(result);
    });

    // post data user and product
    app.post("/product", async (req, res) => {
      const productData = req.body;
      const result = await collection2.insertOne(productData);
      res.send(result);
    });

    // delete data user and product
    app.delete("/product/:userId", async (req, res) => {
      const { userId } = req.params;
      const result = await collection2.deleteOne({ _id: new ObjectId(userId) });
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // await client.close();
  }
};
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello, world");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
