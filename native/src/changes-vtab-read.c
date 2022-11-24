#include "changes-vtab-read.h"
#include "consts.h"
#include "util.h"
#include <string.h>

/**
 * Construct the query to grab the changes made against
 * rows in a given table
 */
char *crsql_changesQueryForTable(crsql_TableInfo *tableInfo)
{
  if (tableInfo->pksLen == 0)
  {
    return 0;
  }

  char *zSql = sqlite3_mprintf(
      "SELECT\
      '%s' as tbl,\
      %z as pks,\
      __crsql_col_name as cid,\
      __crsql_version as vrsn,\
      __crsql_site_id as site_id\
    FROM \"%s__crsql_clock\"\
    WHERE\
      site_id IS NOT ?\
    AND\
      vrsn > ?",
      tableInfo->tblName,
      crsql_quoteConcat(tableInfo->pks, tableInfo->pksLen),
      tableInfo->tblName);

  return zSql;
}

// TODO: here we could do all the filtering to remove:
// - records with no longer existing columns
// - all rows prior to a delete entry for a row
//
// or we can do that in `xNext`
// or we can compact the table on `commit_alter`
// compacting in commit alter is likely the simplest option
// with minimal impact on perf of normal operations
/**
 * Union all the crr tables together to get a comprehensive
 * set of changes
 */
char *crsql_changesUnionQuery(
    crsql_TableInfo **tableInfos,
    int tableInfosLen)
{
  char *unionsArr[tableInfosLen];
  char *unionsStr = 0;
  int i = 0;

  // TODO: what if there are no table infos?
  for (i = 0; i < tableInfosLen; ++i)
  {
    unionsArr[i] = crsql_changesQueryForTable(tableInfos[i]);
    if (unionsArr[i] == 0)
    {
      for (int j = 0; j < i; j++)
      {
        sqlite3_free(unionsArr[j]);
      }
      return 0;
    }

    if (i < tableInfosLen - 1)
    {
      unionsArr[i] = sqlite3_mprintf("%z %s ", unionsArr[i], UNION);
    }
  }

  // move the array of strings into a single string
  unionsStr = crsql_join(unionsArr, tableInfosLen);
  // free the strings in the array
  for (i = 0; i < tableInfosLen; ++i)
  {
    sqlite3_free(unionsArr[i]);
  }

  // compose the final query
  return sqlite3_mprintf(
      "SELECT tbl, pks, cid, vrsn, site_id FROM (%z) ORDER BY vrsn, tbl ASC",
      unionsStr);
  // %z frees unionsStr https://www.sqlite.org/printf.html#percentz
}

/**
 * Create the query to pull the backing data from the actual row based
 * on the version mape of changed columns.
 *
 * This pulls all columns that have changed from the row.
 * The values of the columns are quote-concated for compliance
 * with union query constraints. I.e., that all tables must have same
 * output number of columns.
 *
 * TODO: potential improvement would be to store a binary
 * representation of the data via flat buffers.
 *
 * This will fill pRowStmt in the cursor.
 *
 * TODO: We could theoretically prepare all of these queries up
 * front on vtab initialization so we don't have to
 * re-compile them for each row fetched.
 */
char *crsql_rowPatchDataQuery(
    sqlite3 *db,
    crsql_TableInfo *tblInfo,
    const char* colName,
    const char *pks)
{
  if (strcmp(DELETE_CID_SENTINEL, colName) == 0) {
    return sqlite3_mprintf("");
  }

  char *pkWhereList = crsql_extractWhereList(tblInfo->pks, tblInfo->pksLen, pks);
  if (pkWhereList == 0) {
    return 0;
  }
  // TODO: if the col doesn't exist in tblInfo, don't do anything
  char *zSql = sqlite3_mprintf(
      "SELECT quote(\"%w\") FROM \"%w\" WHERE %z",
      colName,
      tblInfo->tblName,
      pkWhereList);

  return zSql;
}