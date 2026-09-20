-- Seed data: departments, categories, subcategories
-- Categories & subcategories from section 33

INSERT INTO departments (id, name, code, description) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Roads Department', 'ROADS', 'Road and pavement maintenance'),
  ('00000000-0000-0000-0000-000000000002', 'Electrical Department', 'ELECTRICAL', 'Street lighting and electrical infrastructure'),
  ('00000000-0000-0000-0000-000000000003', 'Sanitation Department', 'SANITATION', 'Garbage collection and cleanliness'),
  ('00000000-0000-0000-0000-000000000004', 'Drainage Department', 'DRAINAGE', 'Storm water drains and sewer systems'),
  ('00000000-0000-0000-0000-000000000005', 'Water Department', 'WATER', 'Water supply and pipelines'),
  ('00000000-0000-0000-0000-000000000006', 'Parks Department', 'PARKS', 'Public parks and greenery'),
  ('00000000-0000-0000-0000-000000000007', 'Traffic Department', 'TRAFFIC', 'Traffic signals and signage'),
  ('00000000-0000-0000-0000-000000000008', 'Public Facilities Department', 'PUBLIC_FACILITIES', 'Public infrastructure'),
  ('00000000-0000-0000-0000-000000000009', 'General Complaints Department', 'GENERAL', 'Miscellaneous civic complaints')
ON CONFLICT (id) DO NOTHING;

INSERT INTO categories (id, code, name) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'ROAD_INFRASTRUCTURE', 'Road Infrastructure'),
  ('c0000000-0000-0000-0000-000000000002', 'STREET_LIGHTING', 'Street Lighting'),
  ('c0000000-0000-0000-0000-000000000003', 'SANITATION', 'Sanitation'),
  ('c0000000-0000-0000-0000-000000000004', 'DRAINAGE', 'Drainage'),
  ('c0000000-0000-0000-0000-000000000005', 'WATER_SUPPLY', 'Water Supply'),
  ('c0000000-0000-0000-0000-000000000006', 'PARKS', 'Parks'),
  ('c0000000-0000-0000-0000-000000000007', 'TRAFFIC', 'Traffic'),
  ('c0000000-0000-0000-0000-000000000008', 'PUBLIC_FACILITIES', 'Public Facilities'),
  ('c0000000-0000-0000-0000-000000000009', 'OTHER', 'Other')
ON CONFLICT (id) DO NOTHING;

INSERT INTO subcategories (category_id, code, name) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'POTHOLE', 'Pothole'),
  ('c0000000-0000-0000-0000-000000000001', 'ROAD_DAMAGE', 'Road Damage'),
  ('c0000000-0000-0000-0000-000000000001', 'FOOTPATH_DAMAGE', 'Footpath Damage'),
  ('c0000000-0000-0000-0000-000000000001', 'ROAD_MARKING_FADED', 'Faded Road Markings'),
  ('c0000000-0000-0000-0000-000000000002', 'STREET_LIGHT_OFF', 'Street Light Not Working'),
  ('c0000000-0000-0000-0000-000000000002', 'STREET_LIGHT_DAMAGED', 'Damaged Street Light'),
  ('c0000000-0000-0000-0000-000000000003', 'GARBAGE_NOT_COLLECTED', 'Garbage Not Collected'),
  ('c0000000-0000-0000-0000-000000000003', 'ILLEGAL_DUMPING', 'Illegal Dumping'),
  ('c0000000-0000-0000-0000-000000000003', 'PUBLIC_TOILET', 'Public Toilet Issue'),
  ('c0000000-0000-0000-0000-000000000004', 'DRAIN_BLOCKED', 'Blocked Drain'),
  ('c0000000-0000-0000-0000-000000000004', 'MANHOLE_OPEN', 'Open Manhole'),
  ('c0000000-0000-0000-0000-000000000004', 'SEWER_OVERFLOW', 'Sewer Overflow'),
  ('c0000000-0000-0000-0000-000000000005', 'NO_WATER_SUPPLY', 'No Water Supply'),
  ('c0000000-0000-0000-0000-000000000005', 'PIPE_LEAK', 'Pipeline Leak'),
  ('c0000000-0000-0000-0000-000000000005', 'CONTAMINATED_WATER', 'Contaminated Water'),
  ('c0000000-0000-0000-0000-000000000006', 'TREE_FALLEN', 'Fallen Tree'),
  ('c0000000-0000-0000-0000-000000000006', 'PARK_MAINTENANCE', 'Park Maintenance'),
  ('c0000000-0000-0000-0000-000000000007', 'TRAFFIC_SIGNAL_FAULT', 'Traffic Signal Fault'),
  ('c0000000-0000-0000-0000-000000000007', 'SIGNAGE_DAMAGED', 'Damaged Signage'),
  ('c0000000-0000-0000-0000-000000000008', 'PUBLIC_BUILDING_DAMAGE', 'Public Building Damage'),
  ('c0000000-0000-0000-0000-000000000008', 'BENCH_BROKEN', 'Broken Public Bench'),
  ('c0000000-0000-0000-0000-000000000009', 'OTHER', 'Other')
ON CONFLICT (category_id, code) DO NOTHING;
