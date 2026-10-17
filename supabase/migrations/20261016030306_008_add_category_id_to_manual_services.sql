/*
# Add category_id to manual_services for proper category linkage
*/
ALTER TABLE manual_services ADD COLUMN IF NOT EXISTS category_id bigint REFERENCES categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_manual_services_category ON manual_services(category_id);

-- Backfill: try to link existing manual_services to categories by name match
UPDATE manual_services ms
SET category_id = c.id
FROM categories c
WHERE ms.category_id IS NULL
  AND LOWER(TRIM(ms.service_name)) = LOWER(TRIM(c.display_name));
