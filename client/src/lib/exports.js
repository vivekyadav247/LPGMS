import {
  formatCurrency,
  formatDate,
  getEntryTypeLabel,
  getPaymentModeLabel,
  getPaymentStatusLabel,
} from "./utils";

function sanitizeFilename(value) {
  return String(value || "export")
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function exportToCsv(rows, filename) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`)
        .join(","),
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${sanitizeFilename(filename)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
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

function isNumericValue(value) {
  if (value === null || value === undefined || value === "") {
    return false;
  }

  const number = Number(value);
  return Number.isFinite(number);
}

export async function exportToExcel(data, filename, sheetName = "Sheet1") {
  const { Workbook } = await import("exceljs");

  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  if (data.length > 0) {
    const keys = Object.keys(data[0]);
    const numericColumns = new Set(
      keys.filter((key) => data.some((row) => isNumericValue(row[key]))),
    );

    const tableName = `Table_${sanitizeFilename(sheetName).replace(/-/g, "_")}_${Date.now()}`;

    worksheet.addTable({
      name: tableName,
      ref: "A1",
      headerRow: true,
      totalsRow: true,
      style: {
        theme: "TableStyleMedium9",
        showRowStripes: true,
      },
      columns: keys.map((key, index) => {
        if (index === 0) {
          return {
            name: key,
            totalsRowLabel: "TOTAL",
          };
        }

        if (numericColumns.has(key)) {
          return {
            name: key,
            totalsRowFunction: "sum",
          };
        }

        return {
          name: key,
        };
      }),
      rows: data.map((row) => keys.map((key) => row[key] ?? "")),
    });

    keys.forEach((key, index) => {
      const maxCellLength = data.reduce((max, row) => {
        const value = row[key];
        return Math.max(max, String(value ?? "").length);
      }, key.length);

      worksheet.getColumn(index + 1).width = Math.min(
        42,
        Math.max(14, maxCellLength + 4),
      );
    });

    worksheet.views = [{ state: "frozen", ySplit: 1 }];
    worksheet.autoFilter = {
      from: "A1",
      to: `${columnIndexToLetter(keys.length - 1)}1`,
    };

    const totalRowNumber = data.length + 2;
    worksheet.getRow(1).font = { bold: true, color: { argb: "FF111827" } };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE5EEF5" },
    };
    worksheet.getRow(totalRowNumber).font = {
      bold: true,
      color: { argb: "FF111827" },
    };
    worksheet.getRow(totalRowNumber).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF8E9C2" },
    };

    const border = {
      top: { style: "thin", color: { argb: "FFD1D5DB" } },
      left: { style: "thin", color: { argb: "FFD1D5DB" } },
      bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
      right: { style: "thin", color: { argb: "FFD1D5DB" } },
    };

    for (let rowIndex = 1; rowIndex <= totalRowNumber; rowIndex += 1) {
      for (let columnIndex = 1; columnIndex <= keys.length; columnIndex += 1) {
        const cell = worksheet.getCell(rowIndex, columnIndex);
        cell.border = border;
        cell.alignment = {
          vertical: "middle",
          horizontal: rowIndex === 1 ? "center" : "left",
          wrapText: true,
        };
      }
    }

    keys.forEach((key, index) => {
      if (!numericColumns.has(key)) {
        return;
      }

      const columnLetter = columnIndexToLetter(index);
      for (let rowIndex = 2; rowIndex <= totalRowNumber; rowIndex += 1) {
        worksheet.getCell(`${columnLetter}${rowIndex}`).numFmt = "#,##0.00";
      }
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${sanitizeFilename(filename)}.xlsx`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export async function exportLedgerPdf(customer, transactions) {
  const printWindow = window.open("", "_blank", "noopener,noreferrer");

  if (!printWindow) {
    throw new Error("Popup blocked. Allow popups to export PDF.");
  }

  const rowsHtml = transactions
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(formatDate(item.date))}</td>
          <td>${escapeHtml(getEntryTypeLabel(item))}</td>
          <td>${escapeHtml(item.filledDelivered)}</td>
          <td>${escapeHtml(item.emptyReturned)}</td>
          <td>${escapeHtml(item.currentPending)}</td>
          <td>${escapeHtml(formatCurrency(item.totalAmount))}</td>
          <td>${escapeHtml(formatCurrency(item.paidAmount))}</td>
          <td>${escapeHtml(getPaymentStatusLabel(item))}</td>
          <td>${escapeHtml(getPaymentModeLabel(item.paymentMode))}</td>
        </tr>
      `,
    )
    .join("");

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(customer.name)} Ledger</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
          h1 { margin-bottom: 8px; }
          .meta { margin-bottom: 16px; color: #4b5563; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; font-size: 12px; }
          th { background: #f3f4f6; }
        </style>
      </head>
      <body>
        <h1>Customer Ledger - ${escapeHtml(customer.name)}</h1>
        <div class="meta">Phone: ${escapeHtml(customer.phone || "-")}</div>
        <div class="meta">Address: ${escapeHtml(customer.address || "-")}</div>
        <div class="meta">Pending Cylinders: ${escapeHtml(customer.currentPendingCylinders)}</div>
        <div class="meta">Outstanding: ${escapeHtml(formatCurrency(customer.totalCreditBalance))}</div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Filled</th>
              <th>Returned</th>
              <th>Pending</th>
              <th>Amount</th>
              <th>Paid</th>
              <th>Collection</th>
              <th>Mode</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}
