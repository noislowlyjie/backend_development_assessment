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

app.get('/', async function(req, res){
    const sql = `SELECT * FROM food_entries JOIN meals ON
        food_entries.meal_id = meals.id
    `;

    const results = await dbConnection.execute({
        sql: sql,
        nestTables: true
    });

    const rows = results[0];
 
    res.render('index', {
        foodEntries: rows
    })
});

// app.get("/food-entry/add", function(req,res){
//     res.render('create-food-entry');
// })

app.get("/food-entry/add", async function(req, res){
    const [meals] = await dbConnection.execute("SELECT * FROM meals"); 
    res.render('create-food-entry', {
        foodEntry: {
            dateTime: "",
            foodName: "",
            calories: "",
            meal: "",
            tags: [],
            servingSize: "",
            unit: ""
        },
        'meals': meals
    });
});

app.post('/food-entry/add', async (req, res) => {
    const { dateTime, foodName, calories, meal, tags, servingSize, unit } = req.body;
    const query = "INSERT INTO food_entries (dateTime, foodName, calories, meal_id, tags, servingSize, unit) VALUES (?, ?, ?, ?, ?, ?, ?)";
    const values = [dateTime, foodName, calories, meal, JSON.stringify(tags), servingSize, unit];
    // await dbConnection.execute(query, values);
    const results = await dbConnection.execute(query, values);

    res.redirect("/");
})

app.get("/food-entry/:id/edit", async (req, res) => {
    const [rows] = await dbConnection.query("SELECT * FROM food_entries WHERE id = ?", [req.params.id]);
    const foodEntry = rows[0];
    foodEntry.tags = JSON.parse(foodEntry.tags);
    const [meals] = await dbConnection.execute("SELECT * FROM meals");
    res.render("edit-food-entry", { foodEntry, meals });
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

app.get("/food-entry/:id/delete", async (req, res) => {
    const [rows] = await dbConnection.query("SELECT * FROM food_entries WHERE id = ?", [req.params.id]);
    res.render("delete-food-entry", { foodEntry: rows[0] });
})

app.post("/food-entry/:id/delete", async (req, res) => {
    await dbConnection.execute("DELETE FROM food_entries WHERE id = ?", [req.params.id]);
    res.redirect("/");
})


app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});