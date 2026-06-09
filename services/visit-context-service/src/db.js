const mysql = require("mysql2/promise");

let pool;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST || "mysql-visit-context",
      port: process.env.MYSQL_PORT || 3306,
      user: process.env.MYSQL_USER || "DBE_CLOUDDEV_VISIT_CONTEXT",
      password: process.env.MYSQL_PASSWORD || "DBE_CLOUDDEV_VISIT_CONTEXT_PASSWORD",
      database: "wellness_visit_context",
      waitForConnections: true,
      connectionLimit: 10,
      charset: "utf8mb4",
    });
  }
  return pool;
}

module.exports = {
  getPool,
};
