import { PDFDocument } from 'pdf-lib';

/**
 * Merge signatures into a PDF at specific positions
 * @param {ArrayBuffer} pdfBytes - The original PDF as ArrayBuffer
 * @param {Object} signatures - Object with signature data URLs
 * @param {Object} positions - Signature positions { employee: {page, x, y}, employer: {page, x, y} }
 * @returns {Promise<Uint8Array>} - The modified PDF bytes
 */
export async function mergeSignaturesIntoPDF(pdfBytes, signatures, positions) {
  try {
    // Load the PDF
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();

    // Default positions (Page 3 - index 2 for signatures)
    const defaultPositions = {
      employee: { page: 2, x: 100, y: 150 }, // Page 3, left side
      employer: { page: 2, x: 350, y: 150 }, // Page 3, right side
    };

    const finalPositions = positions || defaultPositions;

    // Add employee signature if provided
    if (signatures.employee) {
      const employeePage = pages[finalPositions.employee.page];
      const employeeImageBytes = await fetch(signatures.employee).then((res) => res.arrayBuffer());
      const employeeImage = await pdfDoc.embedPng(employeeImageBytes);
      const { height: pageHeight } = employeePage.getSize();

      employeePage.drawImage(employeeImage, {
        x: finalPositions.employee.x,
        y: pageHeight - finalPositions.employee.y - 60,
        width: 150,
        height: 60,
      });
    }

    // Add employer signature if provided
    if (signatures.employer) {
      const employerPage = pages[finalPositions.employer.page];
      const employerImageBytes = await fetch(signatures.employer).then((res) => res.arrayBuffer());
      const employerImage = await pdfDoc.embedPng(employerImageBytes);
      const { height: pageHeight } = employerPage.getSize();

      employerPage.drawImage(employerImage, {
        x: finalPositions.employer.x,
        y: pageHeight - finalPositions.employer.y - 60,
        width: 150,
        height: 60,
      });
    }

    // Save and return the PDF
    const modifiedPdfBytes = await pdfDoc.save();
    return modifiedPdfBytes;
  } catch (error) {
    console.error('Error merging signatures into PDF:', error);
    throw error;
  }
}

/**
 * Download a PDF file
 * @param {Uint8Array} pdfBytes - The PDF bytes
 * @param {string} filename - The filename for download
 */
export function downloadPDF(pdfBytes, filename) {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
