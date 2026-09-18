package com.devpath.api.job.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.devpath.api.job.dto.JobActivityProfileResponse;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.repository.CourseNodeMappingRepository;
import com.devpath.domain.learning.entity.proof.ProofCard;
import com.devpath.domain.learning.entity.proof.ProofCardStatus;
import com.devpath.domain.learning.entity.proof.ProofCardTag;
import com.devpath.domain.learning.entity.proof.SkillEvidenceType;
import com.devpath.domain.learning.repository.proof.ProofCardRepository;
import com.devpath.domain.learning.repository.proof.ProofCardTagRepository;
import com.devpath.domain.learning.service.NodeScoreCollector;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.user.entity.Tag;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.workspace.repository.WorkspaceMemberRepository;
import com.devpath.domain.workspace.repository.WorkspaceRepository;
import com.devpath.domain.workspace.repository.WorkspaceTaskRepository;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class JobActivityProfileServiceTest {

  private static final Long USER_ID = 7L;

  @Mock private WorkspaceMemberRepository workspaceMemberRepository;
  @Mock private WorkspaceRepository workspaceRepository;
  @Mock private WorkspaceTaskRepository workspaceTaskRepository;
  @Mock private ProofCardRepository proofCardRepository;
  @Mock private ProofCardTagRepository proofCardTagRepository;
  @Mock private NodeScoreCollector nodeScoreCollector;
  @Mock private CourseNodeMappingRepository courseNodeMappingRepository;
  @Mock private UserRepository userRepository;
  @InjectMocks private JobActivityProfileService jobActivityProfileService;

  @Test
  void skillKeywordsCarryProofCardEvidenceAndAreRankedByIt() {
    ProofCard courseCard = proofCardWithCourse(11L, 81L);
    ProofCard nodeCard = proofCardWithNode(12L, 55L);
    givenActivity(List.of(courseCard, nodeCard));
    List<ProofCardTag> tags =
        List.of(
            proofCardTag(courseCard, "Spring Boot", SkillEvidenceType.VERIFIED),
            proofCardTag(nodeCard, "Redis", SkillEvidenceType.HELD));
    when(proofCardTagRepository.findAllByProofCardIdInOrderByProofCardIdAscIdAsc(anyList()))
        .thenReturn(tags);
    // 강의 수료 카드는 강의에 매핑된 노드의 성적으로 채점한다.
    when(courseNodeMappingRepository.findNodeIdsByCourseId(81L)).thenReturn(List.of(1080L));
    when(nodeScoreCollector.collectScores(eq(List.of(1080L)), eq(USER_ID)))
        .thenReturn(List.of(BigDecimal.valueOf(88), BigDecimal.valueOf(92)));

    JobActivityProfileResponse.Summary summary =
        jobActivityProfileService.getMyActivityProfile(USER_ID);

    assertThat(summary.skillKeywords())
        .extracting(
            JobActivityProfileResponse.SkillKeywordDetail::name,
            JobActivityProfileResponse.SkillKeywordDetail::verified,
            JobActivityProfileResponse.SkillKeywordDetail::proofCardCount,
            JobActivityProfileResponse.SkillKeywordDetail::scorePercent,
            JobActivityProfileResponse.SkillKeywordDetail::source)
        .containsExactly(
            org.assertj.core.groups.Tuple.tuple("Spring Boot", true, 1, 90, "PROOF_CARD"),
            org.assertj.core.groups.Tuple.tuple("Redis", false, 1, null, "PROOF_CARD"));
    assertThat(summary.skillSignals()).containsExactly("Spring Boot", "Redis");
  }

  @Test
  void verifiedKeywordWithoutScoreStillOutranksUnverifiedOne() {
    ProofCard verifiedCard = proofCardWithNode(21L, 61L);
    ProofCard heldCard = proofCardWithNode(22L, 62L);
    givenActivity(List.of(verifiedCard, heldCard));
    List<ProofCardTag> tags =
        List.of(
            proofCardTag(heldCard, "Docker", SkillEvidenceType.HELD),
            proofCardTag(verifiedCard, "Kafka", SkillEvidenceType.VERIFIED));
    when(proofCardTagRepository.findAllByProofCardIdInOrderByProofCardIdAscIdAsc(anyList()))
        .thenReturn(tags);

    JobActivityProfileResponse.Summary summary =
        jobActivityProfileService.getMyActivityProfile(USER_ID);

    assertThat(summary.skillSignals()).containsExactly("Kafka", "Docker");
    assertThat(summary.skillKeywords().get(0).scorePercent()).isNull();
  }

  @Test
  void emptyActivityProducesNoKeywords() {
    givenActivity(List.of());

    JobActivityProfileResponse.Summary summary =
        jobActivityProfileService.getMyActivityProfile(USER_ID);

    assertThat(summary.skillKeywords()).isEmpty();
    assertThat(summary.skillSignals()).isEmpty();
  }

  private void givenActivity(List<ProofCard> proofCards) {
    when(userRepository.existsById(USER_ID)).thenReturn(true);
    when(workspaceMemberRepository.findAllByLearnerId(USER_ID)).thenReturn(List.of());
    when(proofCardRepository.findAllByUserIdAndStatusOrderByIssuedAtDesc(
            USER_ID, ProofCardStatus.ISSUED))
        .thenReturn(proofCards);
    when(proofCardTagRepository.findAllByProofCardIdInOrderByProofCardIdAscIdAsc(anyList()))
        .thenReturn(List.of());
  }

  private ProofCard proofCardWithCourse(Long proofCardId, Long courseId) {
    ProofCard proofCard = mock(ProofCard.class);
    Course course = mock(Course.class);
    when(proofCard.getId()).thenReturn(proofCardId);
    when(proofCard.getCourse()).thenReturn(course);
    when(course.getCourseId()).thenReturn(courseId);
    return proofCard;
  }

  private ProofCard proofCardWithNode(Long proofCardId, Long nodeId) {
    ProofCard proofCard = mock(ProofCard.class);
    RoadmapNode node = mock(RoadmapNode.class);
    when(proofCard.getId()).thenReturn(proofCardId);
    when(proofCard.getNode()).thenReturn(node);
    when(node.getNodeId()).thenReturn(nodeId);
    return proofCard;
  }

  private ProofCardTag proofCardTag(
      ProofCard proofCard, String tagName, SkillEvidenceType evidenceType) {
    ProofCardTag proofCardTag = mock(ProofCardTag.class);
    Tag tag = mock(Tag.class);
    when(proofCardTag.getProofCard()).thenReturn(proofCard);
    when(proofCardTag.getTag()).thenReturn(tag);
    when(proofCardTag.getEvidenceType()).thenReturn(evidenceType);
    when(tag.getName()).thenReturn(tagName);
    return proofCardTag;
  }
}
