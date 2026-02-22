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

app.get('/', async function (req, res) {

  const [tags] = await dbConnection.execute("SELECT * FROM tags");

  // query builder pattern
  const sql = `SELECT food_entries.id, dateTime, foodName, calories, meals.name AS 'meal', GROUP_CONCAT(tags.name) AS 'selectedTags', servingSize, unit 
                FROM food_entries 
                LEFT JOIN meals ON food_entries.meal_id = meals.id
                LEFT JOIN food_entries_tags
                     ON food_entries.id = food_entries_tags.food_entry_id
                LEFT JOIN tags
                     ON tags.id = food_entries_tags.tag_id
                WHERE 1 %extraWhere%
                GROUP BY food_entries.id, dateTime, foodName, calories, meal, servingSize, unit`;

  let extraWhere = "";
  const bindings = [];

  // check if the user is searching by food name
  if (req.query.foodName) {
    console.log("user is searching for foodname with", req.query.foodName);
    extraWhere += " AND foodName LIKE ?";
    bindings.push("%" + req.query.foodName + "%");
  }

  if (req.query.date) {
    // we need to find if the user is searching for on, after or before
    let operator = "=";
    if (req.query.date_operator == "after") {
      operator = ">"
    } else if (req.query.date_operator == "before") {
      operator = "<"
    }
    extraWhere += ` AND DATE(dateTime) ${operator} ?`;
    bindings.push(req.query.date)
  }

  if (req.query.tags) {
    
    const tags = Array.isArray(req.query.tags) ? req.query.tags : [ req.query.tags ];
    extraWhere += ` AND tags.id in (?)`;

    const tagIdToSearchFor = tags.map(tagId => parseInt(tagId));
    const tagCommaDelimitedString = tagIdToSearchFor.join(",")
    bindings.push(tagCommaDelimitedString)
  }

  // dbConnection.execute will return with an array of two elements:
  // index 0: row data (we want this)
  // index 1: meta data (we don't want)
  // we can use array destructuring to assign elements from an array
  // into a variable by the order of the variable in the array 
  // on the left hand size
  
  const finalSql = sql.replace("%extraWhere%", extraWhere);
  console.log(finalSql, bindings);
  const [rows] = await dbConnection.execute(finalSql,  bindings);


  res.render("index", {
    "foodEntries": rows,
    "tags": tags,
    "searchParams": req.query ? {...req.query,
      'tags': Array.isArray(req.query.tags) ? req.query.tags : [ req.query.tags ]
    } : {
      tags:[]
    }
  })
});

app.get("/food-entry/add", async function(req, res){
    const [meals] = await dbConnection.execute("SELECT * FROM meals"); 
    const [tags] = await dbConnection.execute("SELECT * FROM tags"); 
    res.render('create-food-entry', {
        // foodEntry: {
        //     dateTime: "",
        //     foodName: "",
        //     calories: "",
        //     meal: "",
        //     tags: [],
        //     servingSize: "",
        //     unit: ""
        // },
        'meals': meals,
        'tags': tags,
    });
});

app.post('/food-entry/add', async (req, res) => {
    const connection = await dbConnection.getConnection();

    try {
        await connection.beginTransaction();
        const { dateTime, foodName, calories, meal, servingSize, unit } = req.body;
        const query = "INSERT INTO food_entries (dateTime, foodName, calories, meal_id, servingSize, unit) VALUES (?, ?, ?, ?, ?, ?)";
        const values = [dateTime, foodName, calories, meal, servingSize, unit];
        const [result] = await connection.execute(query, values);
        const newFoodEntryID = result.insertId;

        const tags = req.body.tags || [];
        for (let t of tags) {
            const sql = `INSERT INTO food_entries_tags (food_entry_id, tag_id) VALUES (?, ?)`;
            await connection.execute(sql, [newFoodEntryID, t]);
        }

        await connection.commit();
        res.redirect('/');
    } catch (err) {
        await connection.rollback();
        console.error(err);
        next(err);
    } finally {
        connection.release();
    }
});

app.get("/food-entry/:id/edit", async (req, res) => {
    const [rows] = await dbConnection.query("SELECT * FROM food_entries WHERE id = ?", [req.params.id]);
    const foodEntry = rows[0];

    const [foodEntryTags] = await dbConnection.execute(`SELECT * FROM food_entries_tags WHERE food_entry_id = ?`, [req.params.id]); 

    const [meals] = await dbConnection.execute("SELECT * FROM meals");
    const [tags] = await dbConnection.execute("SELECT * FROM tags");

    res.render('edit-food-entry', { 
        foodEntry, 
        meals: meals, 
        tags: tags, 
        relatedTags: foodEntryTags.map(t => t.tag_id) 
    });
})

app.post("/food-entry/:id/edit", async (req, res, next) => {
    const connection = await dbConnection.getConnection(); 
    try { 
        await connection.beginTransaction(); 
        const foodEntryID = req.params.id; 

        const sql = `UPDATE food_entries SET dateTime=?, 
                        foodName=?, 
                        calories=?, 
                        meal_id=?, 
                        servingSize=?, 
                        unit=? 
                     WHERE id =?;` 

        const bindings = [ 
            req.body.dateTime, 
            req.body.foodName, 
            req.body.calories, 
            req.body.meal, 
            req.body.servingSize, 
            req.body.unit, 
            foodEntryID 
        ];

        // delete all existing tags from the food record 
        await connection.execute(`DELETE FROM food_entries_tags WHERE food_entry_id = ?`, [foodEntryID]); 

        // re-add all the relationships 
        const tags = req.body.tags || []; 
        for (let t of tags) { 
                const sql = `INSERT INTO food_entries_tags (food_entry_id, tag_id) VALUES (?, ?)`; 
            await connection.execute(sql, [foodEntryID, t]); 
        } 
 
        const results = await connection.execute(sql, bindings);
        await connection.commit(); 

        res.redirect("/");
        
    } catch (err) {
        await connection.rollback();
        console.error(err);
        next(err);  
    } finally {
        connection.release();
    }
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