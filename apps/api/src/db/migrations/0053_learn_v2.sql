-- 0053_learn_v2.sql
-- "Shaxmat donalari" bosqichlariga haqiqiy qiyinlik progressiyasi
-- (minSpread/cluttered) + "Asosiy prinsiplar" mavzulariga qo'shimcha
-- bosqichlar (10 tagacha, chess.js orqali tasdiqlangan yangi pozitsiyalar).

-- 1. Shaxmat donalari — qiyinlik maydonlari
UPDATE learn_levels SET config = config || '{"minSpread":1,"cluttered":false}'::jsonb
WHERE level_number = 1 AND topic_id IN (SELECT id FROM learn_topics WHERE category = 'piece');
UPDATE learn_levels SET config = config || '{"minSpread":2,"cluttered":false}'::jsonb
WHERE level_number = 2 AND topic_id IN (SELECT id FROM learn_topics WHERE category = 'piece');
UPDATE learn_levels SET config = config || '{"minSpread":2,"cluttered":false}'::jsonb
WHERE level_number = 3 AND topic_id IN (SELECT id FROM learn_topics WHERE category = 'piece');
UPDATE learn_levels SET config = config || '{"minSpread":3,"cluttered":false}'::jsonb
WHERE level_number = 4 AND topic_id IN (SELECT id FROM learn_topics WHERE category = 'piece');
UPDATE learn_levels SET config = config || '{"minSpread":3,"cluttered":false}'::jsonb
WHERE level_number = 5 AND topic_id IN (SELECT id FROM learn_topics WHERE category = 'piece');
UPDATE learn_levels SET config = config || '{"minSpread":4,"cluttered":true}'::jsonb
WHERE level_number = 6 AND topic_id IN (SELECT id FROM learn_topics WHERE category = 'piece');
UPDATE learn_levels SET config = config || '{"minSpread":4,"cluttered":true}'::jsonb
WHERE level_number = 7 AND topic_id IN (SELECT id FROM learn_topics WHERE category = 'piece');
UPDATE learn_levels SET config = config || '{"minSpread":5,"cluttered":true}'::jsonb
WHERE level_number = 8 AND topic_id IN (SELECT id FROM learn_topics WHERE category = 'piece');
UPDATE learn_levels SET config = config || '{"minSpread":5,"cluttered":true}'::jsonb
WHERE level_number = 9 AND topic_id IN (SELECT id FROM learn_topics WHERE category = 'piece');
UPDATE learn_levels SET config = config || '{"minSpread":5,"cluttered":true}'::jsonb
WHERE level_number = 10 AND topic_id IN (SELECT id FROM learn_topics WHERE category = 'piece');

-- 2. Asosiy prinsiplar — qo'shimcha bosqichlar (10 tagacha)

-- urib_olish
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('6e7743fb-296a-4e10-b2c2-99f6811c7086', 6, '{"mode":"fixed","pieceType":"r","from":"c6","to":"g6","enemies":[{"square":"g6","piece":"p"},{"square":"e3","piece":"p"},{"square":"f8","piece":"p"}],"instruction":"To''g''ri yurish bilan uring!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('6e7743fb-296a-4e10-b2c2-99f6811c7086', 7, '{"mode":"fixed","pieceType":"b","from":"a8","to":"d5","enemies":[{"square":"d5","piece":"n"},{"square":"f2","piece":"p"},{"square":"f7","piece":"p"}],"instruction":"Dushman donasini urib oling!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('6e7743fb-296a-4e10-b2c2-99f6811c7086', 8, '{"mode":"fixed","pieceType":"n","from":"a7","to":"c6","enemies":[{"square":"c6","piece":"b"},{"square":"d3","piece":"p"},{"square":"g4","piece":"p"}],"instruction":"Raqib donasini yeb qo''ying!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('6e7743fb-296a-4e10-b2c2-99f6811c7086', 9, '{"mode":"fixed","pieceType":"q","from":"a5","to":"e1","enemies":[{"square":"e1","piece":"r"},{"square":"h8","piece":"p"},{"square":"g3","piece":"p"}],"instruction":"To''g''ri yurish bilan uring!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('6e7743fb-296a-4e10-b2c2-99f6811c7086', 10, '{"mode":"fixed","pieceType":"k","from":"b4","to":"b5","enemies":[{"square":"b5","piece":"p"},{"square":"d2","piece":"p"},{"square":"d7","piece":"p"}],"instruction":"Dushman donasini urib oling!","specialMove":null}'::jsonb);

-- himoya
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('dd518cd6-6e60-4988-9cba-38bd84f5ab26', 5, '{"mode":"fixed","pieceType":"r","from":"d8","to":"d4","enemies":[{"square":"h4","piece":"r"},{"square":"g4","piece":"p"}],"instruction":"Muhim katakni nazorat qiling!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('dd518cd6-6e60-4988-9cba-38bd84f5ab26', 6, '{"mode":"fixed","pieceType":"b","from":"b7","to":"e4","enemies":[{"square":"h1","piece":"b"},{"square":"g3","piece":"p"},{"square":"g6","piece":"p"}],"instruction":"To''g''ri himoya yurishini toping!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('dd518cd6-6e60-4988-9cba-38bd84f5ab26', 7, '{"mode":"fixed","pieceType":"n","from":"a2","to":"c3","enemies":[{"square":"d5","piece":"r"},{"square":"e1","piece":"r"}],"instruction":"Donangizni himoya uchun joylashtiring!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('dd518cd6-6e60-4988-9cba-38bd84f5ab26', 8, '{"mode":"fixed","pieceType":"k","from":"a4","to":"a5","enemies":[{"square":"h4","piece":"r"},{"square":"h3","piece":"r"}],"instruction":"Muhim katakni nazorat qiling!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('dd518cd6-6e60-4988-9cba-38bd84f5ab26', 9, '{"mode":"fixed","pieceType":"r","from":"h5","to":"d5","enemies":[{"square":"d1","piece":"r"},{"square":"d2","piece":"p"}],"instruction":"To''g''ri himoya yurishini toping!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('dd518cd6-6e60-4988-9cba-38bd84f5ab26', 10, '{"mode":"fixed","pieceType":"b","from":"g7","to":"d4","enemies":[{"square":"a1","piece":"b"},{"square":"c2","piece":"p"},{"square":"f2","piece":"p"}],"instruction":"Donangizni himoya uchun joylashtiring!","specialMove":null}'::jsonb);

-- jang
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('d0745baa-3df1-43c8-8b86-f8687c1f6aa4', 5, '{"mode":"fixed","pieceType":"n","from":"a7","to":"c6","enemies":[{"square":"c6","piece":"p"},{"square":"d4","piece":"p"},{"square":"e2","piece":"p"}],"instruction":"Kuchli yurish bilan zarba bering!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('d0745baa-3df1-43c8-8b86-f8687c1f6aa4', 6, '{"mode":"fixed","pieceType":"r","from":"f8","to":"f3","enemies":[{"square":"f3","piece":"p"},{"square":"d6","piece":"n"},{"square":"c1","piece":"r"}],"instruction":"Jangni boshlang!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('d0745baa-3df1-43c8-8b86-f8687c1f6aa4', 7, '{"mode":"fixed","pieceType":"b","from":"a3","to":"d6","enemies":[{"square":"d6","piece":"n"},{"square":"f8","piece":"p"},{"square":"g2","piece":"p"}],"instruction":"Hujum qiling!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('d0745baa-3df1-43c8-8b86-f8687c1f6aa4', 8, '{"mode":"fixed","pieceType":"n","from":"g8","to":"f6","enemies":[{"square":"f6","piece":"p"},{"square":"d5","piece":"p"},{"square":"b4","piece":"p"}],"instruction":"Kuchli yurish bilan zarba bering!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('d0745baa-3df1-43c8-8b86-f8687c1f6aa4', 9, '{"mode":"fixed","pieceType":"r","from":"h3","to":"c3","enemies":[{"square":"c3","piece":"p"},{"square":"f5","piece":"n"},{"square":"a6","piece":"r"}],"instruction":"Jangni boshlang!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('d0745baa-3df1-43c8-8b86-f8687c1f6aa4', 10, '{"mode":"fixed","pieceType":"b","from":"c8","to":"f5","enemies":[{"square":"f5","piece":"n"},{"square":"h3","piece":"p"},{"square":"b2","piece":"p"}],"instruction":"Hujum qiling!","specialMove":null}'::jsonb);

-- shoh_berish
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('c57c1f06-bfa7-42c1-a058-8595e43a9dd7', 5, '{"mode":"fixed","pieceType":"r","from":"a4","to":"f4","enemies":[{"square":"h4","piece":"k"},{"square":"g5","piece":"p"},{"square":"g3","piece":"p"}],"instruction":"Shohni xavf ostiga qo''ying!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('c57c1f06-bfa7-42c1-a058-8595e43a9dd7', 6, '{"mode":"fixed","pieceType":"b","from":"d8","to":"f6","enemies":[{"square":"h4","piece":"k"},{"square":"g2","piece":"p"},{"square":"g8","piece":"p"}],"instruction":"Shoh beruvchi yurishni toping!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('c57c1f06-bfa7-42c1-a058-8595e43a9dd7', 7, '{"mode":"fixed","pieceType":"n","from":"e1","to":"f3","enemies":[{"square":"h4","piece":"k"},{"square":"g6","piece":"p"},{"square":"g2","piece":"p"}],"instruction":"Qora shohga shoh bering!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('c57c1f06-bfa7-42c1-a058-8595e43a9dd7', 8, '{"mode":"fixed","pieceType":"q","from":"e8","to":"h8","enemies":[{"square":"h4","piece":"k"},{"square":"g7","piece":"p"},{"square":"g5","piece":"p"}],"instruction":"Shohni xavf ostiga qo''ying!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('c57c1f06-bfa7-42c1-a058-8595e43a9dd7', 9, '{"mode":"fixed","pieceType":"r","from":"d8","to":"d3","enemies":[{"square":"d1","piece":"k"},{"square":"e2","piece":"p"},{"square":"c2","piece":"p"}],"instruction":"Shoh beruvchi yurishni toping!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('c57c1f06-bfa7-42c1-a058-8595e43a9dd7', 10, '{"mode":"fixed","pieceType":"q","from":"h4","to":"h1","enemies":[{"square":"d1","piece":"k"},{"square":"g2","piece":"p"},{"square":"e2","piece":"p"}],"instruction":"Qora shohga shoh bering!","specialMove":null}'::jsonb);

-- shohdan_qutulish
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('19aa6b7d-2633-4e6e-b098-9d072654edcc', 5, '{"mode":"fixed","pieceType":"k","from":"a4","to":"a5","enemies":[{"square":"h4","piece":"r"},{"square":"f4","piece":"r"}],"instruction":"Shohmotdan qoching!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('19aa6b7d-2633-4e6e-b098-9d072654edcc', 6, '{"mode":"fixed","pieceType":"k","from":"a1","to":"b2","enemies":[{"square":"h1","piece":"r"},{"square":"h3","piece":"r"}],"instruction":"Shoh uchun xavfsiz yo''l toping!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('19aa6b7d-2633-4e6e-b098-9d072654edcc', 7, '{"mode":"fixed","pieceType":"k","from":"c4","to":"c5","enemies":[{"square":"f1","piece":"b"},{"square":"f7","piece":"b"}],"instruction":"Shohni xavfsiz katakka olib boring!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('19aa6b7d-2633-4e6e-b098-9d072654edcc', 8, '{"mode":"fixed","pieceType":"k","from":"d3","to":"e2","enemies":[{"square":"d8","piece":"r"},{"square":"h3","piece":"r"}],"instruction":"Shohmotdan qoching!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('19aa6b7d-2633-4e6e-b098-9d072654edcc', 9, '{"mode":"fixed","pieceType":"k","from":"d8","to":"e8","enemies":[{"square":"d1","piece":"r"},{"square":"d3","piece":"r"}],"instruction":"Shoh uchun xavfsiz yo''l toping!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('19aa6b7d-2633-4e6e-b098-9d072654edcc', 10, '{"mode":"fixed","pieceType":"k","from":"a8","to":"b7","enemies":[{"square":"a1","piece":"r"},{"square":"c1","piece":"r"}],"instruction":"Shohni xavfsiz katakka olib boring!","specialMove":null}'::jsonb);

-- mot_berish
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('8c174428-aa11-492b-bf17-9d09aa47f3a4', 5, '{"mode":"fixed","pieceType":"r","from":"a1","to":"a8","enemies":[{"square":"h8","piece":"k"},{"square":"g7","piece":"p"},{"square":"h7","piece":"p"}],"instruction":"G''alaba qiluvchi yurishni toping!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('8c174428-aa11-492b-bf17-9d09aa47f3a4', 6, '{"mode":"fixed","pieceType":"q","from":"a1","to":"a8","enemies":[{"square":"h8","piece":"k"},{"square":"g7","piece":"p"},{"square":"h7","piece":"p"}],"instruction":"Shohni matga qo''ying!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('8c174428-aa11-492b-bf17-9d09aa47f3a4', 7, '{"mode":"fixed","pieceType":"r","from":"h1","to":"h8","enemies":[{"square":"a8","piece":"k"},{"square":"a7","piece":"p"},{"square":"b7","piece":"p"}],"instruction":"Mat bering!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('8c174428-aa11-492b-bf17-9d09aa47f3a4', 8, '{"mode":"fixed","pieceType":"q","from":"h1","to":"h8","enemies":[{"square":"a8","piece":"k"},{"square":"a7","piece":"p"},{"square":"b7","piece":"p"}],"instruction":"G''alaba qiluvchi yurishni toping!","specialMove":null}'::jsonb);
