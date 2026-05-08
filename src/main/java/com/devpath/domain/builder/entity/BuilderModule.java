package com.devpath.domain.builder.entity;

import com.devpath.domain.builder.converter.TopicsConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.util.List;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(
    name = "builder_modules",
    uniqueConstraints = {
      @UniqueConstraint(
          name = "uk_builder_modules_module_id_category",
          columnNames = {"module_id", "category"})
    })
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class BuilderModule {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "module_id", nullable = false, length = 50)
  private String moduleId;

  @Column(nullable = false, length = 50)
  private String category;

  @Column(nullable = false, length = 100)
  private String title;

  @Column(nullable = false, length = 100)
  private String icon;

  @Column(nullable = false, length = 50)
  private String color;

  @Column(name = "bg_color", nullable = false, length = 50)
  private String bgColor;

  @Convert(converter = TopicsConverter.class)
  @Column(columnDefinition = "TEXT", nullable = false)
  private List<String> topics;

  @Column(name = "sort_order", nullable = false)
  private int sortOrder;

  @Builder
  public BuilderModule(
      String moduleId,
      String category,
      String title,
      String icon,
      String color,
      String bgColor,
      List<String> topics,
      int sortOrder) {
    this.moduleId = moduleId;
    this.category = category;
    this.title = title;
    this.icon = icon;
    this.color = color;
    this.bgColor = bgColor;
    this.topics = topics;
    this.sortOrder = sortOrder;
  }
}
