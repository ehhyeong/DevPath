package com.devpath.domain.roadmap.entity;

public enum BranchKind {
  SPINE, // 척추(루트 본류 레인)
  BRANCH, // 구조적 분기(좌/우 대안, 체인 가능)
  REVIEW, // 복습 분기(단일 노드, 재학습 게이트)
  ADVANCED // 심화 분기(단일 노드, 재학습 게이트)
}