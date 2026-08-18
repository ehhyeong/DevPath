package com.devpath.support;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

public final class H2SchemaFunctions {

  private H2SchemaFunctions() {}

  public static void ensureBooleanFlagDefaults(Connection connection) throws SQLException {
    List<String> tableNames = new ArrayList<>();
    try (Statement statement = connection.createStatement();
        ResultSet resultSet =
            statement.executeQuery(
                """
                SELECT table_name
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND column_name = 'is_deleted'
                """)) {
      while (resultSet.next()) {
        tableNames.add(resultSet.getString("table_name"));
      }
    }

    try (Statement statement = connection.createStatement()) {
      for (String tableName : tableNames) {
        statement.execute(
            "ALTER TABLE "
                + quoteIdentifier(tableName)
                + " ALTER COLUMN is_deleted SET DEFAULT false");
      }
    }
  }

  private static String quoteIdentifier(String identifier) {
    return '"' + identifier.replace("\"", "\"\"") + '"';
  }
}
