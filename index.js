require('dotenv').config();
const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;
app.use(express.json());
// const serverless = require('serverless-http');
// console.log("✅ Express serverless function initialized");

// MongoDB URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.gdf4x.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// MongoDB Client
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Declare collections globally
let db;
let associatesCollection;
let productsCollection;
let invoicesCollection;
let invoiceItemsCollection;
let paymentsCollection;

// Connect and set collections
client.connect().then(() => {
  db = client.db("invoiceApp");
  associatesCollection = db.collection("associates");
  productsCollection = db.collection("products");
  invoicesCollection = db.collection("invoices");
  invoiceItemsCollection = db.collection("invoiceItems");
  paymentsCollection = db.collection("payments");

  console.log("✅ Connected to MongoDB and collections initialized.");
});

app.get('/', (req, res) => {
  res.send('Hello world 🌍');
});

app.get('/test', (req, res) => {
  res.send('testing 🌍');
});

// associate codes:
// Create associate (POST /associates)
app.post('/associates', async (req, res) => {
  try {
    // console.log("HEADERS:", req.headers);
    // console.log("BODY:", req.body);
    const { userEmail, data } = req.body;
    if (!userEmail || !data) return res.status(400).send("Missing userEmail or data");
    if (!data.id) return res.status(400).send("Missing id field in data");

    const associate = {
      ...data,
      userEmail,
      synced: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      deleted: 0,
    };

    const result = await associatesCollection.insertOne(associate);
    console.log("Inserted", associate);
    console.log("result", result)
    res.status(201).send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error creating associate");
  }
});

// Read all associates by user
app.get('/associates/:userEmail', async (req, res) => {
  try {
    const { userEmail } = req.params;
    const associates = await associatesCollection.find({ userEmail, deleted: 0 }).toArray();
    res.send(associates);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching associates");
  }
});

// Update associate by UUID 'id' field
app.put('/associates/:id', async (req, res) => {
  try {
    // console.log("HEADERS:", req.headers);
    // console.log("BODY:", req.body);
    const id = req.params.id; // this is UUID, not Mongo _id
    const { userEmail, data } = req.body;
    if (!userEmail || !data) return res.status(400).send("Missing userEmail or data");

    const updateData = {
      ...data,
      updatedAt: new Date(),
      synced: 0,
    };

    const result = await associatesCollection.updateOne(
      { id: id, userEmail },
      { $set: updateData }
    );
    console.log(result);
    if (result.modifiedCount === 0) return res.status(404).send("Associate not found or no permission");
    res.send({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error updating associate");
  }
});

// Soft delete associate by UUID 'id'
app.delete('/associates/:id', async (req, res) => {
  try {
    const id = req.params.id; // UUID here
    const { userEmail } = req.body;
    if (!userEmail) return res.status(400).send("Missing userEmail");

    const result = await associatesCollection.updateOne(
      { id: id, userEmail },
      { $set: { deleted: true, updatedAt: new Date(), synced: false } }
    );

    if (result.matchedCount === 0) return res.status(404).send("Associate not found or no permission");
    res.send({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error deleting associate");
  }
});



// ✅ Add Product (POST /products)
app.post('/products', async (req, res) => {
  try {
    const { userEmail, data } = req.body;
    if (!userEmail || !data) return res.status(400).send("Missing userEmail or data");
    if (!data.id) return res.status(400).send("Missing id field in data");

    const product = {
      ...data,
      userEmail,
      synced: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      deleted: 0
    };

    const result = await productsCollection.insertOne(product);
    console.log("Inserted product:", product);
    res.status(201).send(result);
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).send("Error creating product");
  }
});

// ✅ Update Product by UUID (PUT /products/:id)
app.put('/products/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { userEmail, data } = req.body;

    if (!userEmail || !data) return res.status(400).send("Missing userEmail or data");

    const updateData = {
      ...data,
      updatedAt: new Date(),
      synced: 0,
    };

    const result = await productsCollection.updateOne(
      { id: id, userEmail },
      { $set: updateData }
    );

    if (result.modifiedCount === 0) return res.status(404).send("Product not found or no permission");
    res.send({ success: true });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).send("Error updating product");
  }
});

// ✅ Get All Products for a User (GET /products/:userEmail)
app.get('/products/:userEmail', async (req, res) => {
  try {
    const { userEmail } = req.params;
    const products = await productsCollection.find({ userEmail, deleted: 0 }).toArray();
    res.send(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send("Error fetching products");
  }
});

// ✅ Soft Delete Product (DELETE /products/:id)
app.delete('/products/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { userEmail } = req.body;

    if (!userEmail) return res.status(400).send("Missing userEmail");

    const result = await productsCollection.updateOne(
      { id: id, userEmail },
      {
        $set: {
          deleted: 1,
          updatedAt: new Date(),
          synced: 0
        }
      }
    );

    if (result.matchedCount === 0) return res.status(404).send("Product not found or no permission");
    res.send({ success: true });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).send("Error deleting product");
  }
});


// payments
// ✅ 1. Add Payment (POST /payments)
app.post('/payments', async (req, res) => {
  try {
    const { userEmail, data } = req.body;
    if (!userEmail || !data) return res.status(400).send("Missing userEmail or data");
    if (!data.id) return res.status(400).send("Missing id field in data");

    const payment = {
      ...data,
      userEmail,
      synced: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      deleted: 0
    };

    const result = await paymentsCollection.insertOne(payment);
    res.status(201).send(result);
  } catch (error) {
    console.error("Error creating payment:", error);
    res.status(500).send("Error creating payment");
  }
});

// ✅ 2. Update Payment by ID (PUT /payments/:id)
app.put('/payments/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { userEmail, data } = req.body;

    if (!userEmail || !data) return res.status(400).send("Missing userEmail or data");

    const updateData = {
      ...data,
      updatedAt: new Date(),
      synced: 0
    };

    const result = await paymentsCollection.updateOne(
      { id: id, userEmail },
      { $set: updateData }
    );

    if (result.modifiedCount === 0) return res.status(404).send("Payment not found or no permission");
    res.send({ success: true });
  } catch (error) {
    console.error("Error updating payment:", error);
    res.status(500).send("Error updating payment");
  }
});

// ✅ 3. Get All Payments for a User (GET /payments/:userEmail)
Edit
app.get('/payments/:userEmail', async (req, res) => {
  try {
    const { userEmail } = req.params;
    const payments = await paymentsCollection.find({ userEmail, deleted: 0 }).toArray();
    res.send(payments);
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).send("Error fetching payments");
  }
});
// ✅ 4. Soft Delete Payment (DELETE /payments/:id)
app.delete('/payments/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { userEmail } = req.body;

    if (!userEmail) return res.status(400).send("Missing userEmail");

    const result = await paymentsCollection.updateOne(
      { id: id, userEmail },
      {
        $set: {
          deleted: 1,
          updatedAt: new Date(),
          synced: 0
        }
      }
    );

    if (result.matchedCount === 0) return res.status(404).send("Payment not found or no permission");
    res.send({ success: true });
  } catch (error) {
    console.error("Error deleting payment:", error);
    res.status(500).send("Error deleting payment");
  }
});

// syncing codes:
// sync associates :
app.post('/associates/sync', async (req, res) => {
  try {
    const { userEmail, associates } = req.body;

    if (!userEmail || !Array.isArray(associates)) {
      return res.status(400).send("Missing userEmail or invalid associates array");
    }

    const bulkOps = associates.map((item) => {
      const filter = { id: item.id, userEmail };

      const {
        createdAt,
        id,
        organizationName,
        email,
        address,
        contact,
        openingBalance,
        clientName,
        supplierName,
        shippingAddress,
        taxId,
        businessDetail,
        associateType,
        unpaidCount,
        totalCount,
        balance,
        deleted,
        updatedAt = new Date()
      } = item;

      return {
        updateOne: {
          filter,
          update: {
            $set: {
              id,
              organizationName,
              email,
              address,
              contact,
              openingBalance,
              clientName,
              supplierName,
              shippingAddress,
              taxId,
              businessDetail,
              associateType,
              unpaidCount,
              totalCount,
              balance,
              updatedAt: new Date(updatedAt),
              deleted,
              userEmail,
              synced: 0 // ✅ Always store with synced:0 in the DB
            },
            $setOnInsert: {
              createdAt: createdAt ? new Date(createdAt) : new Date()
            }
          },
          upsert: true
        }
      };
    });

    if (bulkOps.length > 0) {
      await associatesCollection.bulkWrite(bulkOps);
    }

    const freshData = await associatesCollection
      .find({ userEmail })
      .project({ userEmail: 0 })  // remove userEmail from result
      .toArray();

    res.send({ success: true, data: freshData });

  } catch (error) {
    console.error("❌ Sync error:", error);
    res.status(500).send("Error syncing associates");
  }
});

// sync products :
app.post('/products/sync', async (req, res) => {
  try {
    const { userEmail, products } = req.body;
    if (!userEmail || !Array.isArray(products)) {
      return res.status(400).send("Missing userEmail or invalid products array");
    }

    const bulkOps = products.map((item) => {
      const filter = { id: item.id, userEmail };

      const {
        createdAt,
        id,
        productName,
        productCode,
        unit,
        description,
        saleRate,
        buyRate,
        openingStock,
        openingStockRate,
        minAlertLevel,
        openingStockValue,
        enableInventory,
        warehouse,
        updatedAt = new Date(),
        deleted,
      } = item;

      return {
        updateOne: {
          filter,
          update: {
            $set: {
              id,
              productName,
              productCode,
              unit,
              description,
              saleRate,
              buyRate,
              openingStock,
              openingStockRate,
              minAlertLevel,
              openingStockValue,
              enableInventory,
              warehouse,
              updatedAt: new Date(updatedAt),
              synced: 0, // always 0 on server side
              deleted,
              userEmail
            },
            $setOnInsert: {
              createdAt: createdAt ? new Date(createdAt) : new Date()
            }
          },
          upsert: true
        }
      };
    });

    if (bulkOps.length > 0) {
      await productsCollection.bulkWrite(bulkOps);
    }

    const freshData = await productsCollection
      .find({ userEmail })
      .project({ userEmail: 0 }) // optional
      .toArray();

    res.send({ success: true, data: freshData });

  } catch (error) {
    console.error("❌ Product sync error:", error);
    res.status(500).send("Error syncing products");
  }
});

// ✅ 5. Sync Payments (POST /payments/sync)
app.post('/payments/sync', async (req, res) => {
  try {
    const { userEmail, payments } = req.body;
    if (!userEmail || !Array.isArray(payments)) {
      return res.status(400).send("Missing userEmail or invalid payments array");
    }

    const bulkOps = payments.map((item) => {
      const filter = { id: item.id, userEmail };
      const {
        id,
        invoiceId,
        amount,
        method,
        date,
        note,
        advance,
        createdAt,
        updatedAt = new Date(),
        deleted
      } = item;

      return {
        updateOne: {
          filter,
          update: {
            $set: {
              id,
              invoiceId,
              amount,
              method,
              date,
              note,
              advance,
              updatedAt: new Date(updatedAt),
              deleted,
              userEmail,
              synced: 0
            },
            $setOnInsert: {
              createdAt: createdAt ? new Date(createdAt) : new Date()
            }
          },
          upsert: true
        }
      };
    });

    if (bulkOps.length > 0) {
      await paymentsCollection.bulkWrite(bulkOps);
    }

    const freshData = await paymentsCollection
      .find({ userEmail })
      .project({ userEmail: 0 }) // Optional
      .toArray();

    res.send({ success: true, data: freshData });

  } catch (error) {
    console.error("❌ Payment sync error:", error);
    res.status(500).send("Error syncing payments");
  }
});




app.listen(port, () => {
  console.log("🚀 Server is running on port: " + port);
});

// module.exports.handler = serverless(app);
