CREATE TABLE separated_seed (
    id INTEGER PRIMARY KEY,
    label VARCHAR(40) NOT NULL
)
^^^ END OF SCRIPT ^^^
INSERT INTO separated_seed (id, label)
VALUES (1, '한글'), (2, 'restart')
^^^ END OF SCRIPT ^^^
