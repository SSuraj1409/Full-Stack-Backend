const express = require('express');
const app = express();
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

app.use(express.json());

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, X-Requested-With, Access-Control-Request-Method, Access-Control-Request-Headers");
    next();
});

app.use("/images", express.static(path.join(__dirname, "images"), { fallthrough: false }));
app.use((err, req, res, next) => {
    if (err) return res.status(404).send({ error: "Image not found" });
    next();
});

let db;

MongoClient.connect('mongodb+srv://ss4653:suraj2005@cluster0.dtdvz.mongodb.net')
    .then(client => {
        db = client.db('afterSchoolLessons');
        console.log("Connected to MongoDB");
    })
    .catch(err => console.error(err));


app.get('/', (req, res) => {
    res.send("After School Lessons API is running");
});


app.get('/lessons', async (req, res) => {
    try {
        const lessons = await db.collection('lessons').find({}).toArray();
        res.json(lessons);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/orders', async (req, res) => {
    try {
        const { name, phone, lessonIDs } = req.body;

        const quantityMap = {};
        lessonIDs.forEach(id => {
            quantityMap[id] = (quantityMap[id] || 0) + 1;
        }); 

        const items = [];
        let totalPrice = 0;

        for (const lessonId of Object.keys(quantityMap)) {
            const lesson = await db.collection('lessons').findOne({ _id: new ObjectId(lessonId) });

            if (!lesson) continue;

            const qty = quantityMap[lessonId];
            const priceForQty = lesson.price * qty;

            items.push({
                lessonId,
                name: lesson.subject,
                price: lesson.price,
                quantity: qty   
            });

            totalPrice += priceForQty;

            await db.collection('lessons').updateOne(
                { _id: new ObjectId(lessonId) },
                { $inc: { spaces: -qty } }
            );
        }

        const order = {
            customer: { name, phone },
            items,
            totalPrice,
            date: new Date()
        };

        await db.collection('orders').insertOne(order);

        res.json({ message: "Order saved successfully", order });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


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
        


        
