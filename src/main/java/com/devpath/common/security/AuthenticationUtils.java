package com.devpath.common.security;

import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;

public final class AuthenticationUtils {

  private AuthenticationUtils() {}

  public static Long requireUserId(Long userId) {
    if (userId == null) {
      throw new CustomException(ErrorCode.UNAUTHORIZED);
    }
    return userId;
  }
}
