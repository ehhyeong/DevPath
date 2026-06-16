package com.devpath.api.application.service;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.devpath.api.application.dto.LoungeApplicationRequest;
import com.devpath.api.notification.service.NotificationEventService;
import com.devpath.domain.application.entity.LoungeApplication;
import com.devpath.domain.application.entity.LoungeApplicationType;
import com.devpath.domain.application.repository.LoungeApplicationRepository;
import com.devpath.domain.squad.entity.Squad;
import com.devpath.domain.squad.entity.SquadMember;
import com.devpath.domain.squad.entity.SquadRole;
import com.devpath.domain.squad.repository.SquadMemberRepository;
import com.devpath.domain.squad.repository.SquadRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserProfileRepository;
import com.devpath.domain.user.repository.UserRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class LoungeApplicationServiceTest {

  @Mock private LoungeApplicationRepository loungeApplicationRepository;
  @Mock private UserRepository userRepository;
  @Mock private UserProfileRepository userProfileRepository;
  @Mock private NotificationEventService notificationEventService;
  @Mock private SquadRepository squadRepository;
  @Mock private SquadMemberRepository squadMemberRepository;

  private LoungeApplicationService service;

  @BeforeEach
  void setUp() {
    service =
        new LoungeApplicationService(
            loungeApplicationRepository,
            userRepository,
            userProfileRepository,
            notificationEventService,
            squadRepository,
            squadMemberRepository);
  }

  @Test
  void approveSquadApplicationAddsSenderAsSquadMember() {
    User applicant = user(2L, "applicant@example.com", "Applicant");
    User leader = user(1L, "leader@example.com", "Leader");
    Squad squad = squad(10L);
    LoungeApplication application =
        LoungeApplication.builder()
            .sender(applicant)
            .receiver(leader)
            .type(LoungeApplicationType.SQUAD_APPLICATION)
            .targetId(squad.getId())
            .targetTitle("Dev Squad")
            .title("참여 신청")
            .content("참여하고 싶습니다.")
            .build();

    when(loungeApplicationRepository.findByIdAndIsDeletedFalse(100L))
        .thenReturn(Optional.of(application));
    when(squadRepository.findByIdAndIsDeletedFalse(squad.getId())).thenReturn(Optional.of(squad));
    when(squadMemberRepository.existsBySquadAndUser(squad, applicant)).thenReturn(false);
    when(userProfileRepository.findAllByUserIdIn(any())).thenReturn(List.of());

    service.approve(100L, leader.getId(), new LoungeApplicationRequest.Approve(null));

    ArgumentCaptor<SquadMember> memberCaptor = ArgumentCaptor.forClass(SquadMember.class);
    verify(squadMemberRepository).save(memberCaptor.capture());
    SquadMember savedMember = memberCaptor.getValue();
    org.assertj.core.api.Assertions.assertThat(savedMember.getSquad()).isEqualTo(squad);
    org.assertj.core.api.Assertions.assertThat(savedMember.getUser()).isEqualTo(applicant);
    org.assertj.core.api.Assertions.assertThat(savedMember.getRole()).isEqualTo(SquadRole.MEMBER);
  }

  private User user(Long id, String email, String name) {
    User user = User.builder().email(email).password("encoded").name(name).build();
    ReflectionTestUtils.setField(user, "id", id);
    return user;
  }

  private Squad squad(Long id) {
    Squad squad = Squad.builder().name("Dev Squad").description("Build together").build();
    ReflectionTestUtils.setField(squad, "id", id);
    return squad;
  }
}
