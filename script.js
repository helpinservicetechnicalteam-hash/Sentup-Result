// In-memory storage for class-wise results
// Structure: resultsData["10"] = array of student objects from Excel
//            resultsData["12"] = array of student objects from Excel
const resultsData = {
  "10": [],
  "12": []
};

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

// Upload Excel file and parse
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
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Convert to JSON (array of objects)
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

    // Save class-wise
    resultsData[selectedClass] = jsonData;

    adminStatus.textContent = `Result file for Class ${selectedClass} uploaded successfully. Total records: ${jsonData.length}`;
    adminStatus.style.color = "#047857";
  };

  reader.onerror = function () {
    adminStatus.textContent = "Error reading the file.";
    adminStatus.style.color = "#b91c1c";
  };

  reader.readAsArrayBuffer(file);
});

// Student: search result by registration number
viewResultBtn.addEventListener("click", () => {
  studentError.textContent = "";
  const regNo = regNoInput.value.trim();
  if (!regNo) {
    studentError.textContent = "Please enter your registration number.";
    return;
  }

  // Search in both class 10 and 12
  let record = null;
  let foundClass = null;

  ["10", "12"].forEach((cls) => {
    if (record) return; // if already found
    const list = resultsData[cls] || [];
    const match = list.find(
      (row) =>
        String(row["RegistrationNo"]).toLowerCase() === regNo.toLowerCase()
    );
    if (match) {
      record = match;
      foundClass = cls;
    }
  });

  if (!record) {
    studentError.textContent = "Result not found. Please check your registration number or contact school.";
    return;
  }

  // Show marksheet for the found record
  fillMarksheet(record, foundClass);
  hideElement(studentLanding);
  showElement(resultSection);
});

// Fill marksheet from record
function fillMarksheet(record, cls) {
  stNameSpan.textContent = record["Name"] || "";
  stClassSpan.textContent = record["Class"] || cls || "";
  stRegSpan.textContent = record["RegistrationNo"] || "";

  // Clear old table rows
  marksBody.innerHTML = "";

  // Assume columns: RegistrationNo, Name, Class, Subject1, Subject1_Max, Subject2, Subject2_Max, ...
  let totalObtained = 0;
  let totalMax = 0;

  const keys = Object.keys(record);
  // Filter out meta keys
  const ignoreKeys = ["RegistrationNo", "Name", "Class"];
  const subjectGroups = [];

  // Build subjects from pattern
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (ignoreKeys.includes(key)) continue;
    if (key.endsWith("_Max")) continue; // will handle with main subject key

    const subjectName = key; // e.g., "Maths"
    const marksObtained = Number(record[key]) || 0;

    const maxKey = subjectName + "_Max";
    const maxMarks = Number(record[maxKey]) || 100; // default 100

    subjectGroups.push({
      subject: subjectName,
      obtained: marksObtained,
      max: maxMarks
    });

    totalObtained += marksObtained;
    totalMax += maxMarks;
  }

  subjectGroups.forEach((sub) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${sub.subject}</td>
      <td>${sub.max}</td>
      <td>${sub.obtained}</td>
    `;
    marksBody.appendChild(tr);
  });

  totalMarksSpan.textContent = `${totalObtained} / ${totalMax}`;
  const percent = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(2) : 0;
  percentageSpan.textContent = `${percent}%`;

  let status = "PASS";
  if (percent < 33) {
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
