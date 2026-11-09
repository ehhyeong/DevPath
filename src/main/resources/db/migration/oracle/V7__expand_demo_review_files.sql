-- 김학습 소유의 기존 시연 PR에 누락된 변경 파일만 추가한다. 사용자 파일·댓글·PR 상태·AI 검토는 보존한다.

INSERT INTO workspace_code_review_files (review_id, workspace_id, file_path, diff_text, additions, deletions, change_type, display_order, created_at, updated_at)
SELECT r.id, r.workspace_id, 'src/main/java/com/routinecare/record/DailyRecordController.java', 'diff --git a/src/main/java/com/routinecare/record/DailyRecordController.java b/src/main/java/com/routinecare/record/DailyRecordController.java
new file mode 100644
--- /dev/null
+++ b/src/main/java/com/routinecare/record/DailyRecordController.java
@@ -0,0 +1,20 @@
+package com.routinecare.record;
+
+import java.time.LocalDate;
+import lombok.RequiredArgsConstructor;
+import org.springframework.web.bind.annotation.*;
+
+@RestController
+@RequiredArgsConstructor
+public class DailyRecordController {
+    private final DailyRecordService service;
+
+    @PostMapping("/api/daily-records")
+    public CreatedResponse create(@RequestBody DailyRecordRequest request) {
+        DailyRecord saved = service.record(request.memberId(), request.recordDate(), request.meal(), request.medicationTaken());
+        return new CreatedResponse(saved.getId());
+    }
+
+    public record DailyRecordRequest(Long memberId, LocalDate recordDate, String meal, boolean medicationTaken) {}
+    public record CreatedResponse(Long id) {}
+}
', 20, 0, 'added', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM workspace_code_reviews r
JOIN workspace w ON w.id = r.workspace_id
JOIN users u ON u.user_id = w.owner_id
WHERE r.external_provider = 'DEMO' AND r.external_id = 'routinecare-records-v1#1' AND r.is_deleted = 0
  AND w.is_deleted = 0 AND u.email = 'kim.hakseup@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM workspace_code_review_files f WHERE f.review_id = r.id AND f.workspace_id = r.workspace_id AND f.file_path = 'src/main/java/com/routinecare/record/DailyRecordController.java');

INSERT INTO workspace_code_review_files (review_id, workspace_id, file_path, diff_text, additions, deletions, change_type, display_order, created_at, updated_at)
SELECT r.id, r.workspace_id, 'frontend/src/features/record/DailyRecordPanel.tsx', 'diff --git a/frontend/src/features/record/DailyRecordPanel.tsx b/frontend/src/features/record/DailyRecordPanel.tsx
--- a/frontend/src/features/record/DailyRecordPanel.tsx
+++ b/frontend/src/features/record/DailyRecordPanel.tsx
@@ -1,2 +1,28 @@
-export function FeaturePanel() { return null; }
-// 화면 구현 예정
+import { useState } from ''react'';
+import { api } from ''../../lib/api'';
+
+type Props = { memberId: number; reload: () => Promise<void> };
+
+export function DailyRecordPanel({ memberId, reload }: Props) {
+  const [recordDate, setRecordDate] = useState(''2026-11-16'');
+  const [meal, setMeal] = useState('''');
+  const [medicationTaken, setMedicationTaken] = useState(false);
+  const [error, setError] = useState('''');
+  async function submit() {
+    setError('''');
+    try {
+      await api.post(`/api/daily-records`, { memberId, recordDate, meal, medicationTaken });
+      await reload();
+    } catch {
+      setError(''요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.'');
+    }
+  }
+  return <section>
+    <h2>일별 식단·복약 기록</h2>
+    <label>기록 날짜<input type="date" value={recordDate} onChange={e => setRecordDate(e.target.value)} /></label>
+    <label>식단<input value={meal} onChange={e => setMeal(e.target.value)} /></label>
+    <label>복약 확인<input type="checkbox" checked={medicationTaken} onChange={e => setMedicationTaken(e.target.checked)} /></label>
+    {error && <p role="alert">{error}</p>}
+    <button onClick={submit}>저장하기</button>
+  </section>;
+}
', 28, 2, 'modified', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM workspace_code_reviews r
JOIN workspace w ON w.id = r.workspace_id
JOIN users u ON u.user_id = w.owner_id
WHERE r.external_provider = 'DEMO' AND r.external_id = 'routinecare-records-v1#1' AND r.is_deleted = 0
  AND w.is_deleted = 0 AND u.email = 'kim.hakseup@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM workspace_code_review_files f WHERE f.review_id = r.id AND f.workspace_id = r.workspace_id AND f.file_path = 'frontend/src/features/record/DailyRecordPanel.tsx');

INSERT INTO workspace_code_review_files (review_id, workspace_id, file_path, diff_text, additions, deletions, change_type, display_order, created_at, updated_at)
SELECT r.id, r.workspace_id, 'src/test/java/com/routinecare/record/DailyRecordServiceTest.java', 'diff --git a/src/test/java/com/routinecare/record/DailyRecordServiceTest.java b/src/test/java/com/routinecare/record/DailyRecordServiceTest.java
new file mode 100644
--- /dev/null
+++ b/src/test/java/com/routinecare/record/DailyRecordServiceTest.java
@@ -0,0 +1,20 @@
+package com.routinecare.record;
+
+import java.time.LocalDate;
+import java.util.Optional;
+import org.junit.jupiter.api.Test;
+import static org.assertj.core.api.Assertions.assertThat;
+import static org.mockito.Mockito.*;
+
+class DailyRecordServiceTest {
+    @Test
+    void returnsCreatedRecordForValidRequest() {
+        var records = mock(DailyRecordRepository.class);
+        when(records.findByMemberIdAndDate(7L, LocalDate.of(2026, 11, 16))).thenReturn(Optional.empty());
+        when(records.save(any(DailyRecord.class))).thenAnswer(invocation -> invocation.getArgument(0));
+        var service = new DailyRecordService(records);
+        var saved = service.record(7L, LocalDate.of(2026, 11, 16), "샐러드", true);
+        assertThat(saved).isNotNull();
+        verify(records).save(any(DailyRecord.class));
+    }
+}
', 20, 0, 'added', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM workspace_code_reviews r
JOIN workspace w ON w.id = r.workspace_id
JOIN users u ON u.user_id = w.owner_id
WHERE r.external_provider = 'DEMO' AND r.external_id = 'routinecare-records-v1#1' AND r.is_deleted = 0
  AND w.is_deleted = 0 AND u.email = 'kim.hakseup@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM workspace_code_review_files f WHERE f.review_id = r.id AND f.workspace_id = r.workspace_id AND f.file_path = 'src/test/java/com/routinecare/record/DailyRecordServiceTest.java');

INSERT INTO workspace_code_review_files (review_id, workspace_id, file_path, diff_text, additions, deletions, change_type, display_order, created_at, updated_at)
SELECT r.id, r.workspace_id, 'src/main/resources/db/migration/V2__index_routinecare_record.sql', 'diff --git a/src/main/resources/db/migration/V2__index_routinecare_record.sql b/src/main/resources/db/migration/V2__index_routinecare_record.sql
new file mode 100644
--- /dev/null
+++ b/src/main/resources/db/migration/V2__index_routinecare_record.sql
@@ -0,0 +1,1 @@
+CREATE INDEX idx_daily_records_member_date ON daily_records (member_id, record_date);
', 1, 0, 'added', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM workspace_code_reviews r
JOIN workspace w ON w.id = r.workspace_id
JOIN users u ON u.user_id = w.owner_id
WHERE r.external_provider = 'DEMO' AND r.external_id = 'routinecare-records-v1#1' AND r.is_deleted = 0
  AND w.is_deleted = 0 AND u.email = 'kim.hakseup@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM workspace_code_review_files f WHERE f.review_id = r.id AND f.workspace_id = r.workspace_id AND f.file_path = 'src/main/resources/db/migration/V2__index_routinecare_record.sql');

INSERT INTO workspace_code_review_files (review_id, workspace_id, file_path, diff_text, additions, deletions, change_type, display_order, created_at, updated_at)
SELECT r.id, r.workspace_id, 'src/main/java/com/studymate/attendance/AttendanceController.java', 'diff --git a/src/main/java/com/studymate/attendance/AttendanceController.java b/src/main/java/com/studymate/attendance/AttendanceController.java
new file mode 100644
--- /dev/null
+++ b/src/main/java/com/studymate/attendance/AttendanceController.java
@@ -0,0 +1,19 @@
+package com.studymate.attendance;
+
+import lombok.RequiredArgsConstructor;
+import org.springframework.web.bind.annotation.*;
+
+@RestController
+@RequiredArgsConstructor
+public class AttendanceController {
+    private final AttendanceService service;
+
+    @PostMapping("/api/sessions/{sessionId}/attendance")
+    public CreatedResponse create(@PathVariable Long sessionId, @RequestBody CheckInRequest request) {
+        Attendance saved = service.checkIn(sessionId, request.memberId());
+        return new CreatedResponse(saved.getId());
+    }
+
+    public record CheckInRequest(Long memberId) {}
+    public record CreatedResponse(Long attendanceId) {}
+}
', 19, 0, 'added', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM workspace_code_reviews r
JOIN workspace w ON w.id = r.workspace_id
JOIN users u ON u.user_id = w.owner_id
WHERE r.external_provider = 'DEMO' AND r.external_id = 'studymate-attendance-v1#1' AND r.is_deleted = 0
  AND w.is_deleted = 0 AND u.email = 'kim.hakseup@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM workspace_code_review_files f WHERE f.review_id = r.id AND f.workspace_id = r.workspace_id AND f.file_path = 'src/main/java/com/studymate/attendance/AttendanceController.java');

INSERT INTO workspace_code_review_files (review_id, workspace_id, file_path, diff_text, additions, deletions, change_type, display_order, created_at, updated_at)
SELECT r.id, r.workspace_id, 'frontend/src/features/attendance/AttendancePanel.tsx', 'diff --git a/frontend/src/features/attendance/AttendancePanel.tsx b/frontend/src/features/attendance/AttendancePanel.tsx
--- a/frontend/src/features/attendance/AttendancePanel.tsx
+++ b/frontend/src/features/attendance/AttendancePanel.tsx
@@ -1,2 +1,24 @@
-export function FeaturePanel() { return null; }
-// 화면 구현 예정
+import { useState } from ''react'';
+import { api } from ''../../lib/api'';
+
+type Props = { sessionId: number; memberId: number; reload: () => Promise<void> };
+
+export function AttendancePanel({ sessionId, memberId, reload }: Props) {
+
+  const [error, setError] = useState('''');
+  async function submit() {
+    setError('''');
+    try {
+      await api.post(`/api/sessions/${sessionId}/attendance`, { memberId });
+      await reload();
+    } catch {
+      setError(''요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.'');
+    }
+  }
+  return <section>
+    <h2>모임 출석 체크</h2>
+    <p>모임의 출석을 확인해주세요.</p>
+    {error && <p role="alert">{error}</p>}
+    <button onClick={submit}>저장하기</button>
+  </section>;
+}
', 24, 2, 'modified', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM workspace_code_reviews r
JOIN workspace w ON w.id = r.workspace_id
JOIN users u ON u.user_id = w.owner_id
WHERE r.external_provider = 'DEMO' AND r.external_id = 'studymate-attendance-v1#1' AND r.is_deleted = 0
  AND w.is_deleted = 0 AND u.email = 'kim.hakseup@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM workspace_code_review_files f WHERE f.review_id = r.id AND f.workspace_id = r.workspace_id AND f.file_path = 'frontend/src/features/attendance/AttendancePanel.tsx');

INSERT INTO workspace_code_review_files (review_id, workspace_id, file_path, diff_text, additions, deletions, change_type, display_order, created_at, updated_at)
SELECT r.id, r.workspace_id, 'src/test/java/com/studymate/attendance/AttendanceServiceTest.java', 'diff --git a/src/test/java/com/studymate/attendance/AttendanceServiceTest.java b/src/test/java/com/studymate/attendance/AttendanceServiceTest.java
new file mode 100644
--- /dev/null
+++ b/src/test/java/com/studymate/attendance/AttendanceServiceTest.java
@@ -0,0 +1,21 @@
+package com.studymate.attendance;
+
+import java.util.Optional;
+import org.junit.jupiter.api.Test;
+import static org.assertj.core.api.Assertions.assertThat;
+import static org.mockito.Mockito.*;
+
+class AttendanceServiceTest {
+    @Test
+    void returnsCreatedRecordForValidRequest() {
+        var attendances = mock(AttendanceRepository.class);
+        var sessions = mock(SessionRepository.class);
+        when(sessions.findById(1L)).thenReturn(Optional.of(mock(Session.class)));
+        when(attendances.findBySessionIdAndMemberId(1L, 7L)).thenReturn(Optional.empty());
+        when(attendances.save(any(Attendance.class))).thenAnswer(invocation -> invocation.getArgument(0));
+        var service = new AttendanceService(attendances, sessions);
+        var saved = service.checkIn(1L, 7L);
+        assertThat(saved).isNotNull();
+        verify(attendances).save(any(Attendance.class));
+    }
+}
', 21, 0, 'added', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM workspace_code_reviews r
JOIN workspace w ON w.id = r.workspace_id
JOIN users u ON u.user_id = w.owner_id
WHERE r.external_provider = 'DEMO' AND r.external_id = 'studymate-attendance-v1#1' AND r.is_deleted = 0
  AND w.is_deleted = 0 AND u.email = 'kim.hakseup@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM workspace_code_review_files f WHERE f.review_id = r.id AND f.workspace_id = r.workspace_id AND f.file_path = 'src/test/java/com/studymate/attendance/AttendanceServiceTest.java');

INSERT INTO workspace_code_review_files (review_id, workspace_id, file_path, diff_text, additions, deletions, change_type, display_order, created_at, updated_at)
SELECT r.id, r.workspace_id, 'src/main/resources/db/migration/V2__index_studymate_attendance.sql', 'diff --git a/src/main/resources/db/migration/V2__index_studymate_attendance.sql b/src/main/resources/db/migration/V2__index_studymate_attendance.sql
new file mode 100644
--- /dev/null
+++ b/src/main/resources/db/migration/V2__index_studymate_attendance.sql
@@ -0,0 +1,1 @@
+CREATE INDEX idx_attendances_session_member ON attendances (session_id, member_id);
', 1, 0, 'added', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM workspace_code_reviews r
JOIN workspace w ON w.id = r.workspace_id
JOIN users u ON u.user_id = w.owner_id
WHERE r.external_provider = 'DEMO' AND r.external_id = 'studymate-attendance-v1#1' AND r.is_deleted = 0
  AND w.is_deleted = 0 AND u.email = 'kim.hakseup@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM workspace_code_review_files f WHERE f.review_id = r.id AND f.workspace_id = r.workspace_id AND f.file_path = 'src/main/resources/db/migration/V2__index_studymate_attendance.sql');

INSERT INTO workspace_code_review_files (review_id, workspace_id, file_path, diff_text, additions, deletions, change_type, display_order, created_at, updated_at)
SELECT r.id, r.workspace_id, 'src/main/java/com/pantryshare/reservation/ReservationController.java', 'diff --git a/src/main/java/com/pantryshare/reservation/ReservationController.java b/src/main/java/com/pantryshare/reservation/ReservationController.java
new file mode 100644
--- /dev/null
+++ b/src/main/java/com/pantryshare/reservation/ReservationController.java
@@ -0,0 +1,19 @@
+package com.pantryshare.reservation;
+
+import lombok.RequiredArgsConstructor;
+import org.springframework.web.bind.annotation.*;
+
+@RestController
+@RequiredArgsConstructor
+public class ReservationController {
+    private final ReservationService service;
+
+    @PostMapping("/api/offers/{offerId}/reservations")
+    public CreatedResponse create(@PathVariable Long offerId, @RequestBody ReservationRequest request) {
+        Reservation saved = service.reserve(offerId, request.memberId(), request.quantity());
+        return new CreatedResponse(saved.getId());
+    }
+
+    public record ReservationRequest(Long memberId, int quantity) {}
+    public record CreatedResponse(Long reservationId) {}
+}
', 19, 0, 'added', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM workspace_code_reviews r
JOIN workspace w ON w.id = r.workspace_id
JOIN users u ON u.user_id = w.owner_id
WHERE r.external_provider = 'DEMO' AND r.external_id = 'pantryshare-reservations-v1#1' AND r.is_deleted = 0
  AND w.is_deleted = 0 AND u.email = 'kim.hakseup@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM workspace_code_review_files f WHERE f.review_id = r.id AND f.workspace_id = r.workspace_id AND f.file_path = 'src/main/java/com/pantryshare/reservation/ReservationController.java');

INSERT INTO workspace_code_review_files (review_id, workspace_id, file_path, diff_text, additions, deletions, change_type, display_order, created_at, updated_at)
SELECT r.id, r.workspace_id, 'frontend/src/features/reservation/OfferReservationPanel.tsx', 'diff --git a/frontend/src/features/reservation/OfferReservationPanel.tsx b/frontend/src/features/reservation/OfferReservationPanel.tsx
--- a/frontend/src/features/reservation/OfferReservationPanel.tsx
+++ b/frontend/src/features/reservation/OfferReservationPanel.tsx
@@ -1,2 +1,24 @@
-export function FeaturePanel() { return null; }
-// 화면 구현 예정
+import { useState } from ''react'';
+import { api } from ''../../lib/api'';
+
+type Props = { offerId: number; memberId: number; reload: () => Promise<void> };
+
+export function OfferReservationPanel({ offerId, memberId, reload }: Props) {
+  const [quantity, setQuantity] = useState(1);
+  const [error, setError] = useState('''');
+  async function submit() {
+    setError('''');
+    try {
+      await api.post(`/api/offers/${offerId}/reservations`, { memberId, quantity });
+      await reload();
+    } catch {
+      setError(''요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.'');
+    }
+  }
+  return <section>
+    <h2>나눔 수량 예약</h2>
+    <label>예약 수량<input type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} /></label>
+    {error && <p role="alert">{error}</p>}
+    <button onClick={submit}>저장하기</button>
+  </section>;
+}
', 24, 2, 'modified', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM workspace_code_reviews r
JOIN workspace w ON w.id = r.workspace_id
JOIN users u ON u.user_id = w.owner_id
WHERE r.external_provider = 'DEMO' AND r.external_id = 'pantryshare-reservations-v1#1' AND r.is_deleted = 0
  AND w.is_deleted = 0 AND u.email = 'kim.hakseup@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM workspace_code_review_files f WHERE f.review_id = r.id AND f.workspace_id = r.workspace_id AND f.file_path = 'frontend/src/features/reservation/OfferReservationPanel.tsx');

INSERT INTO workspace_code_review_files (review_id, workspace_id, file_path, diff_text, additions, deletions, change_type, display_order, created_at, updated_at)
SELECT r.id, r.workspace_id, 'src/test/java/com/pantryshare/reservation/ReservationServiceTest.java', 'diff --git a/src/test/java/com/pantryshare/reservation/ReservationServiceTest.java b/src/test/java/com/pantryshare/reservation/ReservationServiceTest.java
new file mode 100644
--- /dev/null
+++ b/src/test/java/com/pantryshare/reservation/ReservationServiceTest.java
@@ -0,0 +1,22 @@
+package com.pantryshare.reservation;
+
+import java.util.Optional;
+import org.junit.jupiter.api.Test;
+import static org.assertj.core.api.Assertions.assertThat;
+import static org.mockito.Mockito.*;
+
+class ReservationServiceTest {
+    @Test
+    void returnsCreatedRecordForValidRequest() {
+        var offers = mock(OfferRepository.class);
+        var reservations = mock(ReservationRepository.class);
+        var resource = mock(Offer.class);
+        when(offers.findById(1L)).thenReturn(Optional.of(resource));
+        when(resource.getRemainingQuantity()).thenReturn(3);
+        when(reservations.save(any(Reservation.class))).thenAnswer(invocation -> invocation.getArgument(0));
+        var service = new ReservationService(offers, reservations);
+        var saved = service.reserve(1L, 7L, 2);
+        assertThat(saved).isNotNull();
+        verify(reservations).save(any(Reservation.class));
+    }
+}
', 22, 0, 'added', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM workspace_code_reviews r
JOIN workspace w ON w.id = r.workspace_id
JOIN users u ON u.user_id = w.owner_id
WHERE r.external_provider = 'DEMO' AND r.external_id = 'pantryshare-reservations-v1#1' AND r.is_deleted = 0
  AND w.is_deleted = 0 AND u.email = 'kim.hakseup@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM workspace_code_review_files f WHERE f.review_id = r.id AND f.workspace_id = r.workspace_id AND f.file_path = 'src/test/java/com/pantryshare/reservation/ReservationServiceTest.java');

INSERT INTO workspace_code_review_files (review_id, workspace_id, file_path, diff_text, additions, deletions, change_type, display_order, created_at, updated_at)
SELECT r.id, r.workspace_id, 'src/main/resources/db/migration/V2__index_pantryshare_reservation.sql', 'diff --git a/src/main/resources/db/migration/V2__index_pantryshare_reservation.sql b/src/main/resources/db/migration/V2__index_pantryshare_reservation.sql
new file mode 100644
--- /dev/null
+++ b/src/main/resources/db/migration/V2__index_pantryshare_reservation.sql
@@ -0,0 +1,1 @@
+CREATE INDEX idx_reservations_offer_member ON reservations (offer_id, member_id);
', 1, 0, 'added', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM workspace_code_reviews r
JOIN workspace w ON w.id = r.workspace_id
JOIN users u ON u.user_id = w.owner_id
WHERE r.external_provider = 'DEMO' AND r.external_id = 'pantryshare-reservations-v1#1' AND r.is_deleted = 0
  AND w.is_deleted = 0 AND u.email = 'kim.hakseup@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM workspace_code_review_files f WHERE f.review_id = r.id AND f.workspace_id = r.workspace_id AND f.file_path = 'src/main/resources/db/migration/V2__index_pantryshare_reservation.sql');

INSERT INTO workspace_code_review_files (review_id, workspace_id, file_path, diff_text, additions, deletions, change_type, display_order, created_at, updated_at)
SELECT r.id, r.workspace_id, 'src/main/java/com/sprintdesk/issue/IssueStatusController.java', 'diff --git a/src/main/java/com/sprintdesk/issue/IssueStatusController.java b/src/main/java/com/sprintdesk/issue/IssueStatusController.java
new file mode 100644
--- /dev/null
+++ b/src/main/java/com/sprintdesk/issue/IssueStatusController.java
@@ -0,0 +1,19 @@
+package com.sprintdesk.issue;
+
+import lombok.RequiredArgsConstructor;
+import org.springframework.web.bind.annotation.*;
+
+@RestController
+@RequiredArgsConstructor
+public class IssueStatusController {
+    private final IssueStatusService service;
+
+    @PatchMapping("/api/issues/{issueId}/status")
+    public CreatedResponse create(@PathVariable Long issueId, @RequestBody IssueStatusRequest request) {
+        Issue saved = service.changeStatus(issueId, request.memberId(), request.nextStatus());
+        return new CreatedResponse(saved.getId());
+    }
+
+    public record IssueStatusRequest(Long memberId, IssueStatus nextStatus) {}
+    public record CreatedResponse(Long issueId) {}
+}
', 19, 0, 'added', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM workspace_code_reviews r
JOIN workspace w ON w.id = r.workspace_id
JOIN users u ON u.user_id = w.owner_id
WHERE r.external_provider = 'DEMO' AND r.external_id = 'sprintdesk-issue-status-v1#1' AND r.is_deleted = 0
  AND w.is_deleted = 0 AND u.email = 'kim.hakseup@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM workspace_code_review_files f WHERE f.review_id = r.id AND f.workspace_id = r.workspace_id AND f.file_path = 'src/main/java/com/sprintdesk/issue/IssueStatusController.java');

INSERT INTO workspace_code_review_files (review_id, workspace_id, file_path, diff_text, additions, deletions, change_type, display_order, created_at, updated_at)
SELECT r.id, r.workspace_id, 'frontend/src/features/issue/IssueStatusPanel.tsx', 'diff --git a/frontend/src/features/issue/IssueStatusPanel.tsx b/frontend/src/features/issue/IssueStatusPanel.tsx
--- a/frontend/src/features/issue/IssueStatusPanel.tsx
+++ b/frontend/src/features/issue/IssueStatusPanel.tsx
@@ -1,2 +1,24 @@
-export function FeaturePanel() { return null; }
-// 화면 구현 예정
+import { useState } from ''react'';
+import { api } from ''../../lib/api'';
+
+type Props = { issueId: number; memberId: number; reload: () => Promise<void> };
+
+export function IssueStatusPanel({ issueId, memberId, reload }: Props) {
+  const [nextStatus, setNextStatus] = useState(''IN_PROGRESS'');
+  const [error, setError] = useState('''');
+  async function submit() {
+    setError('''');
+    try {
+      await api.patch(`/api/issues/${issueId}/status`, { memberId, nextStatus });
+      await reload();
+    } catch {
+      setError(''요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.'');
+    }
+  }
+  return <section>
+    <h2>이슈 상태 변경</h2>
+    <label>다음 상태<select value={nextStatus} onChange={e => setNextStatus(e.target.value)}><option value="IN_PROGRESS">진행 중</option><option value="IN_REVIEW">리뷰 대기</option><option value="DONE">완료</option></select></label>
+    {error && <p role="alert">{error}</p>}
+    <button onClick={submit}>저장하기</button>
+  </section>;
+}
', 24, 2, 'modified', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM workspace_code_reviews r
JOIN workspace w ON w.id = r.workspace_id
JOIN users u ON u.user_id = w.owner_id
WHERE r.external_provider = 'DEMO' AND r.external_id = 'sprintdesk-issue-status-v1#1' AND r.is_deleted = 0
  AND w.is_deleted = 0 AND u.email = 'kim.hakseup@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM workspace_code_review_files f WHERE f.review_id = r.id AND f.workspace_id = r.workspace_id AND f.file_path = 'frontend/src/features/issue/IssueStatusPanel.tsx');

INSERT INTO workspace_code_review_files (review_id, workspace_id, file_path, diff_text, additions, deletions, change_type, display_order, created_at, updated_at)
SELECT r.id, r.workspace_id, 'src/test/java/com/sprintdesk/issue/IssueStatusServiceTest.java', 'diff --git a/src/test/java/com/sprintdesk/issue/IssueStatusServiceTest.java b/src/test/java/com/sprintdesk/issue/IssueStatusServiceTest.java
new file mode 100644
--- /dev/null
+++ b/src/test/java/com/sprintdesk/issue/IssueStatusServiceTest.java
@@ -0,0 +1,20 @@
+package com.sprintdesk.issue;
+
+import java.util.Optional;
+import org.junit.jupiter.api.Test;
+import static org.assertj.core.api.Assertions.assertThat;
+import static org.mockito.Mockito.*;
+
+class IssueStatusServiceTest {
+    @Test
+    void returnsCreatedRecordForValidRequest() {
+        var issues = mock(IssueRepository.class);
+        var resource = mock(Issue.class);
+        when(issues.findById(1L)).thenReturn(Optional.of(resource));
+        when(issues.save(any(Issue.class))).thenAnswer(invocation -> invocation.getArgument(0));
+        var service = new IssueStatusService(issues);
+        var saved = service.changeStatus(1L, 7L, IssueStatus.IN_PROGRESS);
+        assertThat(saved).isNotNull();
+        verify(issues).save(any(Issue.class));
+    }
+}
', 20, 0, 'added', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM workspace_code_reviews r
JOIN workspace w ON w.id = r.workspace_id
JOIN users u ON u.user_id = w.owner_id
WHERE r.external_provider = 'DEMO' AND r.external_id = 'sprintdesk-issue-status-v1#1' AND r.is_deleted = 0
  AND w.is_deleted = 0 AND u.email = 'kim.hakseup@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM workspace_code_review_files f WHERE f.review_id = r.id AND f.workspace_id = r.workspace_id AND f.file_path = 'src/test/java/com/sprintdesk/issue/IssueStatusServiceTest.java');

INSERT INTO workspace_code_review_files (review_id, workspace_id, file_path, diff_text, additions, deletions, change_type, display_order, created_at, updated_at)
SELECT r.id, r.workspace_id, 'src/main/resources/db/migration/V2__index_sprintdesk_issue.sql', 'diff --git a/src/main/resources/db/migration/V2__index_sprintdesk_issue.sql b/src/main/resources/db/migration/V2__index_sprintdesk_issue.sql
new file mode 100644
--- /dev/null
+++ b/src/main/resources/db/migration/V2__index_sprintdesk_issue.sql
@@ -0,0 +1,1 @@
+CREATE INDEX idx_issues_project_status ON issues (project_id, status);
', 1, 0, 'added', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM workspace_code_reviews r
JOIN workspace w ON w.id = r.workspace_id
JOIN users u ON u.user_id = w.owner_id
WHERE r.external_provider = 'DEMO' AND r.external_id = 'sprintdesk-issue-status-v1#1' AND r.is_deleted = 0
  AND w.is_deleted = 0 AND u.email = 'kim.hakseup@devpath.com'
  AND NOT EXISTS (SELECT 1 FROM workspace_code_review_files f WHERE f.review_id = r.id AND f.workspace_id = r.workspace_id AND f.file_path = 'src/main/resources/db/migration/V2__index_sprintdesk_issue.sql');

UPDATE workspace_code_reviews r
SET additions = (SELECT COALESCE(SUM(f.additions), 0) FROM workspace_code_review_files f WHERE f.review_id = r.id AND f.workspace_id = r.workspace_id),
    deletions = (SELECT COALESCE(SUM(f.deletions), 0) FROM workspace_code_review_files f WHERE f.review_id = r.id AND f.workspace_id = r.workspace_id)
WHERE r.external_provider = 'DEMO' AND r.external_id IN ('routinecare-records-v1#1', 'studymate-attendance-v1#1', 'pantryshare-reservations-v1#1', 'sprintdesk-issue-status-v1#1')
  AND r.is_deleted = 0
  AND EXISTS (SELECT 1 FROM workspace w JOIN users u ON u.user_id = w.owner_id WHERE w.id = r.workspace_id AND w.is_deleted = 0 AND u.email = 'kim.hakseup@devpath.com')
  AND EXISTS (SELECT 1 FROM workspace_code_review_files f WHERE f.review_id = r.id AND f.workspace_id = r.workspace_id);
