package com.devpath.domain.community.specification;

import com.devpath.domain.community.entity.CommunityCategory;
import com.devpath.domain.community.entity.Post;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.jpa.domain.Specification;

public final class PostSpecification {

    private PostSpecification() {
    }

    // 게시글 검색 조건을 동적으로 조합한다.
    public static Specification<Post> search(
            CommunityCategory category,
            Long authorId,
            String keyword
    ) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            // soft delete 되지 않은 게시글만 조회한다.
            predicates.add(criteriaBuilder.isFalse(root.get("isDeleted")));

            // 카테고리 필터가 있으면 추가한다.
            if (category != null) {
                predicates.add(criteriaBuilder.equal(root.get("category"), category));
            }

            // 작성자 필터가 있으면 추가한다.
            if (authorId != null) {
                predicates.add(criteriaBuilder.equal(root.get("user").get("id"), authorId));
            }

            // 키워드가 있으면 제목 또는 내용에 대해 부분 검색을 수행한다.
            if (keyword != null && !keyword.isBlank()) {
                String likeKeyword = "%" + keyword.toLowerCase() + "%";

                Predicate titlePredicate = criteriaBuilder.like(
                        criteriaBuilder.lower(root.get("title")),
                        likeKeyword
                );
                Predicate contentPredicate = criteriaBuilder.like(
                        criteriaBuilder.lower(root.get("content")),
                        likeKeyword
                );

                predicates.add(criteriaBuilder.or(titlePredicate, contentPredicate));
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }
}
