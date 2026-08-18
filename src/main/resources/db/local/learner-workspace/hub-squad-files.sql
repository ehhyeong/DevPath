SELECT uploaded_by_owner, title, url
FROM (
    VALUES
        (1, TRUE, '서비스 IA 초안', 'https://www.figma.com/file/devpath-roadmap-ia'),
        (2, FALSE, '로드맵 학습 플로우 메모', 'https://www.notion.so/devpath-roadmap-flow')
) AS seed(sort_order, uploaded_by_owner, title, url)
ORDER BY sort_order;
