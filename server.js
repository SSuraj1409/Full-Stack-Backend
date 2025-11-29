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
