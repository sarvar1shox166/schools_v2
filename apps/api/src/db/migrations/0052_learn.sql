-- 0052_learn.sql
-- "O'rganish" (Learn) bo'limi: bazaga asoslangan mavzular, bosqichlar, progress.

CREATE TABLE learn_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('piece','principle','intermediate','advanced')),
  piece_type TEXT CHECK (piece_type IN ('p','n','b','r','q','k')),
  key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  icon TEXT,
  description TEXT,
  xp_reward INT NOT NULL DEFAULT 10,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE learn_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES learn_topics(id) ON DELETE CASCADE,
  level_number INT NOT NULL,
  config JSONB NOT NULL,
  UNIQUE (topic_id, level_number)
);

CREATE TABLE learn_progress (
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES learn_topics(id) ON DELETE CASCADE,
  level_number INT NOT NULL,
  stars SMALLINT,
  mistakes INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, topic_id, level_number)
);
CREATE INDEX idx_learn_progress_student ON learn_progress(student_id);

-- Shaxmat donalari (protsedural generatsiya)

INSERT INTO learn_topics (id, category, piece_type, key, title, subtitle, icon, description, sort_order)
VALUES ('77b4d9d6-7ae2-40ee-a1b5-cc39f1820c85', 'piece', 'r', 'rux', 'Rux', 'To''g''ri chiziqlar bo''ylab yuradi', '♖', 'Rux gorizontal va vertikal chiziqlar bo''ylab istalgan uzoqlikka yuradi.', 0);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('77b4d9d6-7ae2-40ee-a1b5-cc39f1820c85', 1, '{"mode":"generated","pieceType":"r","targetCount":1,"obstacleCount":0,"showHint":true}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('77b4d9d6-7ae2-40ee-a1b5-cc39f1820c85', 2, '{"mode":"generated","pieceType":"r","targetCount":1,"obstacleCount":1,"showHint":false}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('77b4d9d6-7ae2-40ee-a1b5-cc39f1820c85', 3, '{"mode":"generated","pieceType":"r","targetCount":2,"obstacleCount":1,"showHint":false}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('77b4d9d6-7ae2-40ee-a1b5-cc39f1820c85', 4, '{"mode":"generated","pieceType":"r","targetCount":2,"obstacleCount":2,"showHint":false}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('77b4d9d6-7ae2-40ee-a1b5-cc39f1820c85', 5, '{"mode":"generated","pieceType":"r","targetCount":3,"obstacleCount":2,"showHint":false}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('77b4d9d6-7ae2-40ee-a1b5-cc39f1820c85', 6, '{"mode":"generated","pieceType":"r","targetCount":3,"obstacleCount":3,"showHint":false}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('77b4d9d6-7ae2-40ee-a1b5-cc39f1820c85', 7, '{"mode":"generated","pieceType":"r","targetCount":4,"obstacleCount":3,"showHint":false}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('77b4d9d6-7ae2-40ee-a1b5-cc39f1820c85', 8, '{"mode":"generated","pieceType":"r","targetCount":4,"obstacleCount":4,"showHint":false}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('77b4d9d6-7ae2-40ee-a1b5-cc39f1820c85', 9, '{"mode":"generated","pieceType":"r","targetCount":5,"obstacleCount":4,"showHint":false}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('77b4d9d6-7ae2-40ee-a1b5-cc39f1820c85', 10, '{"mode":"generated","pieceType":"r","targetCount":6,"obstacleCount":5,"showHint":false}'::jsonb);

INSERT INTO learn_topics (id, category, piece_type, key, title, subtitle, icon, description, sort_order)
VALUES ('f69e0678-bc8d-4685-82ce-f07f5539513c', 'piece', 'b', 'fil', 'Fil', 'Diagonal bo''ylab yuradi', '♗', 'Fil diagonal chiziqlar bo''ylab istalgan uzoqlikka yuradi.', 1);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('f69e0678-bc8d-4685-82ce-f07f5539513c', 1, '{"mode":"generated","pieceType":"b","targetCount":1,"obstacleCount":0,"showHint":true}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('f69e0678-bc8d-4685-82ce-f07f5539513c', 2, '{"mode":"generated","pieceType":"b","targetCount":1,"obstacleCount":1,"showHint":false}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('f69e0678-bc8d-4685-82ce-f07f5539513c', 3, '{"mode":"generated","pieceType":"b","targetCount":2,"obstacleCount":1,"showHint":false}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('f69e0678-bc8d-4685-82ce-f07f5539513c', 4, '{"mode":"generated","pieceType":"b","targetCount":2,"obstacleCount":2,"showHint":false}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('f69e0678-bc8d-4685-82ce-f07f5539513c', 5, '{"mode":"generated","pieceType":"b","targetCount":3,"obstacleCount":2,"showHint":false}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('f69e0678-bc8d-4685-82ce-f07f5539513c', 6, '{"mode":"generated","pieceType":"b","targetCount":3,"obstacleCount":3,"showHint":false}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('f69e0678-bc8d-4685-82ce-f07f5539513c', 7, '{"mode":"generated","pieceType":"b","targetCount":4,"obstacleCount":3,"showHint":false}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('f69e0678-bc8d-4685-82ce-f07f5539513c', 8, '{"mode":"generated","pieceType":"b","targetCount":4,"obstacleCount":4,"showHint":false}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('f69e0678-bc8d-4685-82ce-f07f5539513c', 9, '{"mode":"generated","pieceType":"b","targetCount":5,"obstacleCount":4,"showHint":false}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('f69e0678-bc8d-4685-82ce-f07f5539513c', 10, '{"mode":"generated","pieceType":"b","targetCount":6,"obstacleCount":5,"showHint":false}'::jsonb);

INSERT INTO learn_topics (id, category, piece_type, key, title, subtitle, icon, description, sort_order)
VALUES ('c135590c-0319-47fd-b4a1-4069934a0d2b', 'piece', 'q', 'farzin', 'Farzin', 'Har tomonga uzoq yuradi', '♕', 'Farzin rux va fil yurishlarini birlashtiradi — har tomonga uzoq masofaga yuradi.', 2);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('c135590c-0319-47fd-b4a1-4069934a0d2b', 1, '{"mode":"generated","pieceType":"q","targetCount":1,"obstacleCount":0,"showHint":true}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('c135590c-0319-47fd-b4a1-4069934a0d2b', 2, '{"mode":"generated","pieceType":"q","targetCount":1,"obstacleCount":1,"showHint":false}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('c135590c-0319-47fd-b4a1-4069934a0d2b', 3, '{"mode":"generated","pieceType":"q","targetCount":2,"obstacleCount":1,"showHint":false}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('c135590c-0319-47fd-b4a1-4069934a0d2b', 4, '{"mode":"generated","pieceType":"q","targetCount":2,"obstacleCount":2,"showHint":false}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('c135590c-0319-47fd-b4a1-4069934a0d2b', 5, '{"mode":"generated","pieceType":"q","targetCount":3,"obstacleCount":2,"showHint":false}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('c135590c-0319-47fd-b4a1-4069934a0d2b', 6, '{"mode":"generated","pieceType":"q","targetCount":3,"obstacleCount":3,"showHint":false}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('c135590c-0319-47fd-b4a1-4069934a0d2b', 7, '{"mode":"generated","pieceType":"q","targetCount":4,"obstacleCount":3,"showHint":false}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('c135590c-0319-47fd-b4a1-4069934a0d2b', 8, '{"mode":"generated","pieceType":"q","targetCount":4,"obstacleCount":4,"showHint":false}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('c135590c-0319-47fd-b4a1-4069934a0d2b', 9, '{"mode":"generated","pieceType":"q","targetCount":5,"obstacleCount":4,"showHint":false}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('c135590c-0319-47fd-b4a1-4069934a0d2b', 10, '{"mode":"generated","pieceType":"q","targetCount":6,"obstacleCount":5,"showHint":false}'::jsonb);

INSERT INTO learn_topics (id, category, piece_type, key, title, subtitle, icon, description, sort_order)
VALUES ('432f4d0d-11a4-4113-a51a-3f4eeda1848b', 'piece', 'k', 'shoh', 'Shoh', 'Har tomonga bir qadam yuradi', '♔', 'Shoh har tomonga faqat bitta katakka yuradi.', 3);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('432f4d0d-11a4-4113-a51a-3f4eeda1848b', 1, '{"mode":"generated","pieceType":"k","targetCount":1,"obstacleCount":0,"showHint":true}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('432f4d0d-11a4-4113-a51a-3f4eeda1848b', 2, '{"mode":"generated","pieceType":"k","targetCount":1,"obstacleCount":1,"showHint":false}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('432f4d0d-11a4-4113-a51a-3f4eeda1848b', 3, '{"mode":"generated","pieceType":"k","targetCount":2,"obstacleCount":1,"showHint":false}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('432f4d0d-11a4-4113-a51a-3f4eeda1848b', 4, '{"mode":"generated","pieceType":"k","targetCount":2,"obstacleCount":2,"showHint":false}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('432f4d0d-11a4-4113-a51a-3f4eeda1848b', 5, '{"mode":"generated","pieceType":"k","targetCount":3,"obstacleCount":2,"showHint":false}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('432f4d0d-11a4-4113-a51a-3f4eeda1848b', 6, '{"mode":"generated","pieceType":"k","targetCount":3,"obstacleCount":3,"showHint":false}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('432f4d0d-11a4-4113-a51a-3f4eeda1848b', 7, '{"mode":"generated","pieceType":"k","targetCount":4,"obstacleCount":3,"showHint":false}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('432f4d0d-11a4-4113-a51a-3f4eeda1848b', 8, '{"mode":"generated","pieceType":"k","targetCount":4,"obstacleCount":4,"showHint":false}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('432f4d0d-11a4-4113-a51a-3f4eeda1848b', 9, '{"mode":"generated","pieceType":"k","targetCount":5,"obstacleCount":4,"showHint":false}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('432f4d0d-11a4-4113-a51a-3f4eeda1848b', 10, '{"mode":"generated","pieceType":"k","targetCount":6,"obstacleCount":5,"showHint":false}'::jsonb);

INSERT INTO learn_topics (id, category, piece_type, key, title, subtitle, icon, description, sort_order)
VALUES ('4ac0bdb3-151d-4e1a-b71e-ec2e64dd5c7f', 'piece', 'n', 'ot', 'Ot', '"L" shaklida sakraydi', '♘', 'Ot "L" shaklida sakraydi va boshqa donalar ustidan o''ta oladi.', 4);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('4ac0bdb3-151d-4e1a-b71e-ec2e64dd5c7f', 1, '{"mode":"generated","pieceType":"n","targetCount":1,"obstacleCount":0,"showHint":true}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('4ac0bdb3-151d-4e1a-b71e-ec2e64dd5c7f', 2, '{"mode":"generated","pieceType":"n","targetCount":1,"obstacleCount":1,"showHint":false}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('4ac0bdb3-151d-4e1a-b71e-ec2e64dd5c7f', 3, '{"mode":"generated","pieceType":"n","targetCount":2,"obstacleCount":1,"showHint":false}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('4ac0bdb3-151d-4e1a-b71e-ec2e64dd5c7f', 4, '{"mode":"generated","pieceType":"n","targetCount":2,"obstacleCount":2,"showHint":false}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('4ac0bdb3-151d-4e1a-b71e-ec2e64dd5c7f', 5, '{"mode":"generated","pieceType":"n","targetCount":3,"obstacleCount":2,"showHint":false}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('4ac0bdb3-151d-4e1a-b71e-ec2e64dd5c7f', 6, '{"mode":"generated","pieceType":"n","targetCount":3,"obstacleCount":3,"showHint":false}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('4ac0bdb3-151d-4e1a-b71e-ec2e64dd5c7f', 7, '{"mode":"generated","pieceType":"n","targetCount":4,"obstacleCount":3,"showHint":false}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('4ac0bdb3-151d-4e1a-b71e-ec2e64dd5c7f', 8, '{"mode":"generated","pieceType":"n","targetCount":4,"obstacleCount":4,"showHint":false}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('4ac0bdb3-151d-4e1a-b71e-ec2e64dd5c7f', 9, '{"mode":"generated","pieceType":"n","targetCount":5,"obstacleCount":4,"showHint":false}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('4ac0bdb3-151d-4e1a-b71e-ec2e64dd5c7f', 10, '{"mode":"generated","pieceType":"n","targetCount":6,"obstacleCount":5,"showHint":false}'::jsonb);

INSERT INTO learn_topics (id, category, piece_type, key, title, subtitle, icon, description, sort_order)
VALUES ('a7c5180d-67dd-4ee6-8e67-7254dbd274aa', 'piece', 'p', 'piyoda', 'Piyoda', 'Faqat oldinga yuradi, qiyshiq uradi', '♙', 'Piyoda oldinga yuradi, lekin dushman donasini faqat qiyshiq uradi.', 5);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('a7c5180d-67dd-4ee6-8e67-7254dbd274aa', 1, '{"mode":"generated","pieceType":"p","targetCount":1,"obstacleCount":0,"showHint":true}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('a7c5180d-67dd-4ee6-8e67-7254dbd274aa', 2, '{"mode":"generated","pieceType":"p","targetCount":1,"obstacleCount":1,"showHint":false}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('a7c5180d-67dd-4ee6-8e67-7254dbd274aa', 3, '{"mode":"generated","pieceType":"p","targetCount":2,"obstacleCount":1,"showHint":false}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('a7c5180d-67dd-4ee6-8e67-7254dbd274aa', 4, '{"mode":"generated","pieceType":"p","targetCount":2,"obstacleCount":2,"showHint":false}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('a7c5180d-67dd-4ee6-8e67-7254dbd274aa', 5, '{"mode":"generated","pieceType":"p","targetCount":3,"obstacleCount":2,"showHint":false}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('a7c5180d-67dd-4ee6-8e67-7254dbd274aa', 6, '{"mode":"generated","pieceType":"p","targetCount":3,"obstacleCount":3,"showHint":false}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('a7c5180d-67dd-4ee6-8e67-7254dbd274aa', 7, '{"mode":"generated","pieceType":"p","targetCount":4,"obstacleCount":3,"showHint":false}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('a7c5180d-67dd-4ee6-8e67-7254dbd274aa', 8, '{"mode":"generated","pieceType":"p","targetCount":4,"obstacleCount":4,"showHint":false}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('a7c5180d-67dd-4ee6-8e67-7254dbd274aa', 9, '{"mode":"generated","pieceType":"p","targetCount":5,"obstacleCount":4,"showHint":false}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('a7c5180d-67dd-4ee6-8e67-7254dbd274aa', 10, '{"mode":"generated","pieceType":"p","targetCount":6,"obstacleCount":5,"showHint":false}'::jsonb);

-- principle

INSERT INTO learn_topics (id, category, piece_type, key, title, subtitle, icon, description, sort_order)
VALUES ('6e7743fb-296a-4e10-b2c2-99f6811c7086', 'principle', NULL, 'urib_olish', 'Urib olish', 'Raqib donalarini urib oling', '⚔️', 'Raqib donalarini urib oling', 0);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('6e7743fb-296a-4e10-b2c2-99f6811c7086', 1, '{"mode":"fixed","pieceType":"r","from":"c3","to":"c7","enemies":[{"square":"c7","piece":"p"},{"square":"f5","piece":"p"},{"square":"a6","piece":"p"}],"instruction":"Dushman donasini urib oling!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('6e7743fb-296a-4e10-b2c2-99f6811c7086', 2, '{"mode":"fixed","pieceType":"b","from":"a1","to":"d4","enemies":[{"square":"d4","piece":"n"},{"square":"g6","piece":"p"},{"square":"b6","piece":"p"}],"instruction":"Dushman donasini urib oling!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('6e7743fb-296a-4e10-b2c2-99f6811c7086', 3, '{"mode":"fixed","pieceType":"n","from":"b1","to":"c3","enemies":[{"square":"c3","piece":"b"},{"square":"f4","piece":"p"},{"square":"e7","piece":"p"}],"instruction":"Dushman donasini urib oling!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('6e7743fb-296a-4e10-b2c2-99f6811c7086', 4, '{"mode":"fixed","pieceType":"q","from":"d1","to":"h5","enemies":[{"square":"h5","piece":"r"},{"square":"a8","piece":"p"},{"square":"f7","piece":"p"}],"instruction":"Dushman donasini urib oling!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('6e7743fb-296a-4e10-b2c2-99f6811c7086', 5, '{"mode":"fixed","pieceType":"k","from":"e2","to":"d2","enemies":[{"square":"d2","piece":"p"},{"square":"g4","piece":"p"},{"square":"b4","piece":"p"}],"instruction":"Dushman donasini urib oling!","specialMove":null}'::jsonb);

INSERT INTO learn_topics (id, category, piece_type, key, title, subtitle, icon, description, sort_order)
VALUES ('dd518cd6-6e60-4988-9cba-38bd84f5ab26', 'principle', NULL, 'himoya', 'Himoya', 'Muhim katakchalarni himoya qiling', '🛡️', 'Muhim katakchalarni himoya qiling', 1);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('dd518cd6-6e60-4988-9cba-38bd84f5ab26', 1, '{"mode":"fixed","pieceType":"r","from":"a4","to":"e4","enemies":[{"square":"e8","piece":"r"},{"square":"e7","piece":"p"}],"instruction":"Donangizni himoya uchun joylashtiring!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('dd518cd6-6e60-4988-9cba-38bd84f5ab26', 2, '{"mode":"fixed","pieceType":"b","from":"b2","to":"e5","enemies":[{"square":"h8","piece":"b"},{"square":"f7","piece":"p"},{"square":"c7","piece":"p"}],"instruction":"Donangizni himoya uchun joylashtiring!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('dd518cd6-6e60-4988-9cba-38bd84f5ab26', 3, '{"mode":"fixed","pieceType":"n","from":"g1","to":"f3","enemies":[{"square":"d4","piece":"r"},{"square":"h5","piece":"r"}],"instruction":"Donangizni himoya uchun joylashtiring!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('dd518cd6-6e60-4988-9cba-38bd84f5ab26', 4, '{"mode":"fixed","pieceType":"k","from":"e1","to":"d1","enemies":[{"square":"e8","piece":"r"},{"square":"f8","piece":"r"}],"instruction":"Donangizni himoya uchun joylashtiring!","specialMove":null}'::jsonb);

INSERT INTO learn_topics (id, category, piece_type, key, title, subtitle, icon, description, sort_order)
VALUES ('d0745baa-3df1-43c8-8b86-f8687c1f6aa4', 'principle', NULL, 'jang', 'Jang', 'Donalarni bir-bir urib oling', '⚔️', 'Donalarni bir-bir urib oling', 2);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('d0745baa-3df1-43c8-8b86-f8687c1f6aa4', 1, '{"mode":"fixed","pieceType":"n","from":"b1","to":"c3","enemies":[{"square":"c3","piece":"p"},{"square":"e4","piece":"p"},{"square":"g5","piece":"p"}],"instruction":"Hujum qiling!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('d0745baa-3df1-43c8-8b86-f8687c1f6aa4', 2, '{"mode":"fixed","pieceType":"r","from":"a6","to":"f6","enemies":[{"square":"f6","piece":"p"},{"square":"c4","piece":"n"},{"square":"h3","piece":"r"}],"instruction":"Hujum qiling!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('d0745baa-3df1-43c8-8b86-f8687c1f6aa4', 3, '{"mode":"fixed","pieceType":"b","from":"f1","to":"c4","enemies":[{"square":"c4","piece":"n"},{"square":"a6","piece":"p"},{"square":"g7","piece":"p"}],"instruction":"Hujum qiling!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('d0745baa-3df1-43c8-8b86-f8687c1f6aa4', 4, '{"mode":"fixed","pieceType":"q","from":"d1","to":"h5","enemies":[{"square":"h5","piece":"r"},{"square":"b6","piece":"p"},{"square":"f3","piece":"p"}],"instruction":"Hujum qiling!","specialMove":null}'::jsonb);

INSERT INTO learn_topics (id, category, piece_type, key, title, subtitle, icon, description, sort_order)
VALUES ('c57c1f06-bfa7-42c1-a058-8595e43a9dd7', 'principle', NULL, 'shoh_berish', 'Shoh berish', 'Dushman shohiga shoh bering', '⚡', 'Dushman shohiga shoh bering', 3);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('c57c1f06-bfa7-42c1-a058-8595e43a9dd7', 1, '{"mode":"fixed","pieceType":"r","from":"e1","to":"e6","enemies":[{"square":"e8","piece":"k"},{"square":"d7","piece":"p"},{"square":"f7","piece":"p"}],"instruction":"Qora shohga shoh bering!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('c57c1f06-bfa7-42c1-a058-8595e43a9dd7', 2, '{"mode":"fixed","pieceType":"b","from":"a4","to":"c6","enemies":[{"square":"e8","piece":"k"},{"square":"g7","piece":"p"},{"square":"a7","piece":"p"}],"instruction":"Qora shohga shoh bering!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('c57c1f06-bfa7-42c1-a058-8595e43a9dd7', 3, '{"mode":"fixed","pieceType":"n","from":"h5","to":"f6","enemies":[{"square":"e8","piece":"k"},{"square":"c7","piece":"p"},{"square":"g7","piece":"p"}],"instruction":"Qora shohga shoh bering!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('c57c1f06-bfa7-42c1-a058-8595e43a9dd7', 4, '{"mode":"fixed","pieceType":"q","from":"a5","to":"a8","enemies":[{"square":"e8","piece":"k"},{"square":"b7","piece":"p"},{"square":"d7","piece":"p"}],"instruction":"Qora shohga shoh bering!","specialMove":null}'::jsonb);

INSERT INTO learn_topics (id, category, piece_type, key, title, subtitle, icon, description, sort_order)
VALUES ('19aa6b7d-2633-4e6e-b098-9d072654edcc', 'principle', NULL, 'shohdan_qutulish', 'Shohdan qutulish', 'Shohingizni xavfdan oling', '🛡️', 'Shohingizni xavfdan oling', 4);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('19aa6b7d-2633-4e6e-b098-9d072654edcc', 1, '{"mode":"fixed","pieceType":"k","from":"e1","to":"d1","enemies":[{"square":"e8","piece":"r"},{"square":"e6","piece":"r"}],"instruction":"Shohni xavfsiz katakka olib boring!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('19aa6b7d-2633-4e6e-b098-9d072654edcc', 2, '{"mode":"fixed","pieceType":"k","from":"h1","to":"g2","enemies":[{"square":"h8","piece":"r"},{"square":"f8","piece":"r"}],"instruction":"Shohni xavfsiz katakka olib boring!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('19aa6b7d-2633-4e6e-b098-9d072654edcc', 3, '{"mode":"fixed","pieceType":"k","from":"e3","to":"d3","enemies":[{"square":"h6","piece":"b"},{"square":"b6","piece":"b"}],"instruction":"Shohni xavfsiz katakka olib boring!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('19aa6b7d-2633-4e6e-b098-9d072654edcc', 4, '{"mode":"fixed","pieceType":"k","from":"f4","to":"g5","enemies":[{"square":"a4","piece":"r"},{"square":"f8","piece":"r"}],"instruction":"Shohni xavfsiz katakka olib boring!","specialMove":null}'::jsonb);

INSERT INTO learn_topics (id, category, piece_type, key, title, subtitle, icon, description, sort_order)
VALUES ('8c174428-aa11-492b-bf17-9d09aa47f3a4', 'principle', NULL, 'mot_berish', 'Mot berish', 'Dushmanga mot bering', '🏁', 'Dushmanga mot bering', 5);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('8c174428-aa11-492b-bf17-9d09aa47f3a4', 1, '{"mode":"fixed","pieceType":"r","from":"a7","to":"h7","enemies":[{"square":"h8","piece":"k"},{"square":"g7","piece":"p"},{"square":"g8","piece":"p"}],"instruction":"Mat bering!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('8c174428-aa11-492b-bf17-9d09aa47f3a4', 2, '{"mode":"fixed","pieceType":"q","from":"d6","to":"b8","enemies":[{"square":"a8","piece":"k"},{"square":"a7","piece":"p"},{"square":"c8","piece":"p"}],"instruction":"Mat bering!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('8c174428-aa11-492b-bf17-9d09aa47f3a4', 3, '{"mode":"fixed","pieceType":"r","from":"f1","to":"f8","enemies":[{"square":"h8","piece":"k"},{"square":"g8","piece":"p"},{"square":"g7","piece":"p"}],"instruction":"Mat bering!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('8c174428-aa11-492b-bf17-9d09aa47f3a4', 4, '{"mode":"fixed","pieceType":"q","from":"e6","to":"g8","enemies":[{"square":"h8","piece":"k"},{"square":"f8","piece":"p"},{"square":"g7","piece":"p"}],"instruction":"Mat bering!","specialMove":null}'::jsonb);

-- intermediate

INSERT INTO learn_topics (id, category, piece_type, key, title, subtitle, icon, description, sort_order)
VALUES ('590af880-d786-43ff-a16d-5bc6c0c46538', 'intermediate', NULL, 'taxt', 'Taxtani terish', 'O''yin qanday boshlanadi', '♟️', 'O''yin qanday boshlanadi', 0);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('590af880-d786-43ff-a16d-5bc6c0c46538', 1, '{"mode":"fixed","pieceType":"r","from":"h4","to":"a1","enemies":[{"square":"e5","piece":"p"},{"square":"d6","piece":"p"},{"square":"g6","piece":"p"}],"instruction":"Donani boshlang''ich joyiga qo''ying!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('590af880-d786-43ff-a16d-5bc6c0c46538', 2, '{"mode":"fixed","pieceType":"n","from":"e6","to":"b1","enemies":[{"square":"g4","piece":"p"},{"square":"c5","piece":"p"},{"square":"f6","piece":"p"}],"instruction":"Donani boshlang''ich joyiga qo''ying!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('590af880-d786-43ff-a16d-5bc6c0c46538', 3, '{"mode":"fixed","pieceType":"b","from":"g6","to":"c1","enemies":[{"square":"e4","piece":"p"},{"square":"a5","piece":"p"},{"square":"h4","piece":"p"}],"instruction":"Donani boshlang''ich joyiga qo''ying!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('590af880-d786-43ff-a16d-5bc6c0c46538', 4, '{"mode":"fixed","pieceType":"q","from":"b6","to":"d1","enemies":[{"square":"f5","piece":"p"},{"square":"c4","piece":"p"},{"square":"g3","piece":"p"}],"instruction":"Donani boshlang''ich joyiga qo''ying!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('590af880-d786-43ff-a16d-5bc6c0c46538', 5, '{"mode":"fixed","pieceType":"k","from":"f5","to":"e1","enemies":[{"square":"h3","piece":"p"},{"square":"b4","piece":"p"},{"square":"d5","piece":"p"}],"instruction":"Donani boshlang''ich joyiga qo''ying!","specialMove":null}'::jsonb);

INSERT INTO learn_topics (id, category, piece_type, key, title, subtitle, icon, description, sort_order)
VALUES ('73082d47-d2d1-4a2b-a479-21efc2dbe6c7', 'intermediate', NULL, 'rok', 'Rokirovka', 'Shohning maxsus yurishi', '🏰', 'Shohning maxsus yurishi', 1);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('73082d47-d2d1-4a2b-a479-21efc2dbe6c7', 1, '{"mode":"fixed","pieceType":"k","from":"e1","to":"g1","enemies":[{"square":"d5","piece":"r"},{"square":"f6","piece":"r"}],"instruction":"Shohni rokirovka qiling!","specialMove":"castle-k"}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('73082d47-d2d1-4a2b-a479-21efc2dbe6c7', 2, '{"mode":"fixed","pieceType":"k","from":"e1","to":"c1","enemies":[{"square":"e6","piece":"r"},{"square":"c5","piece":"r"}],"instruction":"Shohni rokirovka qiling!","specialMove":"castle-q"}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('73082d47-d2d1-4a2b-a479-21efc2dbe6c7', 3, '{"mode":"fixed","pieceType":"k","from":"e1","to":"g1","enemies":[{"square":"a4","piece":"r"},{"square":"b5","piece":"b"},{"square":"f6","piece":"r"}],"instruction":"Shohni rokirovka qiling!","specialMove":"castle-k"}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('73082d47-d2d1-4a2b-a479-21efc2dbe6c7', 4, '{"mode":"fixed","pieceType":"k","from":"e1","to":"c1","enemies":[{"square":"h4","piece":"r"},{"square":"g5","piece":"b"},{"square":"d6","piece":"r"}],"instruction":"Shohni rokirovka qiling!","specialMove":"castle-q"}'::jsonb);

INSERT INTO learn_topics (id, category, piece_type, key, title, subtitle, icon, description, sort_order)
VALUES ('084007fb-286a-4cc4-b2e5-4beaafe811fa', 'intermediate', NULL, 'kesib', 'En passant', 'Piyodaning maxsus yurishi', '♙', 'Piyodaning maxsus yurishi', 2);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('084007fb-286a-4cc4-b2e5-4beaafe811fa', 1, '{"mode":"fixed","pieceType":"p","from":"e5","to":"d6","enemies":[{"square":"d5","piece":"p"},{"square":"g6","piece":"p"},{"square":"b6","piece":"p"}],"instruction":"En passant qiling!","specialMove":"en-passant"}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('084007fb-286a-4cc4-b2e5-4beaafe811fa', 2, '{"mode":"fixed","pieceType":"p","from":"d5","to":"e6","enemies":[{"square":"e5","piece":"p"},{"square":"b5","piece":"p"},{"square":"g6","piece":"p"}],"instruction":"En passant qiling!","specialMove":"en-passant"}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('084007fb-286a-4cc4-b2e5-4beaafe811fa', 3, '{"mode":"fixed","pieceType":"p","from":"f5","to":"e6","enemies":[{"square":"e5","piece":"p"},{"square":"c6","piece":"p"},{"square":"h6","piece":"p"}],"instruction":"En passant qiling!","specialMove":"en-passant"}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('084007fb-286a-4cc4-b2e5-4beaafe811fa', 4, '{"mode":"fixed","pieceType":"p","from":"c5","to":"d6","enemies":[{"square":"d5","piece":"p"},{"square":"a6","piece":"p"},{"square":"f6","piece":"p"}],"instruction":"En passant qiling!","specialMove":"en-passant"}'::jsonb);

INSERT INTO learn_topics (id, category, piece_type, key, title, subtitle, icon, description, sort_order)
VALUES ('d5f83d88-2c5d-4b95-bb9a-6aa9db58ee62', 'intermediate', NULL, 'pat', 'Pat', 'O''yin — durang', '🤝', 'O''yin — durang', 3);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('d5f83d88-2c5d-4b95-bb9a-6aa9db58ee62', 1, '{"mode":"fixed","pieceType":"q","from":"d6","to":"b7","enemies":[{"square":"a8","piece":"k"},{"square":"b8","piece":"p"},{"square":"a7","piece":"p"}],"instruction":"Shohni matga qo''ymasdan qisib oling!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('d5f83d88-2c5d-4b95-bb9a-6aa9db58ee62', 2, '{"mode":"fixed","pieceType":"r","from":"a4","to":"a7","enemies":[{"square":"h8","piece":"k"},{"square":"g8","piece":"p"},{"square":"h7","piece":"p"}],"instruction":"Shohni matga qo''ymasdan qisib oling!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('d5f83d88-2c5d-4b95-bb9a-6aa9db58ee62', 3, '{"mode":"fixed","pieceType":"q","from":"f4","to":"g7","enemies":[{"square":"h8","piece":"k"},{"square":"f8","piece":"p"},{"square":"h6","piece":"p"}],"instruction":"Shohni matga qo''ymasdan qisib oling!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('d5f83d88-2c5d-4b95-bb9a-6aa9db58ee62', 4, '{"mode":"fixed","pieceType":"q","from":"c5","to":"f6","enemies":[{"square":"h8","piece":"k"},{"square":"g7","piece":"p"},{"square":"g8","piece":"p"}],"instruction":"Shohni matga qo''ymasdan qisib oling!","specialMove":null}'::jsonb);

-- advanced

INSERT INTO learn_topics (id, category, piece_type, key, title, subtitle, icon, description, sort_order)
VALUES ('fef15b66-4ee8-44b5-9965-32dac9459839', 'advanced', NULL, 'dona', 'Donalar qiymati', 'Donalar kuchini baholang', '💰', 'Donalar kuchini baholang', 0);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('fef15b66-4ee8-44b5-9965-32dac9459839', 1, '{"mode":"fixed","pieceType":"q","from":"a1","to":"h5","enemies":[{"square":"h5","piece":"r"},{"square":"d4","piece":"p"},{"square":"f6","piece":"p"}],"instruction":"Eng qimmatli dushman donasini urib oling!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('fef15b66-4ee8-44b5-9965-32dac9459839', 2, '{"mode":"fixed","pieceType":"r","from":"h1","to":"h7","enemies":[{"square":"h7","piece":"b"},{"square":"h4","piece":"p"},{"square":"e7","piece":"p"}],"instruction":"Eng qimmatli dushman donasini urib oling!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('fef15b66-4ee8-44b5-9965-32dac9459839', 3, '{"mode":"fixed","pieceType":"b","from":"a1","to":"e5","enemies":[{"square":"e5","piece":"n"},{"square":"g3","piece":"p"},{"square":"c7","piece":"p"}],"instruction":"Eng qimmatli dushman donasini urib oling!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('fef15b66-4ee8-44b5-9965-32dac9459839', 4, '{"mode":"fixed","pieceType":"n","from":"b1","to":"c3","enemies":[{"square":"c3","piece":"p"},{"square":"f6","piece":"r"},{"square":"a7","piece":"b"}],"instruction":"Eng qimmatli dushman donasini urib oling!","specialMove":null}'::jsonb);

INSERT INTO learn_topics (id, category, piece_type, key, title, subtitle, icon, description, sort_order)
VALUES ('32ec3d01-07d6-4195-80f1-63f72ba24e80', 'advanced', NULL, 'ikki', 'Ikki yurishda shoh berish', 'Shoh berish uchun ikki yurish', '⚔️', 'Shoh berish uchun ikki yurish', 1);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('32ec3d01-07d6-4195-80f1-63f72ba24e80', 1, '{"mode":"fixed","pieceType":"r","from":"a1","to":"e1","enemies":[{"square":"e8","piece":"k"},{"square":"d7","piece":"p"},{"square":"f7","piece":"p"}],"instruction":"Shoh berishga tayyorlaning!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('32ec3d01-07d6-4195-80f1-63f72ba24e80', 2, '{"mode":"fixed","pieceType":"r","from":"e1","to":"e6","enemies":[{"square":"e8","piece":"k"},{"square":"d7","piece":"p"},{"square":"f7","piece":"p"}],"instruction":"Shoh berishga tayyorlaning!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('32ec3d01-07d6-4195-80f1-63f72ba24e80', 3, '{"mode":"fixed","pieceType":"b","from":"a1","to":"d4","enemies":[{"square":"e8","piece":"k"},{"square":"g6","piece":"p"},{"square":"c6","piece":"p"}],"instruction":"Shoh berishga tayyorlaning!","specialMove":null}'::jsonb);
INSERT INTO learn_levels (topic_id, level_number, config) VALUES ('32ec3d01-07d6-4195-80f1-63f72ba24e80', 4, '{"mode":"fixed","pieceType":"q","from":"d1","to":"a4","enemies":[{"square":"e8","piece":"k"},{"square":"b7","piece":"p"},{"square":"f7","piece":"p"}],"instruction":"Shoh berishga tayyorlaning!","specialMove":null}'::jsonb);

