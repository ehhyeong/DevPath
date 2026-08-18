INSERT INTO roles (role_name, description)
SELECT seed.role_name, seed.description
FROM (
    VALUES
        ('ROLE_LEARNER', 'General learner'),
        ('ROLE_INSTRUCTOR', 'Can create and manage courses'),
        ('ROLE_ADMIN', 'System administrator')
) AS seed(role_name, description)
WHERE NOT EXISTS (
    SELECT 1
    FROM roles
    WHERE roles.role_name = seed.role_name
);
