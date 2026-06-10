-- ══════════════════════════════════════════════════════════════
-- 真实原料数据导入SQL
-- 生成时间: 2026/4/25 09:19:54
-- 记录数: 52 条原料 + 52 条营养数据
-- ══════════════════════════════════════════════════════════════

BEGIN TRANSACTION;

-- 清空现有数据
DELETE FROM material_nutrition;
DELETE FROM materials;

-- 1. 阿胶 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('96bd8cf8-74e5-4b6a-b13d-9fd1db3d9ce0', '阿胶', 'EJ', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.652Z', '2026-04-25T01:19:54.652Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('6a2ace9b-171c-432c-8a92-a81906af2ca9', '96bd8cf8-74e5-4b6a-b13d-9fd1db3d9ce0', '{"protein":80,"fat":8,"carbohydrate":2,"sodium":null,"unit":"per_100g"}', '1.0', '酸枣仁灵芝石斛膏', 'high', '2026-04-25T01:19:54.652Z');

-- 2. 白芷 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('ac709b00-d350-4cdd-bc75-3d864d8190a2', '白芷', 'RB', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.653Z', '2026-04-25T01:19:54.653Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('743d6ab2-3931-43c7-87b2-72b3cc90dec6', 'ac709b00-d350-4cdd-bc75-3d864d8190a2', '{"protein":8.9,"fat":1.5,"carbohydrate":74.1,"sodium":27,"unit":"per_100g"}', '1.0', '正阳御湿膏', 'high', '2026-04-25T01:19:54.653Z');

-- 3. 百合 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('cd9eb810-06d1-4600-8d08-f8a7cb570646', '百合', 'BH', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.653Z', '2026-04-25T01:19:54.653Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('24b4474d-60e0-4103-ae5d-e06fce1a016e', 'cd9eb810-06d1-4600-8d08-f8a7cb570646', '{"protein":6.7,"fat":0.5,"carbohydrate":79.5,"sodium":37,"unit":"per_100g"}', '1.0', '酸枣仁灵芝石斛膏', 'high', '2026-04-25T01:19:54.653Z');

-- 4. 草果 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('08dd2ce9-e340-4cbb-938f-fe00f72df2f9', '草果', 'RE', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.653Z', '2026-04-25T01:19:54.653Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('8ad690b0-9559-42fc-897b-7bc0e7ab02f1', '08dd2ce9-e340-4cbb-938f-fe00f72df2f9', '{"protein":2.9,"fat":0.4,"carbohydrate":5.6,"sodium":5,"unit":"per_100g"}', '1.0', '正阳御湿膏', 'high', '2026-04-25T01:19:54.653Z');

-- 5. 炒白扁豆 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('521ee0de-2101-412a-a404-1756a4733a3b', '炒白扁豆', 'KRLE', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.653Z', '2026-04-25T01:19:54.653Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('ae81877f-f145-4221-a98a-2b7b780260cc', '521ee0de-2101-412a-a404-1756a4733a3b', '{"protein":19,"fat":1.3,"carbohydrate":55.6,"sodium":null,"unit":"per_100g"}', '1.0', '正阳御湿膏', 'high', '2026-04-25T01:19:54.653Z');

-- 6. 陈皮 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('29677d26-095e-41a4-8d12-a8bec7bc58c9', '陈皮', 'CP', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.653Z', '2026-04-25T01:19:54.653Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('7082d556-f509-455d-88da-259ca22f00c8', '29677d26-095e-41a4-8d12-a8bec7bc58c9', '{"protein":8,"fat":1.4,"carbohydrate":79,"sodium":21,"unit":"per_100g"}', '1.0', '酸枣仁灵芝石斛膏', 'high', '2026-04-25T01:19:54.653Z');

-- 7. 大枣 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('e20241e0-f339-4d2c-91e6-6fbff9e27cf4', '大枣', 'VL', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.653Z', '2026-04-25T01:19:54.653Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('04097c2b-2f29-437a-99a5-96139c0a0e1c', 'e20241e0-f339-4d2c-91e6-6fbff9e27cf4', '{"protein":3.2,"fat":0.5,"carbohydrate":67.8,"sodium":6,"unit":"per_100g"}', '1.0', '酸枣仁灵芝石斛膏', 'high', '2026-04-25T01:19:54.653Z');

-- 8. 当归 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('c88e1a3c-aabf-4003-b01f-5fa8f0292fa3', '当归', 'DG', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.654Z', '2026-04-25T01:19:54.654Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('063841a3-fee8-4146-b5df-396377109dad', 'c88e1a3c-aabf-4003-b01f-5fa8f0292fa3', '{"protein":44.2,"fat":2.4,"carbohydrate":18.2,"sodium":null,"unit":"per_100g"}', '1.0', '沫彐淳膏', 'high', '2026-04-25T01:19:54.654Z');

-- 9. 党参 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('b4e8558a-3120-4091-995f-fd48d0e14ef5', '党参', 'DS', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.655Z', '2026-04-25T01:19:54.655Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('6283037a-3cdd-47e8-9b2f-7e86522f4659', 'b4e8558a-3120-4091-995f-fd48d0e14ef5', '{"protein":53.7,"fat":1.8,"carbohydrate":10.4,"sodium":null,"unit":"per_100g"}', '1.0', '正阳御湿膏', 'high', '2026-04-25T01:19:54.655Z');

-- 10. 地龙蛋白肽粉 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('946c6533-0a75-4c2c-8df6-6f9114b6c68c', '地龙蛋白肽粉', 'MLFR', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.655Z', '2026-04-25T01:19:54.655Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('d112da1d-ecd6-4544-9646-9cb559f6f9f0', '946c6533-0a75-4c2c-8df6-6f9114b6c68c', '{"protein":60,"fat":1,"carbohydrate":15,"sodium":null,"unit":"per_100g"}', '1.0', '沫彐淳膏', 'high', '2026-04-25T01:19:54.655Z');

-- 11. 低聚异麦芽糖 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('40bb9619-6106-43b2-9402-17bc6939c9e8', '低聚异麦芽糖', 'WUMC', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.655Z', '2026-04-25T01:19:54.655Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('1636f0d9-60cb-4910-a925-adc9991831b6', '40bb9619-6106-43b2-9402-17bc6939c9e8', '{"protein":null,"fat":null,"carbohydrate":90,"sodium":null,"unit":"per_100g"}', '1.0', '酸枣仁灵芝石斛膏', 'high', '2026-04-25T01:19:54.655Z');

-- 12. 短梗五加 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('3d7116e5-ca37-4d11-b670-2d68391764a2', '短梗五加', 'VVSO', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.655Z', '2026-04-25T01:19:54.655Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('32be689e-daf0-433d-a569-0e85039d6ba9', '3d7116e5-ca37-4d11-b670-2d68391764a2', '{"protein":12,"fat":null,"carbohydrate":65,"sodium":null,"unit":"per_100g"}', '1.0', '沫彐淳膏', 'high', '2026-04-25T01:19:54.655Z');

-- 13. 佛手 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('dbf13746-1736-4493-b0dc-2d6fb691bf36', '佛手', 'FS', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.655Z', '2026-04-25T01:19:54.655Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('295670ac-dc4f-45b5-a734-d8377edc017b', 'dbf13746-1736-4493-b0dc-2d6fb691bf36', '{"protein":1.2,"fat":7.7,"carbohydrate":92,"sodium":null,"unit":"per_100g"}', '1.0', '佛手玫苓膏', 'high', '2026-04-25T01:19:54.655Z');

-- 14. 佛手玫苓膏 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('8a363608-b9df-46ad-b58f-c442e3b96c2c', '佛手玫苓膏', 'FSQLG', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.656Z', '2026-04-25T01:19:54.656Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('387c1973-0ad2-40b5-8bd1-67c967856469', '8a363608-b9df-46ad-b58f-c442e3b96c2c', '{"protein":null,"fat":null,"carbohydrate":null,"sodium":null,"unit":"per_100g"}', '1.0', '佛手玫苓膏', 'high', '2026-04-25T01:19:54.656Z');

-- 15. 茯苓 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('2877e108-8bf3-4df3-9ce5-0e566ee18444', '茯苓', 'FL', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.656Z', '2026-04-25T01:19:54.656Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('9674e239-3602-4c4a-860d-48a07cd8d9d2', '2877e108-8bf3-4df3-9ce5-0e566ee18444', '{"protein":1.2,"fat":0.5,"carbohydrate":82.6,"sodium":1,"unit":"per_100g"}', '1.0', '酸枣仁灵芝石斛膏', 'high', '2026-04-25T01:19:54.656Z');

-- 16. 甘草 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('cbd63f05-116f-4c92-ab32-e09e402f7d8b', '甘草', 'GC', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.656Z', '2026-04-25T01:19:54.656Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('8dabff9d-7cfc-48a5-b563-6e764233f463', 'cbd63f05-116f-4c92-ab32-e09e402f7d8b', '{"protein":4.9,"fat":4.2,"carbohydrate":75,"sodium":155,"unit":"per_100g"}', '1.0', '酸枣仁灵芝石斛膏', 'high', '2026-04-25T01:19:54.656Z');

-- 17. 葛根 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('b05ac750-265a-446f-b082-554218b997b8', '葛根', 'FF', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.656Z', '2026-04-25T01:19:54.656Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('5cf57f03-5d25-4ed4-a70b-56b44ea5b9b0', 'b05ac750-265a-446f-b082-554218b997b8', '{"protein":0.4,"fat":0.1,"carbohydrate":94,"sodium":5,"unit":"per_100g"}', '1.0', '沫彐淳膏', 'high', '2026-04-25T01:19:54.656Z');

-- 18. 枸杞子 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('6b539b44-9c22-4b26-9c5b-d981427d6131', '枸杞子', 'GUC', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.656Z', '2026-04-25T01:19:54.656Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('4334a784-425d-4ca1-a44d-98e87566260e', '6b539b44-9c22-4b26-9c5b-d981427d6131', '{"protein":13.9,"fat":1.5,"carbohydrate":64.1,"sodium":252,"unit":"per_100g"}', '1.0', '沫彐淳膏', 'high', '2026-04-25T01:19:54.656Z');

-- 19. 荷叶 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('12fe1a90-53be-4156-a5e5-7023132e574a', '荷叶', 'LS', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.656Z', '2026-04-25T01:19:54.656Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('30cbc6f1-a5c0-4ad3-bb1a-55fe2195d042', '12fe1a90-53be-4156-a5e5-7023132e574a', '{"protein":3.1,"fat":0.2,"carbohydrate":5.6,"sodium":5,"unit":"per_100g"}', '1.0', '沫彐淳膏', 'high', '2026-04-25T01:19:54.656Z');

-- 20. 黄精 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('8e7fa4e2-3a9a-4f99-b06d-c744c5e5d221', '黄精', 'HJ', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.656Z', '2026-04-25T01:19:54.656Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('0a6deea7-2f44-4fa0-8ade-191b7ad82cac', '8e7fa4e2-3a9a-4f99-b06d-c744c5e5d221', '{"protein":11.6,"fat":3.7,"carbohydrate":52.3,"sodium":null,"unit":"per_100g"}', '1.0', '沫彐淳膏', 'high', '2026-04-25T01:19:54.656Z');

-- 21. 黄芪 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('dbc6f873-2419-4aeb-a2ba-c7ada8292b2d', '黄芪', 'HQ', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.656Z', '2026-04-25T01:19:54.656Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('546e2a84-afcb-4f0b-a108-18b0cd9ae802', 'dbc6f873-2419-4aeb-a2ba-c7ada8292b2d', '{"protein":14.9,"fat":1.1,"carbohydrate":33.4,"sodium":null,"unit":"per_100g"}', '1.0', '沫彐淳膏', 'high', '2026-04-25T01:19:54.656Z');

-- 22. 藿香 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('9b09c850-bdca-46dd-91f3-627c2d4e83b5', '藿香', 'JJ', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.656Z', '2026-04-25T01:19:54.656Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('cb71142a-0c40-48fc-8e17-5a14250fbb8b', '9b09c850-bdca-46dd-91f3-627c2d4e83b5', '{"protein":10.5,"fat":5,"carbohydrate":63.1,"sodium":46,"unit":"per_100g"}', '1.0', '正阳御湿膏', 'high', '2026-04-25T01:19:54.656Z');

-- 23. 桔梗 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('8d74d2ea-7b4a-4f7c-8514-d3836da27247', '桔梗', 'GV', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.656Z', '2026-04-25T01:19:54.656Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('d6eb20ee-f12c-4e77-bf32-85b9983ae587', '8d74d2ea-7b4a-4f7c-8514-d3836da27247', '{"protein":10.7,"fat":0.9,"carbohydrate":74.6,"sodium":12,"unit":"per_100g"}', '1.0', '佛手玫苓膏', 'high', '2026-04-25T01:19:54.656Z');

-- 24. 金银花 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('1c92892a-9965-44bc-a6cf-fa40fdc7de8e', '金银花', 'JYH', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.656Z', '2026-04-25T01:19:54.656Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('71858187-f629-4069-a4b8-ac0cba8dc4ba', '1c92892a-9965-44bc-a6cf-fa40fdc7de8e', '{"protein":13.1,"fat":4.5,"carbohydrate":32.8,"sodium":null,"unit":"per_100g"}', '1.0', '沫彐淳膏', 'high', '2026-04-25T01:19:54.656Z');

-- 25. 莲子 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('9f853c45-a344-47bc-b579-56f3f6420560', '莲子', 'LZ', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.656Z', '2026-04-25T01:19:54.656Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('7cb60309-14ae-47f2-add2-6606c68aa0a7', '9f853c45-a344-47bc-b579-56f3f6420560', '{"protein":17.2,"fat":2,"carbohydrate":67.2,"sodium":5,"unit":"per_100g"}', '1.0', '酸枣仁灵芝石斛膏', 'high', '2026-04-25T01:19:54.656Z');

-- 26. 灵芝 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('1802738b-e872-454e-949e-78810cdbcaeb', '灵芝', 'LZ', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.656Z', '2026-04-25T01:19:54.656Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('5ddf08ca-ee83-49e8-bcbd-fa29306e656f', '1802738b-e872-454e-949e-78810cdbcaeb', '{"protein":88.8,"fat":2.2,"carbohydrate":4.7,"sodium":224,"unit":"per_100g"}', '1.0', '酸枣仁灵芝石斛膏', 'high', '2026-04-25T01:19:54.656Z');

-- 27. 沫彐淳膏 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('f5bddcd9-b6ff-47ae-9bb3-99536bbdc95e', '沫彐淳膏', 'ZMPR', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.656Z', '2026-04-25T01:19:54.656Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('7188ce69-4fdb-4ab9-977a-4b13db63475b', 'f5bddcd9-b6ff-47ae-9bb3-99536bbdc95e', '{"protein":null,"fat":null,"carbohydrate":null,"sodium":null,"unit":"per_100g"}', '1.0', '沫彐淳膏', 'high', '2026-04-25T01:19:54.656Z');

-- 28. 纳豆 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('f7218cdd-24e9-45c8-9d58-34652dfe7c04', '纳豆', 'NE', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.656Z', '2026-04-25T01:19:54.656Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('007a49bd-f132-42b1-b477-1fb10b9131cd', 'f7218cdd-24e9-45c8-9d58-34652dfe7c04', '{"protein":20.2,"fat":0.6,"carbohydrate":63.4,"sodium":2,"unit":"per_100g"}', '1.0', '沫彐淳膏', 'high', '2026-04-25T01:19:54.656Z');

-- 29. 平卧菊三七 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('6f3758ef-b6bf-43ad-8d2d-2a494e06bfc2', '平卧菊三七', 'ZFQJ', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.656Z', '2026-04-25T01:19:54.656Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('5fa2afcb-b49b-4487-bf4e-c4fc1e58f13f', '6f3758ef-b6bf-43ad-8d2d-2a494e06bfc2', '{"protein":6.8,"fat":3.9,"carbohydrate":67.6,"sodium":17.5,"unit":"per_100g"}', '1.0', '沫彐淳膏', 'high', '2026-04-25T01:19:54.656Z');

-- 30. 芡实 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('f7f08752-d17e-4732-9dae-a429edb61668', '芡实', 'QS', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.656Z', '2026-04-25T01:19:54.656Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('478062fb-1647-498c-8005-a097e55a8e7b', 'f7f08752-d17e-4732-9dae-a429edb61668', '{"protein":8.3,"fat":0.3,"carbohydrate":79.6,"sodium":28,"unit":"per_100g"}', '1.0', '酸枣仁灵芝石斛膏', 'high', '2026-04-25T01:19:54.656Z');

-- 31. 肉豆蔻 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('047479ad-b178-4b4b-862a-7728874c2dbd', '肉豆蔻', 'PEV', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.656Z', '2026-04-25T01:19:54.656Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('03d832c6-dee9-4f99-acda-461e7a161a3f', '047479ad-b178-4b4b-862a-7728874c2dbd', '{"protein":8.1,"fat":35.2,"carbohydrate":43.3,"sodium":26,"unit":"per_100g"}', '1.0', '正阳御湿膏', 'high', '2026-04-25T01:19:54.656Z');

-- 32. 肉桂 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('8fb861f0-66b5-4ec7-b74c-082b6f48f3d4', '肉桂', 'PO', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.657Z', '2026-04-25T01:19:54.657Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('8b9f2913-0abd-45ce-be48-0ba7366d32c1', '8fb861f0-66b5-4ec7-b74c-082b6f48f3d4', '{"protein":4,"fat":1.9,"carbohydrate":36.6,"sodium":15,"unit":"per_100g"}', '1.0', '正阳御湿膏', 'high', '2026-04-25T01:19:54.657Z');

-- 33. 桑椹 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('b051002a-ed63-410b-ad93-8ce5fbe7784e', '桑椹', 'DB', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.657Z', '2026-04-25T01:19:54.657Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('a3fd2498-cdc2-441c-889e-c61e52e169ef', 'b051002a-ed63-410b-ad93-8ce5fbe7784e', '{"protein":1.7,"fat":0.4,"carbohydrate":13.8,"sodium":2,"unit":"per_100g"}', '1.0', '酸枣仁灵芝石斛膏', 'high', '2026-04-25T01:19:54.657Z');

-- 34. 沙棘 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('19f2c241-7027-45dd-ba6b-43d4b653457f', '沙棘', 'HI', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.657Z', '2026-04-25T01:19:54.657Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('075fef2f-f343-4615-8a54-4b5d8497967d', '19f2c241-7027-45dd-ba6b-43d4b653457f', '{"protein":0.9,"fat":1.8,"carbohydrate":25.5,"sodium":28,"unit":"per_100g"}', '1.0', '沫彐淳膏', 'high', '2026-04-25T01:19:54.657Z');

-- 35. 山药 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('c27dea5f-e73a-473c-b24e-d8eb155557fd', '山药', 'SY', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.657Z', '2026-04-25T01:19:54.657Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('04320517-6898-4bca-b774-a3ae164dc820', 'c27dea5f-e73a-473c-b24e-d8eb155557fd', '{"protein":9.4,"fat":1,"carbohydrate":70.8,"sodium":104,"unit":"per_100g"}', '1.0', '佛手玫苓膏', 'high', '2026-04-25T01:19:54.657Z');

-- 36. 使用说明： (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('d655cfe7-bbdf-4c94-8dd3-fc4f59785288', '使用说明：', 'TOAW', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.657Z', '2026-04-25T01:19:54.657Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('3fc23a71-a2f7-4f10-9a3a-2cd40087e077', 'd655cfe7-bbdf-4c94-8dd3-fc4f59785288', '{"protein":null,"fat":null,"carbohydrate":null,"sodium":null,"unit":"per_100g"}', '1.0', '酸枣仁灵芝石斛膏', 'high', '2026-04-25T01:19:54.657Z');

-- 37. 酸枣仁 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('a80c55a9-8c54-43f9-8506-56d0eaf4f57a', '酸枣仁', 'SZR', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.657Z', '2026-04-25T01:19:54.657Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('0403e833-7f34-44c3-bd19-950c0efa7e57', 'a80c55a9-8c54-43f9-8506-56d0eaf4f57a', '{"protein":31.8,"fat":25.7,"carbohydrate":null,"sodium":null,"unit":"per_100g"}', '1.0', '酸枣仁灵芝石斛膏', 'high', '2026-04-25T01:19:54.657Z');

-- 38. 酸枣仁灵芝石斛膏 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('ef9bd758-9b33-4a85-94ba-c3787b951e79', '酸枣仁灵芝石斛膏', 'ILLH', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.657Z', '2026-04-25T01:19:54.657Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('e1674fcc-c932-4fa5-9eb3-e94df482cd1e', 'ef9bd758-9b33-4a85-94ba-c3787b951e79', '{"protein":null,"fat":null,"carbohydrate":null,"sodium":null,"unit":"per_100g"}', '1.0', '酸枣仁灵芝石斛膏', 'high', '2026-04-25T01:19:54.657Z');

-- 39. 桃仁 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('a8261cbb-7580-425a-bf40-323dfaba187b', '桃仁', 'TR', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.657Z', '2026-04-25T01:19:54.657Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('4222e47e-9bd7-4160-942f-8d34125939d4', 'a8261cbb-7580-425a-bf40-323dfaba187b', '{"protein":7.4,"fat":0.8,"carbohydrate":77.9,"sodium":3.8,"unit":"per_100g"}', '1.0', '沫彐淳膏', 'high', '2026-04-25T01:19:54.657Z');

-- 40. 铁皮石斛 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('a07636cf-999b-46da-a776-ec11de8bbe79', '铁皮石斛', 'ROBL', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.657Z', '2026-04-25T01:19:54.657Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('fe771b30-f9d5-4dca-bd44-02b0a7a5daa8', 'a07636cf-999b-46da-a776-ec11de8bbe79', '{"protein":1.6,"fat":2,"carbohydrate":9.5,"sodium":null,"unit":"per_100g"}', '1.0', '酸枣仁灵芝石斛膏', 'high', '2026-04-25T01:19:54.657Z');

-- 41. 乌梅 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('808270c3-ebe9-4c9f-9e71-b98f5506e490', '乌梅', 'YD', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.657Z', '2026-04-25T01:19:54.657Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('ef6d3b90-4b27-4026-80e6-58e1b62fbf2a', '808270c3-ebe9-4c9f-9e71-b98f5506e490', '{"protein":6.8,"fat":2.3,"carbohydrate":76.6,"sodium":19,"unit":"per_100g"}', '1.0', '酸枣仁灵芝石斛膏', 'high', '2026-04-25T01:19:54.657Z');

-- 42. 西红花 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('4a2b1762-7be3-456a-b0fe-3b644b065b02', '西红花', 'VWV', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.657Z', '2026-04-25T01:19:54.657Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('75fa4b5b-30f3-4eb3-9559-1c4aa077ba6f', '4a2b1762-7be3-456a-b0fe-3b644b065b02', '{"protein":11.4,"fat":5.9,"carbohydrate":65.4,"sodium":null,"unit":"per_100g"}', '1.0', '沫彐淳膏', 'high', '2026-04-25T01:19:54.657Z');

-- 43. 显脉旋覆花 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('d8d832ac-ac12-4150-8901-00d3b9c2bb1f', '显脉旋覆花', 'SNHC', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.657Z', '2026-04-25T01:19:54.657Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('b683b75e-87f7-4428-b03f-d2a82fdfb4c3', 'd8d832ac-ac12-4150-8901-00d3b9c2bb1f', '{"protein":5.5,"fat":1.8,"carbohydrate":62,"sodium":null,"unit":"per_100g"}', '1.0', '沫彐淳膏', 'high', '2026-04-25T01:19:54.657Z');

-- 44. 香橼 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('1ebed193-8129-4fce-a3c5-ce7e3ad8940d', '香橼', 'JM', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.657Z', '2026-04-25T01:19:54.657Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('3267c90a-f757-4cdb-92b4-ec49ff63b92d', '1ebed193-8129-4fce-a3c5-ce7e3ad8940d', '{"protein":6.9,"fat":0.9,"carbohydrate":29.5,"sodium":null,"unit":"per_100g"}', '1.0', '正阳御湿膏', 'high', '2026-04-25T01:19:54.657Z');

-- 45. 项目 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('4387c8cf-1387-4d46-8426-7c46628314d1', '项目', 'HA', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.657Z', '2026-04-25T01:19:54.657Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('c50afbd3-1197-4200-b0fc-19f1c101b86f', '4387c8cf-1387-4d46-8426-7c46628314d1', '{"protein":null,"fat":null,"carbohydrate":null,"sodium":null,"unit":"per_100g"}', '1.0', '酸枣仁灵芝石斛膏', 'high', '2026-04-25T01:19:54.657Z');

-- 46. 小茴香 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('f02f892b-594e-4aa9-9897-46106c1ee2ab', '小茴香', 'LWJ', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.657Z', '2026-04-25T01:19:54.657Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('584597bc-6b7a-4faa-a85c-0fe22cc4ffa5', 'f02f892b-594e-4aa9-9897-46106c1ee2ab', '{"protein":2.5,"fat":0.4,"carbohydrate":4.2,"sodium":null,"unit":"per_100g"}', '1.0', '正阳御湿膏', 'high', '2026-04-25T01:19:54.657Z');

-- 47. 小麦 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('0955b393-376b-48e8-bed6-3c15ba62b56b', '小麦', 'LC', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.657Z', '2026-04-25T01:19:54.657Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('f47d451f-0228-4364-bbb3-402f8c567515', '0955b393-376b-48e8-bed6-3c15ba62b56b', '{"protein":11.9,"fat":1.3,"carbohydrate":75.2,"sodium":7,"unit":"per_100g"}', '1.0', '酸枣仁灵芝石斛膏', 'high', '2026-04-25T01:19:54.657Z');

-- 48. 正阳御湿膏 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('a17b87f8-18c5-4158-8ecf-6d00e1ac7aab', '正阳御湿膏', 'JXPZ', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.657Z', '2026-04-25T01:19:54.657Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('9e931017-44b5-4955-89c6-889178dba83a', 'a17b87f8-18c5-4158-8ecf-6d00e1ac7aab', '{"protein":null,"fat":null,"carbohydrate":null,"sodium":null,"unit":"per_100g"}', '1.0', '正阳御湿膏', 'high', '2026-04-25T01:19:54.657Z');

-- 49. 栀子 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('7af62f84-8002-400d-b165-82fa84cd247b', '栀子', 'AC', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.657Z', '2026-04-25T01:19:54.657Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('d394fa5d-613b-4921-8068-579f67583568', '7af62f84-8002-400d-b165-82fa84cd247b', '{"protein":2.9,"fat":0.4,"carbohydrate":5.6,"sodium":5,"unit":"per_100g"}', '1.0', '沫彐淳膏', 'high', '2026-04-25T01:19:54.657Z');

-- 50. 重瓣红玫瑰 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('cf6a560c-ff16-4e75-8bc1-c6b6d48853e5', '重瓣红玫瑰', 'PXWX', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.657Z', '2026-04-25T01:19:54.657Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('37b2eece-7aa6-4b79-8a37-3998274ee3cc', 'cf6a560c-ff16-4e75-8bc1-c6b6d48853e5', '{"protein":8.5,"fat":4.7,"carbohydrate":68,"sodium":null,"unit":"per_100g"}', '1.0', '沫彐淳膏', 'high', '2026-04-25T01:19:54.657Z');

-- 51. 重瓣玫瑰花 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('84dc838a-4663-4e68-93dc-30a2e26278cd', '重瓣玫瑰花', 'PXXM', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.657Z', '2026-04-25T01:19:54.657Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('3eadba38-77d0-49e9-9b4c-fe7b174139b3', '84dc838a-4663-4e68-93dc-30a2e26278cd', '{"protein":8.5,"fat":4.7,"carbohydrate":68,"sodium":null,"unit":"per_100g"}', '1.0', '佛手玫苓膏', 'high', '2026-04-25T01:19:54.657Z');

-- 52. 竹叶黄酮 (supplement)
INSERT INTO materials (id, name, code, unit, stock, material_type, created_by, created_at, updated_at)
VALUES ('ae9cc2ae-7190-4903-97ca-d6d62c89120b', '竹叶黄酮', 'VSGY', 'g', 0, 'supplement', 'admin', '2026-04-25T01:19:54.657Z', '2026-04-25T01:19:54.657Z');

INSERT INTO material_nutrition (nutrition_id, material_id, per_100g_json, data_version, data_source, confidence, last_updated)
VALUES ('3154fafc-b8bf-4153-98ec-a0b3be39aeca', 'ae9cc2ae-7190-4903-97ca-d6d62c89120b', '{"protein":null,"fat":null,"carbohydrate":null,"sodium":null,"unit":"per_100g"}', '1.0', '沫彐淳膏', 'high', '2026-04-25T01:19:54.657Z');

COMMIT;

-- 导入完成统计
SELECT COUNT(*) AS '原料总数' FROM materials;
SELECT COUNT(*) AS '营养数据总数' FROM material_nutrition;
SELECT 
  material_type AS '类型',
  COUNT(*) AS '数量'
FROM materials 
GROUP BY material_type;
