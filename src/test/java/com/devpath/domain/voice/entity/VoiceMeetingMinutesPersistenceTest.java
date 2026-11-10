package com.devpath.domain.voice.entity;

import static org.assertj.core.api.Assertions.assertThat;

import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.voice.repository.VoiceChannelRepository;
import com.devpath.domain.voice.repository.VoiceMeetingMinutesRepository;
import java.util.UUID;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

@SpringBootTest
@ActiveProfiles("test")
class VoiceMeetingMinutesPersistenceTest {
  @Autowired VoiceMeetingMinutesRepository minutes;
  @Autowired VoiceChannelRepository channels;
  @Autowired UserRepository users;
  @Autowired PlatformTransactionManager transactionManager;

  @ParameterizedTest
  @ValueSource(strings = {"recording", "summary"})
  void metadataUpdateDoesNotOverwriteTranscriptSavedAfterItWasRead(String field) {
    var transaction = new TransactionTemplate(transactionManager);
    transaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    Long[] ids =
        transaction.execute(
            status -> {
              var user =
                  users.saveAndFlush(
                      User.builder()
                          .email(UUID.randomUUID() + "@minutes.test")
                          .password("test")
                          .name("발언자")
                          .build());
              var channel =
                  channels.saveAndFlush(
                      VoiceChannel.builder()
                          .workspaceId(94001L)
                          .creator(user)
                          .name("기록 보존 검증")
                          .build());
              var note = VoiceMeetingMinutes.builder().channel(channel).updatedBy(user).build();
              note.update(user, true, "기존 기록", null);
              return new Long[] {minutes.saveAndFlush(note).getId(), channel.getId(), user.getId()};
            });
    try {
      transaction.executeWithoutResult(
          status -> {
            var stale = minutes.findById(ids[0]).orElseThrow();
            // 상태/요약 요청이 원문을 읽은 뒤 다른 참여자의 발화가 먼저 커밋되는 순서다.
            transaction.executeWithoutResult(
                other -> {
                  var fresh = minutes.findForUpdateByChannelId(ids[1]).orElseThrow();
                  fresh.appendTranscript(fresh.getUpdatedBy(), "새로 확정된 팀원 발화", 20000);
                  minutes.flush();
                });
            stale.update(
                stale.getUpdatedBy(),
                field.equals("recording") ? false : null,
                null,
                field.equals("summary") ? "회의 요약" : null);
            minutes.flush();
          });
      transaction.executeWithoutResult(
          status -> {
            var saved = minutes.findById(ids[0]).orElseThrow();
            assertThat(saved.getTranscript()).isEqualTo("기존 기록\n새로 확정된 팀원 발화");
            if (field.equals("recording")) assertThat(saved.getRecording()).isFalse();
            else assertThat(saved.getSummary()).isEqualTo("회의 요약");
          });
    } finally {
      transaction.executeWithoutResult(
          status -> {
            minutes.deleteById(ids[0]);
            minutes.flush();
            channels.deleteById(ids[1]);
            channels.flush();
            users.deleteById(ids[2]);
            users.flush();
          });
    }
  }
}
