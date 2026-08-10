SELECT email, name, role_name
FROM (
    VALUES
        (1, 'lounge.frontend@devpath.com', '이서준', 'ROLE_LEARNER'),
        (2, 'lounge.backend@devpath.com', '정다은', 'ROLE_LEARNER'),
        (3, 'lounge.pm@devpath.com', '최민지', 'ROLE_LEARNER'),
        (4, 'lounge.designer@devpath.com', '문지우', 'ROLE_LEARNER'),
        (5, 'lounge.data@devpath.com', '오세훈', 'ROLE_LEARNER'),
        (6, 'lounge.mobile@devpath.com', '한유진', 'ROLE_LEARNER'),
        (7, 'lounge.devops@devpath.com', '강태민', 'ROLE_LEARNER'),
        (8, 'lounge.mentor@devpath.com', '신예린', 'ROLE_INSTRUCTOR'),
        (9, 'lounge.ai@devpath.com', '윤서아', 'ROLE_LEARNER')
) AS seed(sort_order, email, name, role_name)
ORDER BY sort_order;
