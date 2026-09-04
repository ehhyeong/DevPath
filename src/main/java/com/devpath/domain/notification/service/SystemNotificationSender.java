package com.devpath.domain.notification.service;

public interface SystemNotificationSender {

  void sendSystemNotification(Long receiverId, String message);
}
