use cico_tracker; 

ALTER TABLE food_entries ADD COLUMN meal_id INT UNSIGNED NOT NULL; 
ALTER TABLE food_entries DROP COLUMN meal;