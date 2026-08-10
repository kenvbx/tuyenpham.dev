import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const rootDir = "/Volumes/WORKSPACE/PROJECT/TUYENPHAM/tuyenpham.dev";
const sourcePath = path.join(rootDir, "CMS_TASK_TRACKING.md");
const outputDir = path.join(rootDir, "outputs", "cms-task-tracking");
const outputPath = path.join(outputDir, "cms-task-tracking.xlsx");

const md = await fs.readFile(sourcePath, "utf8");

function splitTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim().replace(/`/g, ""));
}

function isSeparator(line) {
  return /^\|\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line.trim());
}

function extractTables(markdown) {
  const lines = markdown.split(/\r?\n/);
  const sections = [];
  let currentHeading = "General";

  for (let i = 0; i < lines.length; i += 1) {
    const heading = lines[i].match(/^##\s+(.+)$/);
    if (heading) {
      currentHeading = heading[1].trim();
      continue;
    }

    if (!lines[i].trim().startsWith("|")) continue;
    if (i + 1 >= lines.length || !isSeparator(lines[i + 1])) continue;

    const headers = splitTableRow(lines[i]);
    const rows = [];
    i += 2;
    while (i < lines.length && lines[i].trim().startsWith("|")) {
      rows.push(splitTableRow(lines[i]));
      i += 1;
    }
    i -= 1;
    sections.push({ heading: currentHeading, headers, rows });
  }

  return sections;
}

const tables = extractTables(md);
const taskTables = tables.filter((table) => table.headers.includes("ID") && table.headers.includes("Task"));
const tasks = taskTables.flatMap((table) =>
  table.rows.map((row) => {
    const record = Object.fromEntries(table.headers.map((header, index) => [header, row[index] ?? ""]));
    return {
      Phase: table.heading.replace(/^Phase\s+/, ""),
      ID: record.ID,
      Task: record.Task,
      Priority: record.Priority,
      Status: record.Status,
      Owner: record.Owner,
      Dependencies: record.Dependencies,
      Deliverable: record.Deliverable,
      "Acceptance Criteria": record["Acceptance Criteria"],
    };
  }),
);

const permissionsTable = tables.find((table) => table.heading === "Permission Matrix Draft");
const mvpTable = tables.find((table) => table.heading === "MVP Cut");
const sprintTable = tables.find((table) => table.heading === "Recommended First Sprint");
const statusLegend = tables.find((table) => table.heading === "Status Legend");
const priorityLegend = tables.find((table) => table.heading === "Priority Legend");

const workbook = Workbook.create();

const colors = {
  navy: "#1F2A44",
  blue: "#2563EB",
  lightBlue: "#DBEAFE",
  green: "#16A34A",
  lightGreen: "#DCFCE7",
  amber: "#D97706",
  lightAmber: "#FEF3C7",
  red: "#DC2626",
  lightRed: "#FEE2E2",
  purple: "#7C3AED",
  lightPurple: "#EDE9FE",
  gray: "#64748B",
  lightGray: "#F1F5F9",
  border: "#CBD5E1",
  white: "#FFFFFF",
};

function setTitle(sheet, title, subtitle, range = "A1:H1") {
  sheet.showGridLines = false;
  sheet.getRange(range).merge();
  sheet.getRange(range).values = [[title]];
  sheet.getRange(range).format.fill.color = colors.navy;
  sheet.getRange(range).format.font.color = colors.white;
  sheet.getRange(range).format.font.bold = true;
  sheet.getRange(range).format.font.size = 16;
  sheet.getRange(range).format.rowHeightPx = 34;
  if (subtitle) {
    const subtitleRange = range.replace(/1/g, "2");
    sheet.getRange(subtitleRange).merge();
    sheet.getRange(subtitleRange).values = [[subtitle]];
    sheet.getRange(subtitleRange).format.fill.color = colors.lightGray;
    sheet.getRange(subtitleRange).format.font.color = colors.gray;
    sheet.getRange(subtitleRange).format.font.size = 10;
    sheet.getRange(subtitleRange).format.rowHeightPx = 24;
  }
}

function styleTable(sheet, rangeAddress, tableName) {
  const table = sheet.tables.add(rangeAddress, true, tableName);
  table.style = "TableStyleMedium2";
  table.showFilterButton = true;
  const header = table.getHeaderRowRange();
  header.format.fill.color = colors.navy;
  header.format.font.color = colors.white;
  header.format.font.bold = true;
  header.format.wrapText = true;
  sheet.getRange(rangeAddress).format.borders = { preset: "insideHorizontal", style: "thin", color: colors.border };
  return table;
}

function writeTable(sheet, startRow, startCol, headers, rows, tableName) {
  const matrix = [headers, ...rows];
  const range = sheet.getRangeByIndexes(startRow, startCol, matrix.length, headers.length);
  range.values = matrix;
  range.format.wrapText = true;
  range.format.verticalAlignment = "top";
  const endCol = String.fromCharCode("A".charCodeAt(0) + startCol + headers.length - 1);
  const startCell = `${String.fromCharCode("A".charCodeAt(0) + startCol)}${startRow + 1}`;
  const endCell = `${endCol}${startRow + matrix.length}`;
  styleTable(sheet, `${startCell}:${endCell}`, tableName);
  return { range, tableRange: `${startCell}:${endCell}` };
}

function addValidation(sheet, range, values) {
  sheet.getRange(range).dataValidation = {
    rule: { type: "list", values },
    prompt: { showPrompt: true, title: "Allowed values", message: values.join(", ") },
  };
}

function addStatusPriorityConditionalFormatting(sheet, rowCount) {
  const statusRange = sheet.getRange(`E4:E${rowCount + 3}`);
  const priorityRange = sheet.getRange(`D4:D${rowCount + 3}`);
  for (const [text, fill, font] of [
    ["todo", colors.lightGray, colors.gray],
    ["ready", colors.lightBlue, colors.blue],
    ["in_progress", colors.lightAmber, colors.amber],
    ["blocked", colors.lightRed, colors.red],
    ["review", colors.lightPurple, colors.purple],
    ["done", colors.lightGreen, colors.green],
  ]) {
    statusRange.conditionalFormats.add("containsText", { text, format: { fill: { color: fill }, font: { color: font, bold: true } } });
  }
  for (const [text, fill, font] of [
    ["P0", colors.lightRed, colors.red],
    ["P1", colors.lightAmber, colors.amber],
    ["P2", colors.lightBlue, colors.blue],
    ["P3", colors.lightGray, colors.gray],
  ]) {
    priorityRange.conditionalFormats.add("containsText", { text, format: { fill: { color: fill }, font: { color: font, bold: true } } });
  }
}

const summary = workbook.worksheets.add("Summary");
setTitle(summary, "CMS Task Tracking", "Roadmap CMS lay cam hung tu Botble, dung React + TypeScript + Vite, Express + TypeScript va Supabase.", "A1:H1");
summary.getRange("A4:B10").values = [
  ["Metric", "Value"],
  ["Total tasks", tasks.length],
  ["P0 tasks", tasks.filter((task) => task.Priority === "P0").length],
  ["P1 tasks", tasks.filter((task) => task.Priority === "P1").length],
  ["P2 tasks", tasks.filter((task) => task.Priority === "P2").length],
  ["P3 tasks", tasks.filter((task) => task.Priority === "P3").length],
  ["Source", sourcePath],
];
styleTable(summary, "A4:B10", "SummaryMetrics");

const phaseCounts = Array.from(
  tasks.reduce((map, task) => {
    const current = map.get(task.Phase) ?? { Phase: task.Phase, Total: 0, P0: 0, P1: 0, P2: 0, P3: 0 };
    current.Total += 1;
    if (["P0", "P1", "P2", "P3"].includes(task.Priority)) current[task.Priority] += 1;
    map.set(task.Phase, current);
    return map;
  }, new Map()).values(),
);
writeTable(
  summary,
  3,
  3,
  ["Phase", "Total", "P0", "P1", "P2", "P3"],
  phaseCounts.map((item) => [item.Phase, item.Total, item.P0, item.P1, item.P2, item.P3]),
  "PhaseSummary",
);
summary.getRange("A4:H40").format.autofitColumns();
summary.getRange("A4:H40").format.autofitRows();
summary.freezePanes.freezeRows(3);

const backlog = workbook.worksheets.add("Task Backlog");
setTitle(backlog, "Task Backlog", "Bang theo doi chi tiet: co filter, validation va conditional formatting cho priority/status.", "A1:I1");
const taskHeaders = ["Phase", "ID", "Task", "Priority", "Status", "Owner", "Dependencies", "Deliverable", "Acceptance Criteria"];
writeTable(
  backlog,
  2,
  0,
  taskHeaders,
  tasks.map((task) => taskHeaders.map((header) => task[header])),
  "TaskBacklog",
);
addValidation(backlog, `D4:D${tasks.length + 3}`, ["P0", "P1", "P2", "P3"]);
addValidation(backlog, `E4:E${tasks.length + 3}`, ["todo", "ready", "in_progress", "blocked", "review", "done"]);
addValidation(backlog, `F4:F${tasks.length + 3}`, ["Product", "Tech", "Backend", "Frontend", "Fullstack", "DevOps", "QA", "Security", "Product/Tech", "Frontend/Backend", "Backend/Frontend"]);
addStatusPriorityConditionalFormatting(backlog, tasks.length);
backlog.freezePanes.freezeRows(3);
backlog.freezePanes.freezeColumns(2);
backlog.getRange("A:I").format.font.size = 10;
backlog.getRange("A:A").format.columnWidth = 26;
backlog.getRange("B:B").format.columnWidth = 12;
backlog.getRange("C:C").format.columnWidth = 34;
backlog.getRange("D:E").format.columnWidth = 14;
backlog.getRange("F:F").format.columnWidth = 20;
backlog.getRange("G:I").format.columnWidth = 32;
backlog.getRange(`A4:I${tasks.length + 3}`).format.rowHeightPx = 42;

const permissions = workbook.worksheets.add("Permissions");
setTitle(permissions, "Permission Matrix", "Draft permission flags dua tren Botble ACL pattern.", "A1:B1");
if (permissionsTable) {
  writeTable(permissions, 2, 0, permissionsTable.headers, permissionsTable.rows, "PermissionMatrix");
}
permissions.freezePanes.freezeRows(3);
permissions.getRange("A:B").format.autofitColumns();

const mvp = workbook.worksheets.add("MVP Cut");
setTitle(mvp, "MVP Cut", "Nhung nhom task bat buoc de dat MVP.", "A1:B1");
if (mvpTable) {
  writeTable(mvp, 2, 0, mvpTable.headers, mvpTable.rows, "MVPCut");
}
mvp.freezePanes.freezeRows(3);
mvp.getRange("A:A").format.columnWidth = 24;
mvp.getRange("B:B").format.columnWidth = 80;
mvp.getRange("A:B").format.wrapText = true;

const sprint = workbook.worksheets.add("First Sprint");
setTitle(sprint, "Recommended First Sprint", "Sprint dau tien nen tao vertical slice: scaffold, Supabase, auth, admin shell.", "A1:B1");
if (sprintTable) {
  writeTable(sprint, 2, 0, sprintTable.headers, sprintTable.rows, "FirstSprint");
}
sprint.freezePanes.freezeRows(3);
sprint.getRange("A:A").format.columnWidth = 30;
sprint.getRange("B:B").format.columnWidth = 90;
sprint.getRange("A:B").format.wrapText = true;

const lists = workbook.worksheets.add("Lists");
setTitle(lists, "Editable Lists", "Danh muc dung cho validation va giai thich status/priority.", "A1:D1");
const statusRows = statusLegend ? statusLegend.rows : [];
const priorityRows = priorityLegend ? priorityLegend.rows : [];
lists.getRange("A3:B3").values = [["Status", "Meaning"]];
lists.getRangeByIndexes(3, 0, statusRows.length, 2).values = statusRows;
styleTable(lists, `A3:B${statusRows.length + 3}`, "StatusLegend");
lists.getRange("D3:E3").values = [["Priority", "Meaning"]];
lists.getRangeByIndexes(3, 3, priorityRows.length, 2).values = priorityRows;
styleTable(lists, `D3:E${priorityRows.length + 3}`, "PriorityLegend");
lists.getRange("A:E").format.autofitColumns();

for (const sheetName of ["Summary", "Task Backlog", "Permissions", "MVP Cut", "First Sprint", "Lists"]) {
  const sheet = workbook.worksheets.getItem(sheetName);
  sheet.getUsedRange().format.font.name = "Aptos";
}

await fs.mkdir(outputDir, { recursive: true });

const inspectBacklog = await workbook.inspect({
  kind: "table",
  sheetId: "Task Backlog",
  range: "A1:I12",
  include: "values,formulas",
  tableMaxRows: 12,
  tableMaxCols: 9,
});
console.log(inspectBacklog.ndjson);

const errorScan = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "formula error scan",
});
console.log(errorScan.ndjson);

for (const sheetName of ["Summary", "Task Backlog", "Permissions", "MVP Cut", "First Sprint", "Lists"]) {
  const blob = await workbook.render({ sheetName, autoCrop: "all", scale: 1, format: "png" });
  const bytes = new Uint8Array(await blob.arrayBuffer());
  await fs.writeFile(path.join(outputDir, `${sheetName.replaceAll(" ", "-").toLowerCase()}.png`), bytes);
}

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(outputPath);
