INSERT INTO workspace_notice (
    workspace_id, title, content, is_deleted, created_at, updated_at
)
SELECT seed.workspace_id, seed.title, seed.content, FALSE, NOW(), NOW()
FROM (
    VALUES
        (1::bigint, '[필독] 워크스페이스 이용 규칙 안내', '우리 워크스페이스의 기본 이용 규칙입니다. 반드시 숙지해 주세요.'),
        (1::bigint, '이번 주 금요일 서버 정기 점검', '이번 주 금요일 밤 12시부터 새벽 2시까지 서버 점검이 진행됩니다.')
) AS seed(workspace_id, title, content)
WHERE NOT EXISTS (SELECT 1 FROM workspace_notice);

INSERT INTO external_integration (
    workspace_id, provider, is_active, connected_at, created_at, updated_at
)
SELECT seed.workspace_id, seed.provider, seed.is_active, seed.connected_at, NOW(), NOW()
FROM (
    VALUES
        (1::bigint, 'GITHUB', TRUE, NOW()),
        (1::bigint, 'SLACK', FALSE, NULL::timestamp)
) AS seed(workspace_id, provider, is_active, connected_at)
WHERE NOT EXISTS (SELECT 1 FROM external_integration);

INSERT INTO recommendation_settings (
    setting_key, setting_value, description, created_at, updated_at
)
SELECT seed.setting_key, seed.setting_value, seed.description, NOW(), NOW()
FROM (
    VALUES
        ('algorithm.weight.recent_activity', '0.8', '추천 알고리즘 - 최근 활동 가중치'),
        ('algorithm.weight.tag_match', '1.5', '추천 알고리즘 - 태그 일치도 가중치')
) AS seed(setting_key, setting_value, description)
WHERE NOT EXISTS (SELECT 1 FROM recommendation_settings);

INSERT INTO experiment_results (
    experiment_id, experiment_name, metrics_json, created_at
)
SELECT
    'EXP-2026-001',
    '홈 화면 추천 UI 변경 테스트',
    '{"variantA_ctr": 0.15, "variantB_ctr": 0.22}'::json,
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM experiment_results);
