package com.devpath.api.learner.dto;

import com.devpath.domain.course.entity.CourseWishlist;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class CourseWishlistDto {

    /**
     * 찜 목록 조회 응답
     */
    @Getter
    @Builder
    public static class WishlistResponse {
        private Long wishlistId;
        private Long courseId;
        private String courseTitle;
        private String instructorName;
        private String thumbnailUrl;
        private BigDecimal price;
        private LocalDateTime addedAt;

        public static WishlistResponse from(CourseWishlist wishlist) {
            return WishlistResponse.builder()
                    .wishlistId(wishlist.getWishlistId())
                    .courseId(wishlist.getCourse().getCourseId())
                    .courseTitle(wishlist.getCourse().getTitle())
                    .instructorName(wishlist.getCourse().getInstructor().getName())
                    .thumbnailUrl(wishlist.getCourse().getThumbnailUrl())
                    .price(wishlist.getCourse().getPrice())
                    .addedAt(wishlist.getCreatedAt())
                    .build();
        }
    }

    /**
     * 찜 추가 응답
     */
    @Getter
    @Builder
    public static class AddWishlistResponse {
        private String message;
        private Long courseId;

        public static AddWishlistResponse of(Long courseId) {
            return AddWishlistResponse.builder()
                    .message("찜 목록에 추가되었습니다.")
                    .courseId(courseId)
                    .build();
        }
    }

    /**
     * 찜 삭제 응답
     */
    @Getter
    @Builder
    public static class RemoveWishlistResponse {
        private String message;
        private Long courseId;

        public static RemoveWishlistResponse of(Long courseId) {
            return RemoveWishlistResponse.builder()
                    .message("찜 목록에서 제거되었습니다.")
                    .courseId(courseId)
                    .build();
        }
    }
}
