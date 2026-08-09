package com.devpath.api.workspace.service;

import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Base64;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Component;

@Component
class WorkspaceInviteTokenCodec {

  private static final String SIGNATURE_SECRET = "DevPathWorkspaceInviteV1";

  String encode(Long workspaceId, LocalDateTime expiresAt) {
    long expiresAtEpochSeconds = expiresAt.toEpochSecond(ZoneOffset.UTC);
    String payload = workspaceId + "." + expiresAtEpochSeconds;
    return payload + "." + sign(payload);
  }

  Payload decode(String token) {
    if (token == null || token.isBlank()) {
      throw new CustomException(ErrorCode.INVALID_INPUT_VALUE);
    }

    String[] parts = token.split("\\.");
    if (parts.length != 3) {
      throw new CustomException(ErrorCode.INVALID_INPUT_VALUE);
    }

    String payload = parts[0] + "." + parts[1];
    String expectedSignature = sign(payload);
    if (!MessageDigest.isEqual(
        expectedSignature.getBytes(StandardCharsets.UTF_8),
        parts[2].getBytes(StandardCharsets.UTF_8))) {
      throw new CustomException(ErrorCode.INVALID_INPUT_VALUE);
    }

    try {
      long workspaceId = Long.parseLong(parts[0]);
      long expiresAtEpochSeconds = Long.parseLong(parts[1]);
      return new Payload(
          workspaceId, LocalDateTime.ofEpochSecond(expiresAtEpochSeconds, 0, ZoneOffset.UTC));
    } catch (NumberFormatException exception) {
      throw new CustomException(ErrorCode.INVALID_INPUT_VALUE);
    }
  }

  private String sign(String payload) {
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(SIGNATURE_SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
      return Base64.getUrlEncoder()
          .withoutPadding()
          .encodeToString(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
    } catch (NoSuchAlgorithmException | InvalidKeyException exception) {
      throw new IllegalStateException("Workspace invite signing is unavailable.", exception);
    }
  }

  record Payload(Long workspaceId, LocalDateTime expiresAt) {}
}
