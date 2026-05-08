package com.devpath.api.admin.dto.permission;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Schema(description = "관리자 Role 등록/수정 요청")
public class RoleCreateRequest {

  @NotBlank
  @Schema(description = "Role 이름", example = "ROLE_ADMIN_OPERATION")
  private String roleName;

  @Schema(description = "Role 설명", example = "운영 정책/공지/제재를 담당하는 관리자 역할")
  private String description;

  // 권한 코드는 ADMIN_NOTICE_WRITE 같은 고정 문자열을 받는다.
  @Schema(
      description = "권한 코드 목록",
      example = "[\"ADMIN_NOTICE_WRITE\", \"ADMIN_MODERATION_RESOLVE\"]")
  private List<String> permissionCodes;
}
