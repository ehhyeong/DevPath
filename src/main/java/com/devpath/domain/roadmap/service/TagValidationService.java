package com.devpath.domain.roadmap.service;

import java.util.Collection;
import java.util.HashSet;
import java.util.Set;
import org.springframework.stereotype.Service;

/** 태그 검증 순수 로직 서비스 - DB 접근 없이 순수 자바 로직으로만 태그 검증 수행 - 다른 서비스에서 DI로 주입받아 사용 가능 */
@Service
public class TagValidationService {

  /**
   * 유저가 보유한 태그가 요구 태그를 100% 충족하는지 검증
   *
   * @param requiredTags 노드가 요구하는 필수 태그 목록
   * @param userTags 유저가 보유한 태그 목록
   * @return 요구 태그를 모두 보유하면 true, 하나라도 부족하면 false
   */
  public boolean validateTags(Collection<String> requiredTags, Collection<String> userTags) {
    // 요구 태그가 없으면 무조건 통과
    if (requiredTags == null || requiredTags.isEmpty()) {
      return true;
    }

    // 유저 태그가 없으면 무조건 실패
    if (userTags == null || userTags.isEmpty()) {
      return false;
    }

    // Set으로 변환하여 O(1) 조회 성능 확보
    Set<String> userTagSet = new HashSet<>(userTags);

    // 요구 태그가 모두 유저 태그에 포함되어 있는지 확인
    for (String requiredTag : requiredTags) {
      if (!userTagSet.contains(requiredTag)) {
        return false; // 하나라도 부족하면 실패
      }
    }

    return true; // 모든 요구 태그를 보유하면 성공
  }

  /**
   * 부족한 태그 목록 반환 (선택적 기능)
   *
   * @param requiredTags 노드가 요구하는 필수 태그 목록
   * @param userTags 유저가 보유한 태그 목록
   * @return 부족한 태그 목록
   */
  public Set<String> getMissingTags(Collection<String> requiredTags, Collection<String> userTags) {
    Set<String> missingTags = new HashSet<>();

    if (requiredTags == null || requiredTags.isEmpty()) {
      return missingTags;
    }

    Set<String> userTagSet = userTags == null ? new HashSet<>() : new HashSet<>(userTags);

    for (String requiredTag : requiredTags) {
      if (!userTagSet.contains(requiredTag)) {
        missingTags.add(requiredTag);
      }
    }

    return missingTags;
  }
}
