package com.devpath.domain.roadmap.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("태그 검증 서비스 테스트")
class TagValidationServiceTest {

  private TagValidationService tagValidationService;

  @BeforeEach
  void setUp() {
    tagValidationService = new TagValidationService();
  }

  @Test
  @DisplayName("성공 케이스: 요구 태그(Java, Spring) / 보유 태그(Java, Spring, Docker) → true")
  void validateTags_Success_WhenUserHasAllRequiredTags() {
    // given
    List<String> requiredTags = Arrays.asList("Java", "Spring");
    List<String> userTags = Arrays.asList("Java", "Spring", "Docker");

    // when
    boolean result = tagValidationService.validateTags(requiredTags, userTags);

    // then
    assertThat(result).isTrue();
  }

  @Test
  @DisplayName("실패 케이스: 요구 태그(Java, Spring) / 보유 태그(Java) → false")
  void validateTags_Fail_WhenUserMissingRequiredTag() {
    // given
    List<String> requiredTags = Arrays.asList("Java", "Spring");
    List<String> userTags = Arrays.asList("Java");

    // when
    boolean result = tagValidationService.validateTags(requiredTags, userTags);

    // then
    assertThat(result).isFalse();
  }

  @Test
  @DisplayName("성공 케이스: 요구 태그가 없으면 무조건 통과")
  void validateTags_Success_WhenNoRequiredTags() {
    // given
    List<String> requiredTags = Collections.emptyList();
    List<String> userTags = Arrays.asList("Java");

    // when
    boolean result = tagValidationService.validateTags(requiredTags, userTags);

    // then
    assertThat(result).isTrue();
  }

  @Test
  @DisplayName("실패 케이스: 보유 태그가 없으면 실패")
  void validateTags_Fail_WhenUserHasNoTags() {
    // given
    List<String> requiredTags = Arrays.asList("Java", "Spring");
    List<String> userTags = Collections.emptyList();

    // when
    boolean result = tagValidationService.validateTags(requiredTags, userTags);

    // then
    assertThat(result).isFalse();
  }

  @Test
  @DisplayName("성공 케이스: 요구 태그와 보유 태그가 정확히 일치")
  void validateTags_Success_WhenExactMatch() {
    // given
    List<String> requiredTags = Arrays.asList("Java", "Spring", "MySQL");
    List<String> userTags = Arrays.asList("Java", "Spring", "MySQL");

    // when
    boolean result = tagValidationService.validateTags(requiredTags, userTags);

    // then
    assertThat(result).isTrue();
  }

  @Test
  @DisplayName("부족한 태그 조회: Spring이 부족함")
  void getMissingTags_ReturnsSpring_WhenUserOnlyHasJava() {
    // given
    List<String> requiredTags = Arrays.asList("Java", "Spring");
    List<String> userTags = Arrays.asList("Java");

    // when
    Set<String> missingTags = tagValidationService.getMissingTags(requiredTags, userTags);

    // then
    assertThat(missingTags).containsExactly("Spring");
  }

  @Test
  @DisplayName("부족한 태그 조회: 부족한 태그가 없으면 빈 Set 반환")
  void getMissingTags_ReturnsEmpty_WhenUserHasAllTags() {
    // given
    List<String> requiredTags = Arrays.asList("Java", "Spring");
    List<String> userTags = Arrays.asList("Java", "Spring", "Docker");

    // when
    Set<String> missingTags = tagValidationService.getMissingTags(requiredTags, userTags);

    // then
    assertThat(missingTags).isEmpty();
  }

  @Test
  @DisplayName("null 안전성: requiredTags가 null이어도 에러 없이 true 반환")
  void validateTags_Success_WhenRequiredTagsIsNull() {
    // given
    List<String> requiredTags = null;
    List<String> userTags = Arrays.asList("Java");

    // when
    boolean result = tagValidationService.validateTags(requiredTags, userTags);

    // then
    assertThat(result).isTrue();
  }

  @Test
  @DisplayName("null 안전성: userTags가 null이면 false 반환")
  void validateTags_Fail_WhenUserTagsIsNull() {
    // given
    List<String> requiredTags = Arrays.asList("Java", "Spring");
    List<String> userTags = null;

    // when
    boolean result = tagValidationService.validateTags(requiredTags, userTags);

    // then
    assertThat(result).isFalse();
  }
}
