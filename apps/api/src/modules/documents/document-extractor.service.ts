import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

export class DocumentExtractionError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'DocumentExtractionError';
  }
}

export interface ExtractionResult {
  text: string;
  pageCount?: number;
  metadata?: Record<string, unknown>;
}

export class DocumentExtractorService {
  /**
   * Extracts clean, structured plain text from PDF, DOCX, or Image file buffers.
   */
  async extractText(
    buffer: Buffer,
    mimeType: string,
    filename?: string
  ): Promise<ExtractionResult> {
    if (!buffer || buffer.length === 0) {
      throw new DocumentExtractionError('Cannot extract text from an empty file buffer.');
    }

    try {
      if (
        mimeType === 'application/pdf' ||
        (filename && filename.toLowerCase().endsWith('.pdf'))
      ) {
        return await this.extractPdf(buffer);
      }

      if (
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        (filename && filename.toLowerCase().endsWith('.docx'))
      ) {
        return await this.extractDocx(buffer);
      }

      if (mimeType.startsWith('image/')) {
        return {
          text: `[Image Document: ${filename || 'image'} - Ready for Vision AI verification]`,
          metadata: { mimeType, sizeBytes: buffer.length },
        };
      }

      // Default fallback: Try UTF-8 string extraction
      const raw = buffer.toString('utf-8');
      return {
        text: this.cleanText(raw),
        metadata: { mimeType, fallback: true },
      };
    } catch (err: any) {
      if (err instanceof DocumentExtractionError) {
        throw err;
      }
      throw new DocumentExtractionError(
        `Failed to parse document: ${err.message || 'Corrupted or unsupported format'}`,
        err
      );
    }
  }

  private async extractPdf(buffer: Buffer): Promise<ExtractionResult> {
    try {
      const parser = new PDFParse({ data: buffer });
      const textResult = await parser.getText();
      const infoResult = await parser.getInfo().catch(() => null);

      const cleaned = this.cleanText(textResult.text || '');
      return {
        text: cleaned,
        pageCount: textResult.total || 1,
        metadata: infoResult ? { info: infoResult } : undefined,
      };
    } catch (err: any) {
      throw new DocumentExtractionError(
        `PDF extraction failed: ${err.message || 'Invalid or password-protected PDF'}`,
        err
      );
    }
  }

  private async extractDocx(buffer: Buffer): Promise<ExtractionResult> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const cleaned = this.cleanText(result.value || '');
      return {
        text: cleaned,
        metadata: {
          messages: result.messages,
        },
      };
    } catch (err: any) {
      throw new DocumentExtractionError(
        `DOCX extraction failed: ${err.message || 'Invalid or corrupted DOCX archive'}`,
        err
      );
    }
  }

  private cleanText(rawText: string): string {
    return rawText
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}
