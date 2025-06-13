declare module 'pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js' {
  interface TextItem {
    str: string;
    [key: string]: any;
  }

  interface TextContent {
    items: TextItem[];
    [key: string]: any;
  }

  interface PDFPage {
    getTextContent(): Promise<TextContent>;
    [key: string]: any;
  }

  interface PDFDocument {
    numPages: number;
    getPage(pageNum: number): Promise<PDFPage>;
    [key: string]: any;
  }

  export function getDocument(data: Buffer): {
    promise: Promise<PDFDocument>;
  };
} 