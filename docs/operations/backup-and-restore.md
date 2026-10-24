# Database Backup & Restore Procedures

**Database**: MySQL 8.0+ (InnoDB)  
**Tooling**: `mysqldump`, `mysql`, Cloud Snapshot Automation  

---

## 1. Automated Daily Logical Backup (`mysqldump`)

```bash
# Export compressed, transactional, single-transaction database dump
mysqldump \
  --host=localhost \
  --user=root \
  --password=your_secure_password \
  --single-transaction \
  --routines \
  --triggers \
  --default-character-set=utf8mb4 \
  circulink | gzip > "circulink_backup_$(date +%Y%m%d_%H%M%S).sql.gz"
```

---

## 2. Restoration Procedure

```bash
# 1. Uncompress backup archive
gunzip circulink_backup_YYYYMMDD_HHMMSS.sql.gz

# 2. Restore into target database
mysql -h localhost -u root -p circulink < circulink_backup_YYYYMMDD_HHMMSS.sql
```
