-- ============================================================
--  MediFind Rwanda — Seed Data
--  Rwanda Essential Medicines List (sample) + test facilities
-- ============================================================

-- ── DRUGS (Rwanda Essential Medicines List) ──────────────────
INSERT INTO drugs (name_en, name_kin, category, unit, description) VALUES
  ('Amoxicillin 500mg',               'Amoxisiline 500mg',      'Antibiotics',     'caps',     'Broad-spectrum antibiotic'),
  ('Amoxicillin 250mg',               'Amoxisiline 250mg',      'Antibiotics',     'caps',     'Broad-spectrum antibiotic (paediatric)'),
  ('Cotrimoxazole 480mg',             NULL,                     'Antibiotics',     'tabs',     'Sulfonamide antibiotic combination'),
  ('Ciprofloxacin 500mg',             NULL,                     'Antibiotics',     'tabs',     'Fluoroquinolone antibiotic'),
  ('Doxycycline 100mg',               NULL,                     'Antibiotics',     'caps',     'Tetracycline antibiotic'),
  ('Metronidazole 400mg',             NULL,                     'Antibiotics',     'tabs',     'Nitroimidazole antibiotic'),
  ('Paracetamol 500mg',               'Paracetamol 500mg',      'Analgesics',      'tabs',     'Painkiller and fever reducer'),
  ('Ibuprofen 400mg',                 NULL,                     'Analgesics',      'tabs',     'NSAID anti-inflammatory'),
  ('Diclofenac 50mg',                 NULL,                     'Analgesics',      'tabs',     'NSAID for pain and inflammation'),
  ('Artemether/Lumefantrine 20/120mg','Imiti ya Malaria (AL)',  'Antimalarials',   'tabs',     'First-line malaria treatment'),
  ('Artesunate 200mg',                NULL,                     'Antimalarials',   'tabs',     'Severe malaria treatment'),
  ('Amlodipine 5mg',                  NULL,                     'Cardiovascular',  'tabs',     'Calcium channel blocker for hypertension'),
  ('Amlodipine 10mg',                 NULL,                     'Cardiovascular',  'tabs',     'Calcium channel blocker for hypertension'),
  ('Enalapril 10mg',                  NULL,                     'Cardiovascular',  'tabs',     'ACE inhibitor for hypertension'),
  ('Hydrochlorothiazide 25mg',        NULL,                     'Cardiovascular',  'tabs',     'Thiazide diuretic for hypertension'),
  ('Metformin 500mg',                 'Metformine 500mg',       'Diabetes',        'tabs',     'First-line type 2 diabetes treatment'),
  ('Metformin 850mg',                 'Metformine 850mg',       'Diabetes',        'tabs',     'Type 2 diabetes treatment'),
  ('Glibenclamide 5mg',               NULL,                     'Diabetes',        'tabs',     'Sulfonylurea for type 2 diabetes'),
  ('Salbutamol Inhaler 100mcg',       NULL,                     'Respiratory',     'inhalers', 'Bronchodilator for asthma'),
  ('Prednisolone 5mg',                NULL,                     'Respiratory',     'tabs',     'Corticosteroid for asthma and inflammation'),
  ('Omeprazole 20mg',                 NULL,                     'GI',              'caps',     'Proton pump inhibitor for ulcers'),
  ('Oral Rehydration Salts',          'Imiti yo Gucuruza',     'GI',              'sachets',  'Rehydration therapy for diarrhoea'),
  ('Zinc Sulphate 20mg',              NULL,                     'GI',              'tabs',     'Zinc supplementation for diarrhoea'),
  ('Ferrous Sulphate 200mg',          NULL,                     'Haematology',     'tabs',     'Iron supplement for anaemia'),
  ('Folic Acid 5mg',                  NULL,                     'Haematology',     'tabs',     'B-vitamin for anaemia and pregnancy'),
  ('Diazepam 5mg',                    NULL,                     'Neurology',       'tabs',     'Benzodiazepine for anxiety and seizures'),
  ('Phenobarbital 30mg',              NULL,                     'Neurology',       'tabs',     'Anticonvulsant for epilepsy'),
  ('Fluconazole 150mg',               NULL,                     'Antifungals',     'caps',     'Antifungal for candidiasis'),
  ('Multivitamin Tablets',            'Vitamini',               'Supplements',     'tabs',     'General vitamin and mineral supplement'),
  ('Hydrocortisone Cream 1%',         NULL,                     'Dermatology',     'tubes',    'Topical corticosteroid for skin conditions')
ON CONFLICT DO NOTHING;

-- ── TEST ADMIN USER ──────────────────────────────────────────
-- Password: Admin@1234 (bcrypt hash — change before production)
INSERT INTO users (phone, email, password_hash, full_name, role) VALUES
  ('+250788000001', 'admin@medifind.rw',
   '$2a$10$socYlhcaXlsELRI2ucqFDue28abpPXRL5goVbtIjd64CqB4QqcagK',
   'Dr. K. Niyonsaba', 'admin')
ON CONFLICT DO NOTHING;

-- ── TEST FACILITIES (Kigali) ─────────────────────────────────
INSERT INTO facilities (name, type, license_number, district, address, phone, operating_hours, location, status) VALUES
  ('Remera Health Center',         'Health Center', 'RWF-2020-0041', 'Gasabo',
   'KG 9 Ave, Remera, Kigali', '+250788123456', 'Mon–Fri 7:30–17:00 | Sat 8:00–14:00',
   ST_GeogFromText('SRID=4326;POINT(30.1062 -1.9441)'), 'active'),

  ('Afia Pharma – Kacyiru',       'Pharmacy',      'RWF-2021-0188', 'Gasabo',
   'KG 7 Ave, Kacyiru, Kigali', '+250722987654', 'Mon–Sun 7:00–22:00',
   ST_GeogFromText('SRID=4326;POINT(30.0934 -1.9512)'), 'active'),

  ('King Faisal Hospital Pharmacy','Hospital',      'RWF-2015-0009', 'Nyarugenge',
   'KN 37 St, Kiyovu, Kigali',  '+250252588888', '24 hours',
   ST_GeogFromText('SRID=4326;POINT(30.0648 -1.9482)'), 'active'),

  ('Nyamirambo Community Pharmacy','Pharmacy',      'RWF-2022-0312', 'Nyarugenge',
   'KN 2 Ave, Nyamirambo, Kigali', '+250788555321', 'Mon–Sat 8:00–20:00',
   ST_GeogFromText('SRID=4326;POINT(30.0474 -1.9824)'), 'active'),

  ('Kibagabaga Hospital Pharmacy', 'Hospital',      'RWF-2018-0055', 'Gasabo',
   'KG 33 Ave, Kibagabaga, Kigali', '+250252580800', 'Mon–Fri 7:00–18:00',
   ST_GeogFromText('SRID=4326;POINT(30.1221 -1.9272)'), 'active')
ON CONFLICT DO NOTHING;

-- ── TEST INVENTORY (stock at each facility) ──────────────────
INSERT INTO inventory (facility_id, drug_id, quantity, low_threshold)
SELECT f.id, d.id, v.quantity, 10
FROM (VALUES
  ('Remera Health Center',          'Amoxicillin 500mg',                60),
  ('Remera Health Center',          'Paracetamol 500mg',                150),
  ('Remera Health Center',          'Artemether/Lumefantrine 20/120mg', 5),
  ('Remera Health Center',          'Metformin 500mg',                  0),
  ('Afia Pharma – Kacyiru',         'Amoxicillin 500mg',                80),
  ('Afia Pharma – Kacyiru',         'Ibuprofen 400mg',                  120),
  ('Afia Pharma – Kacyiru',         'Paracetamol 500mg',                200),
  ('Afia Pharma – Kacyiru',         'Omeprazole 20mg',                  40),
  ('King Faisal Hospital Pharmacy', 'Ciprofloxacin 500mg',              90),
  ('King Faisal Hospital Pharmacy', 'Amlodipine 5mg',                   70),
  ('King Faisal Hospital Pharmacy', 'Metformin 500mg',                  100),
  ('King Faisal Hospital Pharmacy', 'Paracetamol 500mg',                6),
  ('Nyamirambo Community Pharmacy', 'Paracetamol 500mg',                180),
  ('Nyamirambo Community Pharmacy', 'Amoxicillin 250mg',                50),
  ('Nyamirambo Community Pharmacy', 'Oral Rehydration Salts',           300),
  ('Kibagabaga Hospital Pharmacy',  'Artesunate 200mg',                 25),
  ('Kibagabaga Hospital Pharmacy',  'Folic Acid 5mg',                   90),
  ('Kibagabaga Hospital Pharmacy',  'Metformin 500mg',                  15)
) AS v(facility_name, drug_name, quantity)
JOIN facilities f ON f.name = v.facility_name
JOIN drugs      d ON d.name_en = v.drug_name
ON CONFLICT (facility_id, drug_id) DO UPDATE SET quantity = EXCLUDED.quantity;
