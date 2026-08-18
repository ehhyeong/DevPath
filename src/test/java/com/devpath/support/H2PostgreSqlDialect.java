package com.devpath.support;

import org.hibernate.dialect.H2Dialect;
import org.hibernate.type.SqlTypes;

/** H2 PostgreSQL 모드에서 지원하지 않는 BLOB을 동등한 BYTEA로 생성한다. */
public class H2PostgreSqlDialect extends H2Dialect {

  @Override
  protected String columnType(int sqlTypeCode) {
    if (sqlTypeCode == SqlTypes.BLOB || sqlTypeCode == SqlTypes.MATERIALIZED_BLOB) {
      return "bytea";
    }
    return super.columnType(sqlTypeCode);
  }
}
