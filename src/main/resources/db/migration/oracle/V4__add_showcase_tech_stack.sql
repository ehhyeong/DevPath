DECLARE
    table_count NUMBER;
    column_count NUMBER;
BEGIN
    SELECT COUNT(*) INTO table_count FROM user_tables WHERE table_name = 'SHOWCASE';
    SELECT COUNT(*) INTO column_count FROM user_tab_columns
    WHERE table_name = 'SHOWCASE' AND column_name = 'TECH_STACK';
    -- 빈 DB는 이후 Hibernate가 테이블을 만들므로 기존 테이블에만 컬럼을 추가한다.
    IF table_count > 0 AND column_count = 0 THEN
        EXECUTE IMMEDIATE 'ALTER TABLE showcase ADD (tech_stack VARCHAR2(500 CHAR))';
    END IF;
END;
/
