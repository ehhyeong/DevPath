package com.devpath.bootstrap.seed;

import com.devpath.domain.mentoring.entity.MentoringPost;
import com.devpath.domain.mentoring.repository.MentoringPostRepository;
import com.devpath.domain.user.entity.AccountStatus;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserProfile;
import com.devpath.domain.user.entity.UserRole;
import com.devpath.domain.user.repository.UserProfileRepository;
import com.devpath.domain.user.repository.UserRepository;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Profile({"local", "dev"})
@Order(Ordered.HIGHEST_PRECEDENCE + 3)
@RequiredArgsConstructor
public class LocalMentoringHubSeedInitializer implements CommandLineRunner {

  private static final String SEED_PASSWORD = "devpath1234";

  private final UserRepository userRepository;
  private final UserProfileRepository userProfileRepository;
  private final MentoringPostRepository mentoringPostRepository;
  private final PasswordEncoder passwordEncoder;
  private final LocalSeedSqlExecutor seedSqlExecutor;

  @Override
  @Transactional
  public void run(String... args) {
    List<PostSeed> seeds = mentoringSeeds();
    seeds.forEach(seed -> ensureProfile(ensureMentor(seed.mentor()), seed.mentor()));
    seeds.forEach(this::ensurePost);
  }

  private User ensureMentor(MentorSeed seed) {
    return userRepository
        .findByEmail(seed.email())
        .map(user -> restoreMentor(user, seed))
        .orElseGet(() -> createMentor(seed));
  }

  private User createMentor(MentorSeed seed) {
    return userRepository.save(
        User.builder()
            .email(seed.email())
            .password(passwordEncoder.encode(SEED_PASSWORD))
            .name(seed.name())
            .role(UserRole.ROLE_INSTRUCTOR)
            .build());
  }

  private User restoreMentor(User user, MentorSeed seed) {
    if (!seed.name().equals(user.getName())) {
      user.updateName(seed.name());
    }
    if (!passwordEncoder.matches(SEED_PASSWORD, user.getPassword())) {
      user.changePassword(passwordEncoder.encode(SEED_PASSWORD));
    }
    if (!Boolean.TRUE.equals(user.getIsActive())
        || user.getAccountStatus() != AccountStatus.ACTIVE) {
      user.restore();
    }
    return user;
  }

  private void ensureProfile(User user, MentorSeed seed) {
    UserProfile profile =
        userProfileRepository
            .findByUserId(user.getId())
            .orElseGet(
                () ->
                    UserProfile.builder()
                        .user(user)
                        .profileImage(seed.profileImage())
                        .channelName(seed.name())
                        .bio(seed.bio())
                        .channelDescription(seed.bio())
                        .isPublic(true)
                        .build());

    profile.updateChannelProfile(seed.bio(), seed.profileImage(), null, null);
    profile.updateChannelInfo(seed.name(), seed.bio());
    userProfileRepository.save(profile);
  }

  private MentoringPost ensurePost(PostSeed seed) {
    User mentor = ensureMentor(seed.mentor());
    MentoringPost post =
        mentoringPostRepository
            .findByTitleAndIsDeletedFalse(seed.title())
            .orElseGet(
                () ->
                    MentoringPost.builder()
                        .mentor(mentor)
                        .title(seed.title())
                        .content(seed.content())
                        .requiredStacks(seed.requiredStacks())
                        .category(seed.category())
                        .mentoringType(seed.mentoringType())
                        .durationWeeks(seed.durationWeeks())
                        .curriculum(seed.curriculum())
                        .deadlineAt(seed.deadlineAt())
                        .currentParticipants(seed.currentParticipants())
                        .maxParticipants(seed.maxParticipants())
                        .build());

    post.update(seed.title(), seed.content(), seed.requiredStacks(), seed.maxParticipants());
    post.updateHubFields(
        seed.category(),
        seed.mentoringType(),
        seed.durationWeeks(),
        seed.curriculum(),
        seed.deadlineAt(),
        seed.currentParticipants());

    if (seed.closed()) {
      post.close();
    } else {
      post.reopen();
    }

    mentoringPostRepository.save(post);
    return post;
  }

  private List<PostSeed> mentoringSeeds() {
    return seedSqlExecutor.query(
        "db/local/mentoring-hub-seeds.sql",
        (resultSet, rowNumber) ->
            new PostSeed(
                new MentorSeed(
                    resultSet.getString("mentor_email"),
                    resultSet.getString("mentor_name"),
                    resultSet.getString("mentor_bio"),
                    resultSet.getString("mentor_profile_image")),
                resultSet.getString("title"),
                resultSet.getString("content"),
                resultSet.getString("category"),
                resultSet.getString("mentoring_type"),
                resultSet.getString("required_stacks"),
                resultSet.getString("curriculum"),
                resultSet.getObject("deadline_at", LocalDate.class),
                resultSet.getObject("duration_weeks", Integer.class),
                resultSet.getObject("current_participants", Integer.class),
                resultSet.getObject("max_participants", Integer.class),
                resultSet.getBoolean("closed")));
  }

  private record MentorSeed(String email, String name, String bio, String profileImage) {}

  private record PostSeed(
      MentorSeed mentor,
      String title,
      String content,
      String category,
      String mentoringType,
      String requiredStacks,
      String curriculum,
      LocalDate deadlineAt,
      Integer durationWeeks,
      Integer currentParticipants,
      Integer maxParticipants,
      boolean closed) {}
}
