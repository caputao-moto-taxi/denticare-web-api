import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { CreatePatientDocumentDto, PatientDocumentType } from './documents.dto';

export interface PatientDocumentPdfData {
  type: PatientDocumentType;
  patientName: string;
  authorName: string;
  branchName: string;
  clinicLogo?: { data: Buffer; mime_type: string | undefined };
  issuedAt: Date;
  formData: CreatePatientDocumentDto;
}

@Injectable()
export class PatientDocumentPdfService {
  generate(data: PatientDocumentPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const title = this.title(data.type);
      const pdf = new PDFDocument({
        size: 'A4',
        margins: { top: 64, right: 56, bottom: 64, left: 56 },
        info: { Title: title, Author: data.authorName, Creator: 'DentCare' },
      });

      pdf.on('data', (chunk: Buffer) => chunks.push(chunk));
      pdf.on('end', () => resolve(Buffer.concat(chunks)));
      pdf.on('error', reject);

      if (data.type === 'JUSTIFICATIVO_FALTA') {
        if (data.clinicLogo) {
          const imageType = data.clinicLogo.mime_type;
          if (imageType !== 'image/png' && imageType !== 'image/jpeg') {
            reject(
              new ServiceUnavailableException(
                'Clinic logo must be a PNG or JPEG image for PDF output',
              ),
            );
            return;
          }
          pdf.image(data.clinicLogo.data, 56, 40, {
            fit: [483, 72],
            align: 'center',
            valign: 'center',
          });
          pdf.y = 132;
        }
        pdf
          .font('Helvetica-Bold')
          .fontSize(18)
          .fillColor('#006B59')
          .text(title, { align: 'center' });
        pdf.moveDown(2);
        const recipientText = data.formData.recipient
          ? `À atenção de ${data.formData.recipient}: `
          : '';
        pdf
          .font('Helvetica')
          .fontSize(11)
          .fillColor('#1F2937')
          .text(
            `${recipientText}Para os devidos efeitos, declara-se que ${data.patientName} esteve impossibilitado(a) de comparecer às suas atividades no dia ${this.formatDate(data.formData.absenceDate)}, por motivo de saúde: ${data.formData.absenceReason}.`,
            { align: 'justify', lineGap: 4 },
          );
        pdf.moveDown(5);
        const signatureY = pdf.y;
        pdf
          .moveTo(180, signatureY)
          .lineTo(415, signatureY)
          .strokeColor('#64748B')
          .stroke();
        pdf
          .fontSize(9)
          .fillColor('#64748B')
          .text('Assinatura do médico', 180, signatureY + 8, {
            width: 235,
            align: 'center',
          });
      } else {
        pdf
          .font('Helvetica-Bold')
          .fontSize(18)
          .fillColor('#006B59')
          .text(title);
        pdf.moveDown(0.4);
        pdf
          .font('Helvetica')
          .fontSize(10)
          .fillColor('#64748B')
          .text(data.branchName)
          .text(`Emitido em ${this.formatDate(data.issuedAt)}`);
        pdf.moveDown(1.5);

        this.section(pdf, 'Identificação');
        this.field(pdf, 'Paciente', data.patientName);
        this.section(pdf, 'Termo de responsabilidade');
        this.field(
          pdf,
          'Procedimento / tratamento',
          data.formData.procedureName,
        );
        this.field(pdf, 'Responsável', data.formData.responsibleName);
        this.field(
          pdf,
          'Documento de identificação',
          data.formData.responsibleDocument,
        );
        this.field(pdf, 'Relação com o paciente', data.formData.relationship);
        this.field(pdf, 'Declaração', data.formData.responsibilityStatement);
        pdf.moveDown(1);
        pdf
          .fontSize(11)
          .fillColor('#1F2937')
          .text(
            'Declaro que recebi os esclarecimentos necessários, compreendi as informações prestadas e assumo a responsabilidade nos termos acima registados.',
            { align: 'justify', lineGap: 4 },
          );
        pdf.moveDown(3);
        const signatureY = pdf.y;
        pdf
          .moveTo(56, signatureY)
          .lineTo(270, signatureY)
          .strokeColor('#64748B')
          .stroke();
        pdf
          .moveTo(325, signatureY)
          .lineTo(539, signatureY)
          .strokeColor('#64748B')
          .stroke();
        pdf
          .fontSize(9)
          .fillColor('#64748B')
          .text(data.authorName, 56, signatureY + 8, {
            width: 214,
            align: 'center',
          })
          .text('Assinatura do paciente / responsável', 325, signatureY + 8, {
            width: 214,
            align: 'center',
          });
      }
      pdf.end();
    });
  }

  private title(type: PatientDocumentType) {
    return type === 'JUSTIFICATIVO_FALTA'
      ? 'Justificativo de Falta'
      : 'Termo de Responsabilidade';
  }

  private section(pdf: PDFKit.PDFDocument, title: string) {
    pdf
      .moveDown(0.7)
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor('#006B59')
      .text(title);
    pdf.moveDown(0.4);
  }

  private field(pdf: PDFKit.PDFDocument, label: string, value?: string | null) {
    if (!value) return;
    pdf
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor('#1F2937')
      .text(`${label}: `, {
        continued: true,
      });
    pdf.font('Helvetica').text(value, { lineGap: 2 });
    pdf.moveDown(0.3);
  }

  private formatDate(value?: string | Date) {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(`${value}T12:00:00`);
    return new Intl.DateTimeFormat('pt-PT').format(date);
  }
}
