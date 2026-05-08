package com.devpath.api.ai.provider;

import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class RuleBasedAiCodeReviewProvider implements AiCodeReviewProvider {

  @Override
  public String providerName() {
    return "RULE_BASED";
  }

  @Override
  public ReviewResult review(String diffText) {
    List<ReviewFinding> findings = new ArrayList<>();
    String[] lines = diffText.split("\\R");

    for (int index = 0; index < lines.length; index++) {
      String line = lines[index];
      int lineNumber = index + 1;

      detectDataAnnotation(line, lineNumber, findings);
      detectSetterAnnotation(line, lineNumber, findings);
      detectEagerLoading(line, lineNumber, findings);
      detectPasswordExposure(line, lineNumber, findings);
      detectTodoComment(line, lineNumber, findings);
    }

    if (findings.isEmpty()) {
      return new ReviewResult("컨벤션 위반 가능성이 감지되지 않았습니다.", findings);
    }

    return new ReviewResult("총 " + findings.size() + "개의 컨벤션 위반 가능성이 감지되었습니다.", findings);
  }

  private void detectDataAnnotation(String line, int lineNumber, List<ReviewFinding> findings) {
    if (!line.contains("@Data")) {
      return;
    }

    findings.add(
        new ReviewFinding(
            "LOMBOK_CONVENTION",
            lineNumber,
            "@Data 사용 감지",
            "@Data는 getter, setter, equals, hashCode, toString을 한 번에 생성해 Entity 순환 참조와 무분별한 상태 변경 위험을 만들 수 있습니다.",
            "@Getter, @NoArgsConstructor(access = AccessLevel.PROTECTED), @Builder 조합을 사용하세요."));
  }

  private void detectSetterAnnotation(String line, int lineNumber, List<ReviewFinding> findings) {
    if (!line.contains("@Setter")) {
      return;
    }

    findings.add(
        new ReviewFinding(
            "ENTITY_MUTABILITY",
            lineNumber,
            "@Setter 사용 감지",
            "무분별한 setter는 Entity 상태 변경 경로를 추적하기 어렵게 만듭니다.",
            "setter 대신 update(), approve(), reject() 같은 의미 있는 비즈니스 메서드를 작성하세요."));
  }

  private void detectEagerLoading(String line, int lineNumber, List<ReviewFinding> findings) {
    if (!line.contains("FetchType.EAGER")) {
      return;
    }

    findings.add(
        new ReviewFinding(
            "JPA_FETCH_STRATEGY",
            lineNumber,
            "EAGER 로딩 감지",
            "EAGER 로딩은 불필요한 조인과 N+1 문제를 유발할 수 있습니다.",
            "연관관계는 FetchType.LAZY를 명시하고 필요한 조회에서 @EntityGraph 또는 fetch join을 사용하세요."));
  }

  private void detectPasswordExposure(String line, int lineNumber, List<ReviewFinding> findings) {
    String lowerLine = line.toLowerCase();

    if (!lowerLine.contains("password")) {
      return;
    }

    findings.add(
        new ReviewFinding(
            "SECURITY_PASSWORD",
            lineNumber,
            "password 관련 코드 감지",
            "비밀번호 필드는 평문 저장, 응답 노출, 로그 출력 여부를 반드시 확인해야 합니다.",
            "비밀번호는 BCryptPasswordEncoder로 암호화하고 Response DTO에는 절대 포함하지 마세요."));
  }

  private void detectTodoComment(String line, int lineNumber, List<ReviewFinding> findings) {
    String upperLine = line.toUpperCase();

    if (!upperLine.contains("TODO") && !upperLine.contains("FIXME")) {
      return;
    }

    findings.add(
        new ReviewFinding(
            "MAINTAINABILITY",
            lineNumber,
            "TODO/FIXME 주석 감지",
            "TODO/FIXME가 남아 있으면 미완성 로직이 배포될 수 있습니다.",
            "PR 전에 TODO/FIXME를 이슈로 분리하거나 구현을 완료하세요."));
  }
}
