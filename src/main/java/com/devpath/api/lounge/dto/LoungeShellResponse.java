package com.devpath.api.lounge.dto;

import com.devpath.domain.application.entity.LoungeApplication;
import com.devpath.domain.notification.entity.LearnerNotification;
import com.devpath.domain.notification.entity.LearnerNotificationType;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserProfile;
import java.time.LocalDateTime;
import java.util.List;

public class LoungeShellResponse {

  private LoungeShellResponse() {}

  public record Shell(
      CurrentUser user,
      List<NavItem> menu,
      List<MySquad> mySquads,
      List<MessageItem> messages,
      List<NotificationItem> notifications) {}

  public record CurrentUser(Long id, String name, String role, String profileImage, Boolean guest) {

    public static CurrentUser anonymous() {
      return new CurrentUser(null, "게스트", null, null, true);
    }

    public static CurrentUser from(User user, UserProfile profile) {
      return new CurrentUser(
          user.getId(),
          user.getName(),
          user.getRole().name(),
          profile == null ? null : profile.getDisplayProfileImage(),
          false);
    }
  }

  public record NavItem(String key, String href, String label, String icon, Boolean active) {}

  public record MySquad(Long id, String name, String colorClass, String href) {}

  public record MessageItem(
      Long id,
      String sender,
      Long senderId,
      String senderImage,
      String text,
      String dateText,
      Boolean read) {

    public static MessageItem from(LoungeApplication application, Long viewerId) {
      User counterpart =
          application.getSender().getId().equals(viewerId)
              ? application.getReceiver()
              : application.getSender();

      return new MessageItem(
          application.getId(),
          counterpart.getName(),
          counterpart.getId(),
          null,
          application.getContent(),
          TimeText.from(application.getCreatedAt()),
          application.getStatus() != null && !"PENDING".equals(application.getStatus().name()));
    }
  }

  public record NotificationItem(Long id, String type, String text, String dateText, Boolean read) {

    public static NotificationItem from(LearnerNotification notification) {
      LearnerNotificationType type = notification.getType();
      return new NotificationItem(
          notification.getId(),
          type == null ? "SYSTEM" : type.name(),
          notification.getMessage(),
          TimeText.from(notification.getCreatedAt()),
          Boolean.TRUE.equals(notification.getIsRead()));
    }
  }

  private static class TimeText {

    private static String from(LocalDateTime value) {
      if (value == null) {
        return "";
      }
      return value.toLocalDate().toString();
    }
  }
}
