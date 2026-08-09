WITH learner AS (
    SELECT user_id FROM users WHERE email = 'learner@devpath.com'
),
squad_workspace AS (
    SELECT workspace.id
    FROM workspace
    JOIN workspace_member member ON member.workspace_id = workspace.id
    JOIN learner ON learner.user_id = member.learner_id
    WHERE workspace.type = 'SQUAD'
      AND workspace.is_deleted = FALSE
    ORDER BY workspace.created_at
    LIMIT 1
),
seed AS (
    SELECT *
    FROM (
        VALUES
            (
              'feat: 카카오 소셜 로그인 OAuth2 연동 및 JWT 발급 추가',
              'OAuth 리다이렉트 이후 사용자 조회, 토큰 발급, 응답 DTO까지 머지 전에 확인합니다.',
              'src/main/java/com/devpath/auth/AuthService.java',
              'feature/auth-kakao',
              'main',
              E'    public AuthResponse login(LoginRequest request) {\\n        User user = userRepository.findByEmail(request.getEmail())\\n-           .orElseThrow(() -> new UserNotFoundException());\\n+           .orElseThrow(() -> new CustomApiException(ErrorCode.USER_NOT_FOUND));\\n+       // TODO: 카카오 액세스 토큰 검증 로직 추가\\n+       String jwtToken = jwtProvider.generateToken(user.getId(), user.getRole());\\n        return new AuthResponse(jwtToken);\\n    }',
              'OPEN',
              3,
              1,
              CURRENT_DATE + TIME '09:30'
            ),
            (
              'fix: 결제 승인 실패 시 주문 상태 롤백 처리',
              '결제 승인 API 실패 케이스에서 주문과 재고 상태가 일관되게 복구되는지 확인합니다.',
              'src/main/java/com/devpath/payment/PaymentService.java',
              'fix/payment-rollback',
              'main',
              E'+   if (!approvalResult.success()) {\\n+       order.cancel();\\n+       stockService.restore(order.getItems());\\n+       throw new CustomApiException(ErrorCode.INVALID_PAYMENT);\\n+   }',
              'OPEN',
              4,
              0,
              CURRENT_DATE + TIME '10:20'
            ),
            (
              'test: 불필요한 콘솔 로그 삭제 작업',
              '배포 전 디버깅 로그를 정리한 PR입니다.',
              'frontend/src/pages/payment/PaymentResult.tsx',
              'chore/remove-console',
              'main',
              E'- console.log(paymentResult);\\n+ logger.debug("payment result loaded");',
              'CLOSED',
              1,
              1,
              CURRENT_DATE - 5 + TIME '14:00'
            )
    ) AS seed_values(title, description, file_path, source_branch, target_branch, diff_text, status, additions, deletions, created_at)
)
INSERT INTO workspace_code_reviews (
    workspace_id, title, description, file_path, source_branch, target_branch,
    diff_text, author_id, status, additions, deletions, ai_code_review_id,
    is_deleted, created_at, updated_at
)
SELECT squad_workspace.id, seed.title, seed.description, seed.file_path, seed.source_branch,
       seed.target_branch, seed.diff_text, learner.user_id, seed.status,
       seed.additions, seed.deletions, NULL, FALSE, seed.created_at, seed.created_at
FROM squad_workspace
CROSS JOIN learner
CROSS JOIN seed
WHERE NOT EXISTS (
    SELECT 1
    FROM workspace_code_reviews existing
    WHERE existing.workspace_id = squad_workspace.id
      AND existing.title = seed.title
      AND existing.is_deleted = FALSE
);
