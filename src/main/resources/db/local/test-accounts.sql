SELECT email, name, role_name
FROM (
    VALUES
        (1, 'learner@devpath.com', '이학습', 'ROLE_LEARNER'),
        (2, 'instructor@devpath.com', '홍지훈', 'ROLE_INSTRUCTOR'),
        (3, 'admin@devpath.com', '박서연', 'ROLE_ADMIN')
) AS seed(sort_order, email, name, role_name)
ORDER BY sort_order;
