package com.devpath.api.instructor.repository;

import com.devpath.api.instructor.entity.DmMessage;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DmMessageRepository extends JpaRepository<DmMessage, Long> {

  List<DmMessage> findAllByRoomIdAndIsDeletedFalseOrderByCreatedAtAsc(Long roomId);
}
