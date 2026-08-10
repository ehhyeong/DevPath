package com.devpath.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@Profile({"local", "dev"})
@RequiredArgsConstructor
public class DummyDataInitializer implements CommandLineRunner {

  private final LocalSeedSqlExecutor seedSqlExecutor;

  @Override
  @Transactional
  public void run(String... args) {
    log.debug("C 파트 단독 테스트용 더미 데이터 초기화를 시작합니다.");
    seedSqlExecutor.execute("db/local/dummy-data.sql");
    log.debug("더미 데이터 초기화가 완료되었습니다.");
  }
}
