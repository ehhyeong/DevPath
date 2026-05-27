package com.devpath.common.security;

import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Collections;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;

public final class AuthenticationUtils {

  private AuthenticationUtils() {}

  public static Long requireUserId(Long userId) {
    if (userId == null) {
      throw new CustomException(ErrorCode.UNAUTHORIZED);
    }
    return userId;
  }

  public static Authentication createAuthentication(
      JwtTokenProvider.TokenClaims claims, HttpServletRequest request) {
    UsernamePasswordAuthenticationToken authentication =
        new UsernamePasswordAuthenticationToken(
            claims.userId(),
            null,
            Collections.singleton(new SimpleGrantedAuthority(claims.role())));
    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
    return authentication;
  }
}
