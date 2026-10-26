import * as pdfkit from 'pdfkit';

type PDFDocumentConstructor = new (
  options?: PDFKit.PDFDocumentOptions,
) => PDFKit.PDFDocument;

const pdfkitModule = pdfkit as unknown as {
  default?: PDFDocumentConstructor;
  PDFDocument?: PDFDocumentConstructor;
};

export const PDFDocument: PDFDocumentConstructor = (pdfkitModule.default ??
  pdfkitModule.PDFDocument ??
  (pdfkit as unknown as PDFDocumentConstructor)) as PDFDocumentConstructor;
