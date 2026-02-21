const express = require("express");
const mysql2 = require("mysql2/promise");
const ejs = require("ejs");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const port = 3000;

app.set("view engine", "ejs");
app.set("views", "./views");
app.use(express.urlencoded({ extended: true }));

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
}

const dbConnection = mysql2.createPool(dbConfig);

app.get("/", async (req, res) => {
    const [rows] = await dbConnection.query("SELECT * FROM food_entries");
    res.render("index", { foodEntries: rows });
});

app.get("/food-entry/add", function(req,res){
    res.render('create-food-entry');
})

app.post('/food-entry/add', async (req, res) => {
    const { dateTime, foodName, calories, meal, tags, servingSize, unit } = req.body;
    const query = "INSERT INTO food_entries (dateTime, foodName, calories, meal, tags, servingSize, unit) VALUES (?, ?, ?, ?, ?, ?, ?)";
    const values = [dateTime, foodName, calories, meal, JSON.stringify(tags), servingSize, unit];
    await dbConnection.execute(query, values);
    res.redirect("/");
})

app.get("/food-entry/:id/edit", async (req, res) => {
    const [rows] = await dbConnection.query("SELECT * FROM food_entries WHERE id = ?", [req.params.id]);
    const foodEntry = rows[0];
    foodEntry.tags = JSON.parse(foodEntry.tags);
    res.render("edit-food-entry", { foodEntry });
})

app.post("/food-entry/:id/edit", async (req, res) => {
    const { dateTime, foodName, calories, meal, tags, servingSize, unit } = req.body;
    if (!tags) {
        tags = [];
    }
    const query = "UPDATE food_entries SET dateTime = ?, foodName = ?, calories = ?, meal = ?, tags = ?, servingSize = ?, unit = ? WHERE id = ?";
    const values = [dateTime, foodName, calories, meal, JSON.stringify(tags), servingSize, unit, req.params.id];
    await dbConnection.execute(query, values);
    res.redirect("/");
})

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});