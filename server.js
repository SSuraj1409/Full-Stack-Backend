const express = require('express');
const app = express();
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');

//Middleware: log every incoming request
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

//Allow JSON in request body
app.use(express.json());

//CORS (Cross-Origin Resource Sharing) headers - allows the frontend to make requests to the backend
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, X-Requested-With, Access-Control-Request-Method, Access-Control-Request-Headers");
    next();
});

//Serve images folder (http://localhost:3000/images/xxx.png)
app.use("/images", express.static(path.join(__dirname, "images"), { fallthrough: false }));

// if image not found
app.use((err, req, res, next) => {
    if (err) return res.status(404).send({ error: "Image not found" });
    next();
});

let db;

//Connect to MongoDB Atlas 
MongoClient.connect('mongodb+srv://ss4653:suraj2005@cluster0.dtdvz.mongodb.net')
    .then(client => {
        db = client.db('afterSchoolLessons');
        console.log("Connected to MongoDB");
    })
    .catch(err => console.error(err));

// Root route to confirm server is active
app.get('/', (req, res) => {
    res.send("After School Lessons API is running");
});

//GET all lessons-called by frontend to load list of lessons
app.get('/lessons', async (req, res) => {
    try {
        const lessons = await db.collection('lessons').find({}).toArray();
        res.json(lessons);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /orders- Saves an order & reduces available lesson spaces
app.post('/orders', async (req, res) => {
    try {
        const { name, phone, lessonIDs } = req.body;

        // Count how many of each lesson was ordered
        const quantityMap = {};
        lessonIDs.forEach(id => {
            quantityMap[id] = (quantityMap[id] || 0) + 1;
        }); 

        const items = [];
        let totalPrice = 0;

        // Loop through each lesson ID and update database
        for (const lessonId of Object.keys(quantityMap)) {
            const lesson = await db.collection('lessons').findOne({ _id: new ObjectId(lessonId) });

            if (!lesson) continue;  // Skip if lesson does not exist

            const qty = quantityMap[lessonId];
            const priceForQty = lesson.price * qty;

            // Add lesson info to order summary
            items.push({
                lessonId,
                name: lesson.subject,
                price: lesson.price,
                quantity: qty   
            });

            totalPrice += priceForQty;

            // Reduce lesson spaces in database
            await db.collection('lessons').updateOne(
                { _id: new ObjectId(lessonId) },
                { $inc: { spaces: -qty } }
            );
        }

         // Build order object
        const order = {
            customer: { name, phone },
            items,
            totalPrice,
            date: new Date()
        };

        // Save order in DB
        await db.collection('orders').insertOne(order);

        res.json({ message: "Order saved successfully", order });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update a lesson (PUT)
app.put('/lessons/:id', async (req, res) => {
    try {
        await db.collection('lessons').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: req.body }
        );
        res.json({ message: "Lesson updated" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//Search lessons matches subject, location, price, spaces, and id
app.get('/search', async (req, res) => {
    try {
        let q = req.query.query;

        // If search box empty → return empty array
        if (!q?.trim()) return res.json([]);

        q = q.trim();
        const regex = new RegExp(q, "i");
        const numQuery = Number(q);

        const results = await db.collection('lessons').find({
            $or: [
                { subject: { $regex: regex } },
                { location: { $regex: regex } },
                { price: isNaN(numQuery) ? -1 : numQuery },
                { spaces: isNaN(numQuery) ? -1 : numQuery },
                { id: isNaN(numQuery) ? -1 : numQuery }
            ]
        }).toArray();

        res.json(results);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//start server
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
        


        
