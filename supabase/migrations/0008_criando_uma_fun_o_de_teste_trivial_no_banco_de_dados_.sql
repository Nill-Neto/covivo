CREATE OR REPLACE FUNCTION get_admin_test_value()
RETURNS integer AS $$
BEGIN
    RETURN 42;
END;
$$ LANGUAGE plpgsql;