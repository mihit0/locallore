-- Function to increment event view count
CREATE OR REPLACE FUNCTION increment_view_count(event_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE events
  SET view_count = view_count + 1
  WHERE id = event_id;
END;
$$ LANGUAGE plpgsql; 