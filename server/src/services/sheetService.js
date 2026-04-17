const { format } = require("date-fns");
const { google } = require("googleapis");

const env = require("../config/env");
const AppError = require("../utils/AppError");

const preparedSheets = new Set();
const preparedSheetMeta = new Map();

const transactionLegacyHeaders = [
  "Date",
  "Customer Name",
  "Customer Type",
  "Entry Type",
  "Filled Delivered",
  "Empty Returned",
  "Pending Cylinders",
  "Rate",
  "Revenue",
  "Collected",
  "Payment Mode",
  "Notes",
];

const transactionHeaders = [...transactionLegacyHeaders, "__RecordId"];

const technicalHeaders = new Set(["__RecordId"]);

const stockHeaders = [
  "Date",
  "Movement Type",
  "Quantity",
  "Filled Change",
  "Empty Change",
  "Issued Change",
  "Price/Cylinder",
  "Total Price",
  "Supplier",
  "Notes",
];

const totalFormulaHeaders = new Set([
  "Filled Delivered",
  "Empty Returned",
  "Pending Cylinders",
  "Revenue",
  "Collected",
  "Quantity",
  "Filled Change",
  "Empty Change",
  "Issued Change",
  "Total Price",
]);

const transactionNumericHeaders = new Set([
  "Filled Delivered",
  "Empty Returned",
  "Pending Cylinders",
  "Rate",
  "Revenue",
  "Collected",
]);

const stockNumericHeaders = new Set([
  "Quantity",
  "Filled Change",
  "Empty Change",
  "Issued Change",
  "Price/Cylinder",
  "Total Price",
]);

function getPrivateKey() {
  return (env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "").replace(/\\n/g, "\n");
}

function getSheetsClient() {
  if (
    !env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    !env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ||
    !env.GOOGLE_SHEETS_ID
  ) {
    throw new AppError(
      "Google Sheets environment variables are incomplete",
      500,
    );
  }

  const auth = new google.auth.JWT({
    email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: getPrivateKey(),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({
    version: "v4",
    auth,
  });
}

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function hasMatchingHeaders(existing = [], expected = []) {
  if (existing.length < expected.length) {
    return false;
  }

  for (let index = 0; index < expected.length; index += 1) {
    if (normalizeHeader(existing[index]) !== normalizeHeader(expected[index])) {
      return false;
    }
  }

  return true;
}

function isTransactionSheetName(sheetName) {
  return sheetName === (env.GOOGLE_SHEETS_TRANSACTIONS_SHEET || "Transactions");
}

function buildHeaderIndexMap(headers = []) {
  return headers.reduce((map, header, index) => {
    map[normalizeHeader(header)] = index;
    return map;
  }, {});
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeDateKey(value) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);

  if (!Number.isNaN(parsed.getTime())) {
    return format(parsed, "yyyy-MM-dd");
  }

  const match = String(value).match(/\d{4}-\d{2}-\d{2}/);

  if (match) {
    return match[0];
  }

  return String(value).trim().slice(0, 10);
}

function toNumeric(value) {
  if (value === "" || value === null || value === undefined) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getCellByHeader(row, headerMap, headerName) {
  const index = headerMap[normalizeHeader(headerName)];

  if (index === undefined) {
    return "";
  }

  return row[index] ?? "";
}

function scoreTransactionRowMatch(row, headerMap, payload) {
  let score = 0;

  if (
    normalizeText(getCellByHeader(row, headerMap, "Customer Name")) ===
    normalizeText(payload.customerName)
  ) {
    score += 2;
  }

  if (
    normalizeText(getCellByHeader(row, headerMap, "Entry Type")) ===
    normalizeText(payload.entryType)
  ) {
    score += 2;
  }

  if (
    normalizeDateKey(getCellByHeader(row, headerMap, "Date")) ===
    normalizeDateKey(payload.date)
  ) {
    score += 2;
  }

  if (
    toNumeric(getCellByHeader(row, headerMap, "Filled Delivered")) ===
    toNumeric(payload.filledDelivered)
  ) {
    score += 1;
  }

  if (
    toNumeric(getCellByHeader(row, headerMap, "Empty Returned")) ===
    toNumeric(payload.emptyReturned)
  ) {
    score += 1;
  }

  if (
    toNumeric(getCellByHeader(row, headerMap, "Revenue")) ===
    toNumeric(payload.totalAmount)
  ) {
    score += 1;
  }

  if (
    toNumeric(getCellByHeader(row, headerMap, "Collected")) ===
    toNumeric(payload.paidAmount)
  ) {
    score += 1;
  }

  return score;
}

function quoteSheetName(sheetName) {
  return `'${String(sheetName || "").replace(/'/g, "''")}'`;
}

function buildRange(sheetName, a1Range) {
  return `${quoteSheetName(sheetName)}!${a1Range}`;
}

function formatDateTime(value) {
  const date = value ? new Date(value) : null;

  if (!date || Number.isNaN(date.getTime())) {
    return "";
  }

  return format(date, "yyyy-MM-dd HH:mm");
}

function safeValue(value) {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value === "string" && /^[=+\-@]/.test(value)) {
    return `'${value}`;
  }

  return value;
}

function columnIndexToLetter(index) {
  let value = index + 1;
  let letter = "";

  while (value > 0) {
    const mod = (value - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    value = Math.floor((value - mod - 1) / 26);
  }

  return letter;
}

function isTotalRow(row = []) {
  return normalizeHeader(row[0]) === "total";
}

function buildTotalsRow(headers, lastDataRow) {
  return headers.map((header, index) => {
    if (index === 0) {
      return "TOTAL";
    }

    if (!totalFormulaHeaders.has(header)) {
      return "";
    }

    const column = columnIndexToLetter(index);
    const startRow = 2;
    const endRow = Math.max(startRow, lastDataRow);

    return `=SUM(${column}${startRow}:${column}${endRow})`;
  });
}

async function getLastUsedRow(sheets, sheetName) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: env.GOOGLE_SHEETS_ID,
    range: buildRange(sheetName, "A:A"),
    majorDimension: "COLUMNS",
  });

  return response.data.values?.[0]?.length || 0;
}

async function removeExistingTotalsRowIfPresent({
  sheets,
  sheetName,
  headerCount,
}) {
  const lastRow = await getLastUsedRow(sheets, sheetName);

  if (lastRow <= 1) {
    return;
  }

  const rowResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: env.GOOGLE_SHEETS_ID,
    range: buildRange(sheetName, `${lastRow}:${lastRow}`),
    majorDimension: "ROWS",
  });

  const row = rowResponse.data.values?.[0] || [];

  if (!isTotalRow(row)) {
    return;
  }

  const endColumn = columnIndexToLetter(Math.max(0, headerCount - 1));

  await sheets.spreadsheets.values.clear({
    spreadsheetId: env.GOOGLE_SHEETS_ID,
    range: buildRange(sheetName, `A${lastRow}:${endColumn}${lastRow}`),
  });
}

async function appendTotalsRow({ sheets, sheetName, headers, sheetId }) {
  const lastDataRow = await getLastUsedRow(sheets, sheetName);

  if (lastDataRow <= 1) {
    return;
  }

  const totalRowIndex = lastDataRow + 1;
  const endColumn = columnIndexToLetter(Math.max(0, headers.length - 1));

  await sheets.spreadsheets.values.update({
    spreadsheetId: env.GOOGLE_SHEETS_ID,
    range: buildRange(
      sheetName,
      `A${totalRowIndex}:${endColumn}${totalRowIndex}`,
    ),
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [buildTotalsRow(headers, lastDataRow)],
    },
  });

  if (sheetId !== undefined) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: env.GOOGLE_SHEETS_ID,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId,
                startRowIndex: totalRowIndex - 1,
                endRowIndex: totalRowIndex,
                startColumnIndex: 0,
                endColumnIndex: headers.length,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: {
                    red: 0.98,
                    green: 0.95,
                    blue: 0.86,
                  },
                  textFormat: {
                    bold: true,
                  },
                },
              },
              fields: "userEnteredFormat(backgroundColor,textFormat)",
            },
          },
        ],
      },
    });
  }
}

async function autoSizeSheet({ sheets, sheetId, headers, sheetName }) {
  if (sheetId === undefined) {
    return;
  }

  const usedRowCount = await getLastUsedRow(sheets, sheetName);
  const safeUsedRows = Math.max(1, usedRowCount);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: env.GOOGLE_SHEETS_ID,
    requestBody: {
      requests: [
        {
          autoResizeDimensions: {
            dimensions: {
              sheetId,
              dimension: "COLUMNS",
              startIndex: 0,
              endIndex: headers.length,
            },
          },
        },
        {
          autoResizeDimensions: {
            dimensions: {
              sheetId,
              dimension: "ROWS",
              startIndex: 0,
              endIndex: safeUsedRows,
            },
          },
        },
      ],
    },
  });
}

async function applyColumnFormats({
  sheets,
  sheetId,
  headers,
  numericHeaders,
}) {
  if (sheetId === undefined) {
    return;
  }

  const requests = [];
  const dateIndex = headers.indexOf("Date");

  if (dateIndex >= 0) {
    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 1,
          startColumnIndex: dateIndex,
          endColumnIndex: dateIndex + 1,
        },
        cell: {
          userEnteredFormat: {
            numberFormat: {
              type: "DATE_TIME",
              pattern: "yyyy-mm-dd hh:mm",
            },
          },
        },
        fields: "userEnteredFormat.numberFormat",
      },
    });
  }

  headers.forEach((header, index) => {
    if (!numericHeaders.has(header)) {
      return;
    }

    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 1,
          startColumnIndex: index,
          endColumnIndex: index + 1,
        },
        cell: {
          userEnteredFormat: {
            numberFormat: {
              type: "NUMBER",
              pattern: "0.##",
            },
          },
        },
        fields: "userEnteredFormat.numberFormat",
      },
    });
  });

  if (requests.length === 0) {
    return;
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: env.GOOGLE_SHEETS_ID,
    requestBody: {
      requests,
    },
  });
}

async function ensureSheetStructure({ sheets, sheetName, headers }) {
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId: env.GOOGLE_SHEETS_ID,
    includeGridData: false,
    fields: "sheets.properties",
  });

  let sheetProps = (metadata.data.sheets || [])
    .map((item) => item.properties)
    .find((item) => item.title === sheetName);

  if (!sheetProps) {
    const createResponse = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: env.GOOGLE_SHEETS_ID,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: sheetName,
              },
            },
          },
        ],
      },
    });

    sheetProps = createResponse.data.replies?.[0]?.addSheet?.properties || null;
  }

  const headerRead = await sheets.spreadsheets.values.get({
    spreadsheetId: env.GOOGLE_SHEETS_ID,
    range: buildRange(sheetName, "1:1"),
    majorDimension: "ROWS",
  });

  const firstRow = headerRead.data.values?.[0] || [];

  const hasExpectedHeaders = hasMatchingHeaders(firstRow, headers);
  const canMigrateLegacyTransactionHeaders =
    isTransactionSheetName(sheetName) &&
    hasMatchingHeaders(firstRow, transactionLegacyHeaders) &&
    !hasExpectedHeaders;

  if (!hasExpectedHeaders) {
    if (canMigrateLegacyTransactionHeaders) {
      const recordIdHeaderIndex = headers.indexOf("__RecordId");
      const recordIdHeaderCell = `${columnIndexToLetter(recordIdHeaderIndex)}1`;

      await sheets.spreadsheets.values.update({
        spreadsheetId: env.GOOGLE_SHEETS_ID,
        range: buildRange(sheetName, recordIdHeaderCell),
        valueInputOption: "RAW",
        requestBody: {
          values: [["__RecordId"]],
        },
      });
    } else {
      await sheets.spreadsheets.values.clear({
        spreadsheetId: env.GOOGLE_SHEETS_ID,
        range: buildRange(sheetName, "A:ZZ"),
      });

      if (sheetProps?.sheetId !== undefined) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: env.GOOGLE_SHEETS_ID,
          requestBody: {
            requests: [
              {
                repeatCell: {
                  range: {
                    sheetId: sheetProps.sheetId,
                    startColumnIndex: 0,
                    endColumnIndex: headers.length,
                  },
                  cell: {
                    userEnteredFormat: {},
                  },
                  fields: "userEnteredFormat",
                },
              },
            ],
          },
        });
      }

      await sheets.spreadsheets.values.update({
        spreadsheetId: env.GOOGLE_SHEETS_ID,
        range: buildRange(sheetName, "A1"),
        valueInputOption: "RAW",
        requestBody: {
          values: [headers],
        },
      });
    }
  }

  if (sheetProps?.sheetId !== undefined) {
    const hideTechnicalColumnsRequests = headers
      .map((header, index) => ({ header, index }))
      .filter(({ header }) => technicalHeaders.has(header))
      .map(({ index }) => ({
        updateDimensionProperties: {
          range: {
            sheetId: sheetProps.sheetId,
            dimension: "COLUMNS",
            startIndex: index,
            endIndex: index + 1,
          },
          properties: {
            hiddenByUser: true,
          },
          fields: "hiddenByUser",
        },
      }));

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: env.GOOGLE_SHEETS_ID,
      requestBody: {
        requests: [
          {
            updateSheetProperties: {
              properties: {
                sheetId: sheetProps.sheetId,
                gridProperties: {
                  frozenRowCount: 1,
                },
              },
              fields: "gridProperties.frozenRowCount",
            },
          },
          {
            repeatCell: {
              range: {
                sheetId: sheetProps.sheetId,
                startRowIndex: 0,
                endRowIndex: 1,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: {
                    red: 0.91,
                    green: 0.96,
                    blue: 0.95,
                  },
                  textFormat: {
                    bold: true,
                  },
                  horizontalAlignment: "CENTER",
                  verticalAlignment: "MIDDLE",
                  wrapStrategy: "CLIP",
                },
              },
              fields:
                "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)",
            },
          },
          {
            repeatCell: {
              range: {
                sheetId: sheetProps.sheetId,
                startRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: headers.length,
              },
              cell: {
                userEnteredFormat: {
                  verticalAlignment: "MIDDLE",
                  wrapStrategy: "CLIP",
                },
              },
              fields: "userEnteredFormat(verticalAlignment,wrapStrategy)",
            },
          },
          ...hideTechnicalColumnsRequests,
        ],
      },
    });

    await autoSizeSheet({
      sheets,
      sheetId: sheetProps.sheetId,
      headers,
      sheetName,
    });
  }

  preparedSheets.add(sheetName);
  preparedSheetMeta.set(sheetName, {
    sheetId: sheetProps?.sheetId,
  });

  return preparedSheetMeta.get(sheetName);
}

function getNumericHeadersForSheet(sheetName) {
  return isTransactionSheetName(sheetName)
    ? transactionNumericHeaders
    : stockNumericHeaders;
}

function buildTransactionRow(payload) {
  return [
    formatDateTime(payload.date),
    safeValue(payload.customerName),
    safeValue(payload.customerType),
    safeValue(payload.entryType),
    safeValue(payload.filledDelivered),
    safeValue(payload.emptyReturned),
    safeValue(payload.currentPending),
    safeValue(payload.rate),
    safeValue(payload.totalAmount),
    safeValue(payload.paidAmount),
    safeValue(payload.paymentMode),
    safeValue(payload.notes),
    safeValue(payload.recordId),
  ];
}

async function finalizeSheetAfterMutation({
  sheets,
  sheetMeta,
  sheetName,
  headers,
}) {
  await appendTotalsRow({
    sheets,
    sheetName,
    headers,
    sheetId: sheetMeta?.sheetId,
  });

  await autoSizeSheet({
    sheets,
    sheetId: sheetMeta?.sheetId,
    headers,
    sheetName,
  });

  await applyColumnFormats({
    sheets,
    sheetId: sheetMeta?.sheetId,
    headers,
    numericHeaders: getNumericHeadersForSheet(sheetName),
  });
}

async function findTransactionRowByRecordId({
  sheets,
  sheetName,
  headers,
  recordId,
}) {
  if (!recordId) {
    return null;
  }

  const recordIdIndex = headers.indexOf("__RecordId");

  if (recordIdIndex < 0) {
    return null;
  }

  const recordIdColumn = columnIndexToLetter(recordIdIndex);
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: env.GOOGLE_SHEETS_ID,
    range: buildRange(sheetName, `${recordIdColumn}:${recordIdColumn}`),
    majorDimension: "COLUMNS",
  });

  const columnValues = response.data.values?.[0] || [];
  const targetId = String(recordId);

  for (let rowIndex = 2; rowIndex <= columnValues.length; rowIndex += 1) {
    if (String(columnValues[rowIndex - 1] || "") === targetId) {
      return rowIndex;
    }
  }

  return null;
}

async function findBestMatchingTransactionRow({
  sheets,
  sheetName,
  headers,
  payload,
}) {
  if (!payload) {
    return null;
  }

  const lastRow = await getLastUsedRow(sheets, sheetName);

  if (lastRow <= 1) {
    return null;
  }

  const endColumn = columnIndexToLetter(Math.max(0, headers.length - 1));
  const rowsResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: env.GOOGLE_SHEETS_ID,
    range: buildRange(sheetName, `A2:${endColumn}${lastRow}`),
    majorDimension: "ROWS",
  });

  const rows = rowsResponse.data.values || [];
  const headerMap = buildHeaderIndexMap(headers);
  let bestScore = 0;
  let bestRowIndex = null;

  rows.forEach((row, index) => {
    if (isTotalRow(row)) {
      return;
    }

    const score = scoreTransactionRowMatch(row, headerMap, payload);

    if (score > bestScore || (score === bestScore && score > 0)) {
      bestScore = score;
      bestRowIndex = index + 2;
    }
  });

  return bestScore >= 6 ? bestRowIndex : null;
}

async function resolveTransactionRowIndex({
  sheets,
  sheetName,
  headers,
  payload,
}) {
  const recordIdRowIndex = await findTransactionRowByRecordId({
    sheets,
    sheetName,
    headers,
    recordId: payload?.recordId,
  });

  if (recordIdRowIndex) {
    return recordIdRowIndex;
  }

  const candidatePayloads = [payload?.previous, payload].filter(Boolean);

  for (const candidate of candidatePayloads) {
    const rowIndex = await findBestMatchingTransactionRow({
      sheets,
      sheetName,
      headers,
      payload: candidate,
    });

    if (rowIndex) {
      return rowIndex;
    }
  }

  return null;
}

async function appendRows(sheetName, headers, values) {
  const sheets = getSheetsClient();

  const sheetMeta = await ensureSheetStructure({
    sheets,
    sheetName,
    headers,
  });

  await removeExistingTotalsRowIfPresent({
    sheets,
    sheetName,
    headerCount: headers.length,
  });

  await sheets.spreadsheets.values.append({
    spreadsheetId: env.GOOGLE_SHEETS_ID,
    range: buildRange(sheetName, "A2"),
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values,
    },
  });

  await finalizeSheetAfterMutation({
    sheets,
    sheetMeta,
    sheetName,
    headers,
  });
}

async function syncTransactionToGoogleSheet(action, payload) {
  const sheetName = env.GOOGLE_SHEETS_TRANSACTIONS_SHEET || "Transactions";
  const headers = transactionHeaders;
  const sheets = getSheetsClient();

  const sheetMeta = await ensureSheetStructure({
    sheets,
    sheetName,
    headers,
  });

  await removeExistingTotalsRowIfPresent({
    sheets,
    sheetName,
    headerCount: headers.length,
  });

  if (action === "DELETE") {
    const rowIndex = await resolveTransactionRowIndex({
      sheets,
      sheetName,
      headers,
      payload,
    });

    if (rowIndex && rowIndex > 1) {
      if (sheetMeta?.sheetId !== undefined) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: env.GOOGLE_SHEETS_ID,
          requestBody: {
            requests: [
              {
                deleteDimension: {
                  range: {
                    sheetId: sheetMeta.sheetId,
                    dimension: "ROWS",
                    startIndex: rowIndex - 1,
                    endIndex: rowIndex,
                  },
                },
              },
            ],
          },
        });
      } else {
        const endColumn = columnIndexToLetter(Math.max(0, headers.length - 1));
        await sheets.spreadsheets.values.clear({
          spreadsheetId: env.GOOGLE_SHEETS_ID,
          range: buildRange(sheetName, `A${rowIndex}:${endColumn}${rowIndex}`),
        });
      }
    }
  } else if (action === "UPDATE") {
    const rowIndex = await resolveTransactionRowIndex({
      sheets,
      sheetName,
      headers,
      payload,
    });
    const rowValues = buildTransactionRow(payload);

    if (rowIndex && rowIndex > 1) {
      const endColumn = columnIndexToLetter(Math.max(0, headers.length - 1));
      await sheets.spreadsheets.values.update({
        spreadsheetId: env.GOOGLE_SHEETS_ID,
        range: buildRange(sheetName, `A${rowIndex}:${endColumn}${rowIndex}`),
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [rowValues],
        },
      });
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId: env.GOOGLE_SHEETS_ID,
        range: buildRange(sheetName, "A2"),
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: {
          values: [rowValues],
        },
      });
    }
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId: env.GOOGLE_SHEETS_ID,
      range: buildRange(sheetName, "A2"),
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [buildTransactionRow(payload)],
      },
    });
  }

  await finalizeSheetAfterMutation({
    sheets,
    sheetMeta,
    sheetName,
    headers,
  });
}

async function appendTransactionToGoogleSheet(payload) {
  await syncTransactionToGoogleSheet("CREATE", payload);
}

async function appendStockMovementToGoogleSheet(payload) {
  const sheetName = env.GOOGLE_SHEETS_STOCK_SHEET || "StockMovements";

  await appendRows(sheetName, stockHeaders, [
    [
      formatDateTime(payload.date),
      safeValue(payload.type),
      safeValue(payload.quantity),
      safeValue(payload.deltaFilled),
      safeValue(payload.deltaEmpty),
      safeValue(payload.deltaIssued),
      safeValue(payload.pricePerCylinder),
      safeValue(payload.totalPrice),
      safeValue(payload.supplierNote),
      safeValue(payload.notes),
    ],
  ]);
}

module.exports = {
  syncTransactionToGoogleSheet,
  appendTransactionToGoogleSheet,
  appendStockMovementToGoogleSheet,
};
