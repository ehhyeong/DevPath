package com.devpath.domain.instructor.repository;

import com.devpath.domain.instructor.entity.DmMessage;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DmMessageRepository extends JpaRepository<DmMessage, Long> {

  List<DmMessage> findAllByRoomIdAndIsDeletedFalseOrderByCreatedAtAsc(Long roomId);
}
