package com.devpath.domain.voice.entity;

public enum VoiceEventType {

  // 사용자가 마이크를 음소거한 이벤트
  MUTE,

  // 사용자가 마이크 음소거를 해제한 이벤트
  UNMUTE,

  // 사용자가 발언 요청을 위해 손들기한 이벤트
  RAISE_HAND,

  // 사용자가 손들기를 내린 이벤트
  LOWER_HAND,

  // 사용자가 발언 중인 상태로 변경된 이벤트
  SPEAKING,

  // 사용자가 발언 중이 아닌 상태로 변경된 이벤트
  STOP_SPEAKING
}
