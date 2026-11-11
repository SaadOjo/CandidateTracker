-- The previous enum rename did not update visibility strings stored in JSON.
UPDATE candidate_notes
SET fields = (
  SELECT jsonb_agg(
    CASE WHEN field->>'visibility' = 'hr_only'
      THEN jsonb_set(field, '{visibility}', '"human_resource_only"'::jsonb)
      ELSE field
    END ORDER BY ordinal
  )
  FROM jsonb_array_elements(fields) WITH ORDINALITY AS entries(field, ordinal)
)
WHERE jsonb_typeof(fields) = 'array'
  AND fields @> '[{"visibility":"hr_only"}]'::jsonb;
