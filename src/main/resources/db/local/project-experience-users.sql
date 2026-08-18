SELECT email, name
FROM (
    VALUES
        (1, 'project.frontend@devpath.com', '이서준'),
        (2, 'project.backend@devpath.com', '정다은'),
        (3, 'project.pm@devpath.com', '최민지'),
        (4, 'project.ai@devpath.com', '오서연')
) AS seed(sort_order, email, name)
ORDER BY sort_order;
