SELECT email
FROM (
    VALUES
        ('restricted-user@devpath.com'),
        ('deactivated-user@devpath.com'),
        ('withdrawn-user@devpath.com'),
        ('learner2@devpath.com'),
        ('learner3@devpath.com'),
        ('learner4@devpath.com'),
        ('frontend@devpath.com'),
        ('data@devpath.com'),
        ('week9.b.mentor@devpath.com'),
        ('week9.b.mentee@devpath.com'),
        ('b-learner-one@devpath.com'),
        ('b-learner-two@devpath.com'),
        ('b-mentor@devpath.com')
) AS seed(email);
