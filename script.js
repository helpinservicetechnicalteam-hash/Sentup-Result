// In-memory storage for class-wise results
const resultsData = {
  "10": [],
  "12": []
};

// Column name helpers (case-insensitive)
function normalizeKey(key) {
  return String(key || "").trim().toLowerCase();
}

// Try to detect registration number column from any common variant
const possibleRegCols = ["registrationno", "regno", "reg_no", "reg_number", "registration no", "reg no"];

// Elements
const adminBtn = document.getElementById("adminBtn");
const studentLanding = document.getElementById("student-landing");
const resultSection = document.getElementById("result-section");
const regNoInput = document.getElementById("regNoInput");
const viewResultBtn = document.getElementById("viewResultBtn");
const studentError = document.getElementById("studentError");

const adminLoginModal = document.getElementById("adminLoginModal");
const adminPasswordInput = document.getElementById("adminPassword");
const adminLoginBtn = document.getElementById("adminLoginBtn");
const adminCancelBtn = document.getElementById("adminCancelBtn");
const adminLoginError = document.getElementById("adminLoginError");

const adminPanel = document.getElementById("admin-panel");
const classSelect = document.getElementById("classSelect");
const excelFileInput = document.getElementById("excelFileInput");
const uploadExcelBtn = document.getElementById("uploadExcelBtn");
const adminStatus = document.getElementById("adminStatus");
const adminLogoutBtn = document.getElementById("adminLogoutBtn");

const stNameSpan = document.getElementById("stName");
const stClassSpan = document.getElementById("stClass");
const stRegSpan = document.getElementById("stReg");
const marksBody = document.getElementById("marksBody");
const totalMarksSpan = document.getElementById("totalMarks");
const percentageSpan = document.getElementById("percentage");
const resultStatusSpan = document.getElementById("resultStatus");
const printBtn = document.getElementById("printBtn");
const nextResultBtn = document.getElementById("nextResultBtn");

// Admin default passkey
const ADMIN_PASSKEY = "Admin1234";

// Show / hide helpers
function showElement(el) {
  el.classList.remove("hidden");
}
function hideElement(el) {
  el.classList.add("hidden");
}

// Open admin login modal
adminBtn.addEventListener("click", () => {
  adminPasswordInput.value = "";
  adminLoginError.textContent = "";
  showElement(adminLoginModal);
  adminPasswordInput.focus();
});

// Close admin login modal
adminCancelBtn.addEventListener("click", () => {
  hideElement(adminLoginModal);
});

// Admin login
adminLoginBtn.addEventListener("click", () => {
  const entered = adminPasswordInput.value.trim();
  if (entered === ADMIN_PASSKEY) {
    hideElement(adminLoginModal);
    showElement(adminPanel);
    hideElement(studentLanding);
    hideElement(resultSection);
    adminLoginError.textContent = "";
  } else {
    adminLoginError.textContent = "Incorrect passkey.";
  }
});

// Allow Enter key for admin login
adminPasswordInput.addEventListener("keyup", (e) => {
  if (e.key === "Enter") {
    adminLoginBtn.click();
  }
});

// Admin logout
adminLogoutBtn.addEventListener("click", () => {
  hideElement(adminPanel);
  hideElement(resultSection);
  showElement(studentLanding);
});

// Upload Excel file and parse (auto header)
uploadExcelBtn.addEventListener("click", () => {
  const file = excelFileInput.files[0];
  const selectedClass = classSelect.value;
  if (!file) {
    adminStatus.textContent = "Please choose an Excel file first.";
    adminStatus.style.color = "#b91c1c";
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // Get all data as array of arrays to read header row easily
      const sheetArr = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }); [web:4][web:12]
      if (!sheetArr.length) {
        adminStatus.textContent = "The file is empty or invalid.";
        adminStatus.style.color = "#b91c1c";
        return;
      }

      const headerRow = sheetArr[0]; // first row = headings
      const dataRows = sheetArr.slice(1);

      // Build array of objects using header row as keys
      const jsonData = dataRows
        .filter(row => row.some(cell => String(cell).trim() !== "")) // remove fully empty rows
        .map(row => {
          const obj = {};
          headerRow.forEach((colName, index) => {
            if (!colName) return;
            obj[String(colName).trim()] = row[index];
          });
          return obj;
        });

      resultsData[selectedClass] = jsonData;

      adminStatus.textContent = `Result file for Class ${selectedClass} uploaded successfully. Columns detected: ${headerRow.join(", ")}`;
      adminStatus.style.color = "#047857";
    } catch (err) {
      console.error(err);
      adminStatus.textContent = "Error reading the file.";
      adminStatus.style.color = "#b91c1c";
    }
  };

  reader.onerror = function () {
    adminStatus.textContent = "Error reading the file.";
    adminStatus.style.color = "#b91c1c";
  };

  reader.readAsArrayBuffer(file);
});

// Find registration column name from header set
function findRegColumnName(record) {
  if (!record) return null;
  const keys = Object.keys(record);
  for (const key of keys) {
    const nk = normalizeKey(key);
    if (possibleRegCols.includes(nk)) return key;
  }
  // fallback: if exactly one column contains "reg"
  const regLike = keys.filter(k => normalizeKey(k).includes("reg"));
  if (regLike.length === 1) return regLike[0];
  return null;
}

// Try to detect "Name" and "Class" columns
function findColumnName(record, wanted) {
  if (!record) return null;
  const keys = Object.keys(record);
  const wantedNorm = normalizeKey(wanted);
  // exact match
  for (const key of keys) {
    if (normalizeKey(key) === wantedNorm) return key;
  }
  // contains
  for (const key of keys) {
    if (normalizeKey(key).includes(wantedNorm)) return key;
  }
  return null;
}

// Student: search result by registration number (any header names)
viewResultBtn.addEventListener("click", () => {
  studentError.textContent = "";
  const regNo = regNoInput.value.trim();
  if (!regNo) {
    studentError.textContent = "Please enter your registration number.";
    return;
  }

  let record = null;
  let foundClass = null;
  let regColName = null;

  ["10", "12"].some((cls) => {
    const list = resultsData[cls] || [];
    if (!list.length) return false;

    // Determine registration column name from first row of this class
    const firstRow = list[0];
    const thisRegCol = findRegColumnName(firstRow);
    if (!thisRegCol) return false;

    const match = list.find((row) =>
      String(row[thisRegCol]).trim().toLowerCase() === regNo.toLowerCase()
    );

    if (match) {
      record = match;
      foundClass = cls;
      regColName = thisRegCol;
      return true;
    }
    return false;
  });

  if (!record) {
    studentError.textContent = "Result not found. Please check your registration number or contact school.";
    return;
  }

  fillMarksheet(record, foundClass, regColName);
  hideElement(studentLanding);
  showElement(resultSection);
});

// Fill marksheet dynamically from record and headers
function fillMarksheet(record, cls, regColName) {
  const keys = Object.keys(record);

  // auto-detect name and class columns
  const nameCol = findColumnName(record, "name");
  const classCol = findColumnName(record, "class");

  stNameSpan.textContent = nameCol ? record[nameCol] : "";
  stClassSpan.textContent = classCol ? record[classCol] : (cls || "");
  stRegSpan.textContent = regColName ? record[regColName] : "";

  // Clear old table rows
  marksBody.innerHTML = "";

  // Decide which columns are "info" and which are "subjects"
  const infoCols = new Set();
  if (regColName) infoCols.add(regColName);
  if (nameCol) infoCols.add(nameCol);
  if (classCol) infoCols.add(classCol);

  // You can treat more columns as info if you want:
  // e.g., father name, mother name, etc., by name pattern
  keys.forEach(k => {
    const nk = normalizeKey(k);
    if (nk.includes("father") || nk.includes("mother") || nk.includes("section")) {
      infoCols.add(k);
    }
  });

  // Remaining columns are subjects
  let totalObtained = 0;
  let subjectCount = 0;

  keys.forEach((colName) => {
    if (infoCols.has(colName)) return;

    const cellValue = record[colName];
    const num = Number(cellValue);

    const isNumeric =
      typeof cellValue === "number" ||
      (!isNaN(num) && String(cellValue).trim() !== "");

    // Only treat numeric columns as marks
    if (!isNumeric) return;

    subjectCount++;
    const marksObtained = num;
    totalObtained += marksObtained;

    // For unknown max marks, assume 100 for percentage display
    const assumedMax = 100;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${colName}</td>
      <td>${assumedMax}</td>
      <td>${marksObtained}</td>
    `;
    marksBody.appendChild(tr);
  });

  const totalMax = subjectCount * 100;
  totalMarksSpan.textContent = `${totalObtained} / ${totalMax || "—"}`;
  const percent = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(2) : "0.00";
  percentageSpan.textContent = `${percent}%`;

  let status = "PASS";
  if (parseFloat(percent) < 33) {
    status = "FAIL";
  }
  resultStatusSpan.textContent = status;
}

// Print button
printBtn.addEventListener("click", () => {
  window.print();
});

// Next result button: back to landing and clear field
nextResultBtn.addEventListener("click", () => {
  regNoInput.value = "";
  studentError.textContent = "";
  hideElement(resultSection);
  showElement(studentLanding);
  regNoInput.focus();
});
