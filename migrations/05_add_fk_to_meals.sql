USE cico_tracker;

UPDATE food_entries SET meal_id = (SELECT id FROM meals WHERE name="N/A");

ALTER TABLE food_entries ADD CONSTRAINT fk_food_entries_meals
    FOREIGN KEY (meal_id) REFERENCES meals(id);