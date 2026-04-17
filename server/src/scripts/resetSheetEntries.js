require("dotenv").config();

const { google } = require("googleapis");

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

function quoteSheetName(sheetName) {
  return `'${String(sheetName || "").replace(/'/g, "''")}'`;
}

function buildRange(sheetName, a1Range) {
  return `${quoteSheetName(sheetName)}!${a1Range}`;
}

function buildSeedTotalsRow(headers) {
  return headers.map((header, index) => {
    if (index === 0) {
      return "TOTAL";
    }

    if (!totalFormulaHeaders.has(header)) {
      return "";
    }

    const column = columnIndexToLetter(index);
    return `=SUM(${column}3:${column})`;
  });
}

function getSheetsClient() {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID || "";
  const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "";
  const privateKey = (
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || ""
  ).replace(/\\n/g, "\n");

  if (!spreadsheetId || !serviceEmail || !privateKey) {
    throw new Error("Google Sheets environment variables are incomplete");
  }

  const auth = new google.auth.JWT({
    email: serviceEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return {
    spreadsheetId,
    sheets: google.sheets({ version: "v4", auth }),
  };
}

async function getSheetProps(sheets, spreadsheetId, sheetName) {
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId,
    includeGridData: false,
    fields: "sheets.properties",
  });

  return (metadata.data.sheets || [])
    .map((entry) => entry.properties)
    .find((entry) => entry.title === sheetName);
}

async function resetSheetData({ sheets, spreadsheetId, sheetName }) {
  const sheetProps = await getSheetProps(sheets, spreadsheetId, sheetName);

  if (!sheetProps) {
    throw new Error(`Sheet not found: ${sheetName}`);
  }

  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: buildRange(sheetName, "1:1"),
    majorDimension: "ROWS",
  });

  const headers = headerResponse.data.values?.[0] || [];

  if (headers.length === 0) {
    throw new Error(`Header row is missing in sheet: ${sheetName}`);
  }

  const endColumn = columnIndexToLetter(headers.length - 1);

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: buildRange(sheetName, `A2:${endColumn}`),
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: buildRange(sheetName, `A2:${endColumn}2`),
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [buildSeedTotalsRow(headers)],
    },
  });

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          repeatCell: {
            range: {
              sheetId: sheetProps.sheetId,
              startRowIndex: 1,
              endRowIndex: 2,
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

  return {
    sheetName,
    headers: headers.length,
    totalRow: 2,
  };
}

async function run() {
  const transactionsSheetName =
    process.env.GOOGLE_SHEETS_TRANSACTIONS_SHEET || "Transactions";
  const stockSheetName =
    process.env.GOOGLE_SHEETS_STOCK_SHEET || "StockMovements";

  const { sheets, spreadsheetId } = getSheetsClient();

  const results = [];
  results.push(
    await resetSheetData({
      sheets,
      spreadsheetId,
      sheetName: transactionsSheetName,
    }),
  );
  results.push(
    await resetSheetData({
      sheets,
      spreadsheetId,
      sheetName: stockSheetName,
    }),
  );

  process.stdout.write(`Sheet entries reset: ${JSON.stringify(results)}\n`);
  process.exit(0);
}

run().catch((error) => {
  const detail = error?.message ? `: ${error.message}` : "";
  process.stderr.write(`Sheet entries reset failed${detail}\n`);
  process.exit(1);
});
