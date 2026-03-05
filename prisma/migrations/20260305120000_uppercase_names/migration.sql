-- Convert all student names to uppercase
UPDATE students
SET 
  first_name = UPPER(first_name),
  last_name = UPPER(last_name),
  middle_initial = UPPER(middle_initial)
WHERE first_name IS NOT NULL OR last_name IS NOT NULL OR middle_initial IS NOT NULL;

-- Convert all user names to uppercase
UPDATE users
SET 
  first_name = UPPER(first_name),
  last_name = UPPER(last_name)
WHERE first_name IS NOT NULL OR last_name IS NOT NULL;
