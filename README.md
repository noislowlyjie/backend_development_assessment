# mysql-codespace-devcontainer

## Using codespace
To login into the database, use `mysql -u root -pmariadb -h 127.0.0.1`

to select the db
use cico_tracker;

to show all TABLE 
SHOW TABLES;

to show a specific TABLE's columns
SHOW COLUMNS FROM meals;

to show a specific TABLE's data
SELECT * FROM meals;
SELECT * FROM food_entries;

to create TABLE
CREATE

to update TABLE
ALTER

to delete TABLE
DROP

SELECT Statements
For user to search snacks that have 100 or less calories:
SELECT * FROM food_entries WHERE meal_id=4;
SELECT * FROM food_entries WHERE meal_id=4 AND calories<=100;

INSERT INTO statement
INSERT INTO meals (name) VALUE ("Supper");

UPDATE statement
UPDATE meals SET name="Dessert" WHERE id=5;

DELETE statement
DELETE FROM meals WHERE id=;