// =============================================
//  PDF / PRINT REPORT GENERATOR
//  Uses window.print() to avoid jsPDF Cyrillic
//  font issues. The existing report overlay +
//  print CSS handles Russian text natively.
// =============================================

function generatePDF(student) {
  try {
    var s = student || (typeof state !== 'undefined' && state.currentStudentId
      ? state.students.find(function (st) { return st.id === state.currentStudentId; })
      : null);

    if (!s) {
      if (typeof showToast === 'function') showToast('⚠️ Сначала выберите участника', 'warn');
      return;
    }

    if (typeof state !== 'undefined') state.currentStudentId = s.id;

    if (typeof printStudentReport === 'function') {
      printStudentReport(s.id);
    }

    setTimeout(function () {
      if (typeof printReportNow === 'function') {
        printReportNow();
      } else {
        document.body.classList.add('report-mode');
        setTimeout(function () { window.print(); }, 350);
      }
    }, 600);

    if (typeof showToast === 'function') {
      showToast('📄 Подготовлен отчёт для печати / PDF', 'success');
    }
  } catch (e) {
    if (typeof showToast === 'function') {
      showToast('⚠️ Ошибка генерации отчёта: ' + e.message, 'warn');
    }
  }
}

window.generatePDF = generatePDF;
