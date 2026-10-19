import { Injectable } from '@nestjs/common';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import * as PDFDocument from 'pdfkit';
import {
  PatientChartPdfData,
  PatientFinancialPdfData,
  PatientPrescriptionPdfData,
} from '../../domain/patient.repository';
import { IPatientPdfGenerator } from '../../application/interfaces/patient-pdf-generator.interface';

const PAGE_MARGIN = 48;
const PAGE_BOTTOM_MARGIN = 54;
const COLORS = {
  accent: '#01A687',
  accentDark: '#006B59',
  ink: '#1F2937',
  muted: '#64748B',
  border: '#DCEBE9',
  background: '#EFF7F6',
};

@Injectable()
export class PatientPdfService implements IPatientPdfGenerator {
  createPrescription(data: PatientPrescriptionPdfData) {
    return this.createPdf('Prescrição clínica', (document) => {
      this.drawHeader(document, 'Prescrição clínica');
      this.writeSection(document, 'Dados do paciente');
      this.writeField(document, 'Paciente', data.patient.name);
      this.writeField(document, 'Nº de prontuário', data.patient.recordNumber);
      this.writeField(
        document,
        'BI / NIF',
        this.joinValues(data.patient.idNumber, data.patient.nif),
      );
      this.writeField(
        document,
        'Data de nascimento / idade',
        this.joinValues(
          this.formatDate(data.patient.birthDate),
          data.patient.age === null ? '' : `${data.patient.age} anos`,
        ),
      );
      this.writeField(document, 'Telefone', data.patient.phone);
      this.writeField(document, 'Email', data.patient.email);
      this.writeField(document, 'Endereço', data.patient.address);

      this.writeSection(document, 'Medicamentos prescritos');
      data.prescription.items.forEach((item, index) => {
        this.writeEntry(document, `${index + 1}. ${item.medication}`, [
          `Dose: ${item.dosage || 'Não informada'}`,
          `Posologia: ${item.instructions || 'Não informada'}`,
          `Duração: ${item.duration || 'Não informada'}`,
        ]);
      });

      this.ensureSpace(document, 105);
      document.moveDown(0.8);
      this.writeField(
        document,
        'Profissional responsável',
        data.prescription.prescribedBy,
      );
      this.writeField(
        document,
        'Data de emissão',
        this.formatDate(data.prescription.date),
      );
      document.moveDown(1.8);
      const signatureY = document.y;
      document
        .moveTo(PAGE_MARGIN, signatureY)
        .lineTo(PAGE_MARGIN + 220, signatureY)
        .lineWidth(0.8)
        .strokeColor(COLORS.muted)
        .stroke();
      document
        .font('Helvetica')
        .fontSize(8)
        .fillColor(COLORS.muted)
        .text(
          'Assinatura e carimbo do profissional',
          PAGE_MARGIN,
          signatureY + 6,
        );
    });
  }

  createPatientChart(data: PatientChartPdfData) {
    return this.createPdf('Ficha completa do paciente', (document) => {
      this.drawHeader(document, 'Ficha completa do paciente');
      this.writeField(document, 'Nº de prontuário', data.recordNumber);
      this.writeField(
        document,
        'Estado do registo',
        this.statusLabel(data.status),
      );

      this.writeSection(document, 'Identificação e contactos');
      this.writeField(document, 'Nome completo', data.name);
      this.writeField(
        document,
        'Data de nascimento / idade',
        this.joinValues(
          this.formatDate(data.birthDate),
          data.age === null ? '' : `${data.age} anos`,
        ),
      );
      this.writeField(document, 'Género', this.genderLabel(data.gender));
      this.writeField(document, 'BI', data.idNumber);
      this.writeField(document, 'NIF', data.nif);
      this.writeField(document, 'Telefone', data.phone);
      this.writeField(document, 'Email', data.email);
      this.writeField(document, 'Endereço', data.address);
      this.writeField(document, 'Profissão', data.profession);
      this.writeField(
        document,
        'Registado em',
        this.formatDate(data.registeredDate),
      );
      this.writeField(
        document,
        'Última consulta',
        this.formatDate(data.lastVisit),
      );
      this.writeField(
        document,
        'Próxima consulta',
        this.formatDate(data.nextAppointment),
      );

      this.writeSection(document, 'Contactos de emergência e seguro');
      this.writeField(
        document,
        'Contacto de emergência',
        data.emergencyContact.name,
      );
      this.writeField(document, 'Relação', data.emergencyContact.relationship);
      this.writeField(
        document,
        'Telefone de emergência',
        data.emergencyContact.phone,
      );
      this.writeField(document, 'Seguradora', data.insurance.provider);
      this.writeField(document, 'Plano', data.insurance.plan);
      this.writeField(document, 'Nº da apólice', data.insurance.policyNumber);
      this.writeField(
        document,
        'Cobertura',
        `${data.insurance.coveragePercent}%`,
      );

      this.writeSection(document, 'Informações clínicas e alertas');
      this.writeField(document, 'Tipo sanguíneo', data.bloodType);
      this.writeField(document, 'Alergias', this.listValue(data.allergies));
      this.writeField(
        document,
        'Condições médicas',
        this.listValue(data.medicalConditions),
      );
      this.writeField(
        document,
        'Medicação habitual',
        this.listValue(data.medications),
      );
      this.writeField(document, 'Notas médicas', data.medicalNotes);

      this.writeSection(document, 'Tratamento atual e indicadores');
      this.writeField(document, 'Tratamento', data.currentTreatment.title);
      this.writeField(
        document,
        'Fase ativa',
        data.currentTreatment.activePhase,
      );
      this.writeField(
        document,
        'Profissional',
        data.currentTreatment.doctorName,
      );
      this.writeField(
        document,
        'Especialidade',
        data.currentTreatment.specialty,
      );
      this.writeField(
        document,
        'Início',
        this.formatDate(data.currentTreatment.startedAt),
      );
      this.writeField(
        document,
        'Conclusão estimada',
        this.formatDate(data.currentTreatment.estimatedCompletion),
      );
      this.writeField(
        document,
        'Progresso',
        `${data.currentTreatment.progress}%`,
      );
      this.writeField(
        document,
        'Consultas registadas',
        String(data.metrics.totalAppointments),
      );
      this.writeField(
        document,
        'Consultas concluídas',
        String(data.metrics.completedProcedures),
      );
      this.writeField(document, 'Total faturado', data.metrics.totalBilled);
      this.writeField(document, 'Total pago', data.metrics.totalPaid);
      this.writeField(document, 'Saldo pendente', data.metrics.pendingBalance);
      this.writeField(
        document,
        'Percentagem paga',
        `${data.metrics.paymentCompletionPercent}%`,
      );

      this.writeSection(document, 'Histórico de consultas');
      if (data.appointments.length === 0) {
        this.writeParagraph(document, 'Nenhuma consulta registada.');
      }
      data.appointments.forEach((appointment, index) => {
        this.writeEntry(
          document,
          `${index + 1}. ${this.formatDate(appointment.date)} ${appointment.time} - ${appointment.procedure}`,
          [
            `Estado: ${this.statusLabel(appointment.status)}`,
            `Profissional: ${appointment.doctorName}`,
            `Especialidade: ${appointment.specialty}`,
            `Observações: ${appointment.notes || '—'}`,
            `Custo: ${appointment.cost}`,
          ],
        );
      });

      this.writeSection(document, 'Diagnósticos');
      if (data.diagnoses.length === 0) {
        this.writeParagraph(document, 'Nenhum diagnóstico registado.');
      }
      data.diagnoses.forEach((diagnosis, index) => {
        this.writeEntry(
          document,
          `${index + 1}. ${diagnosis.title}${diagnosis.code ? ` (${diagnosis.code})` : ''}`,
          [
            `Data: ${this.formatDate(diagnosis.diagnosedAt)}`,
            `Profissional: ${diagnosis.doctorName}`,
            `Gravidade: ${this.statusLabel(diagnosis.severity)}`,
            `Estado: ${this.statusLabel(diagnosis.status)}`,
            `Dentes envolvidos: ${this.listValue(diagnosis.affectedTeeth)}`,
            `Descrição: ${diagnosis.description}`,
            `Anexos: ${this.listValue(diagnosis.attachments.map((attachment) => attachment.fileName))}`,
          ],
        );
      });

      this.writeSection(document, 'Receitas e medicamentos');
      if (data.prescriptions.length === 0) {
        this.writeParagraph(document, 'Nenhuma receita registada.');
      }
      data.prescriptions.forEach((prescription, index) => {
        this.writeEntry(
          document,
          `${index + 1}. Receita de ${this.formatDate(prescription.date)}`,
          [
            `Estado: ${this.statusLabel(prescription.status)}`,
            `Profissional: ${prescription.prescribedBy}`,
            ...prescription.items.map(
              (item) =>
                `${item.medication} - ${item.dosage}; ${item.instructions}; duração: ${item.duration}`,
            ),
          ],
        );
      });

      this.writeSection(document, 'Odontograma');
      if (data.odontogram.length === 0) {
        this.writeParagraph(document, 'Sem registos no odontograma.');
      }
      data.odontogram.forEach((tooth) => {
        this.writeEntry(
          document,
          `Dente ${tooth.number} - ${this.statusLabel(tooth.state)}`,
          [
            `Procedimento: ${tooth.procedureDone || '—'}`,
            `Notas: ${tooth.notes || '—'}`,
          ],
        );
      });

      this.writeSection(document, 'Exames e documentos');
      if (data.exams.length === 0) {
        this.writeParagraph(document, 'Nenhum exame anexado.');
      }
      data.exams.forEach((exam, index) => {
        this.writeEntry(document, `${index + 1}. ${exam.title}`, [
          `Tipo: ${exam.type}`,
          `Data: ${this.formatDate(exam.date)}`,
          `Profissional: ${exam.doctorName}`,
          `Ficheiro: ${exam.fileName} (${exam.fileSize})`,
        ]);
      });

      this.writeSection(document, 'Movimentos financeiros');
      if (data.financials.length === 0) {
        this.writeParagraph(document, 'Nenhum movimento financeiro registado.');
      }
      data.financials.forEach((entry, index) => {
        this.writeEntry(document, `${index + 1}. ${entry.description}`, [
          `Referência: ${entry.reference}`,
          `Data: ${this.formatDate(entry.date)}`,
          `Valor: ${entry.amount}`,
          `Forma de pagamento: ${entry.method}`,
          `Estado: ${this.statusLabel(entry.status)}`,
        ]);
      });
    });
  }

  createFinancialReceipt(data: PatientFinancialPdfData) {
    return this.createPdf('Fatura / Recibo', (document) => {
      this.drawHeader(document, 'Fatura / Recibo');
      this.writeSection(document, 'Dados do paciente');
      this.writeField(document, 'Paciente', data.patient.name);
      this.writeField(document, 'Nº de prontuário', data.patient.recordNumber);
      this.writeField(
        document,
        'BI / NIF',
        this.joinValues(data.patient.idNumber, data.patient.nif),
      );
      this.writeField(document, 'Telefone', data.patient.phone);
      this.writeField(document, 'Email', data.patient.email);
      this.writeField(document, 'Endereço', data.patient.address);

      this.writeSection(document, 'Detalhes do lançamento');
      this.writeField(document, 'Referência', data.financial.reference);
      this.writeField(document, 'Data', this.formatDate(data.financial.date));
      this.writeField(
        document,
        'Estado',
        this.statusLabel(data.financial.status),
      );
      this.writeEntry(document, data.financial.description, [
        `Forma de pagamento: ${data.financial.method}`,
        `Valor: ${data.financial.amount}`,
      ]);
      this.writeField(document, 'Total', data.financial.amount);
      document.moveDown(1.5);
      this.writeParagraph(
        document,
        'Documento financeiro emitido pela plataforma DentCare.',
      );
    });
  }

  private createPdf(
    title: string,
    render: (document: PDFKit.PDFDocument) => void,
  ) {
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const document = new PDFDocument({
        size: 'A4',
        margins: {
          top: 130,
          right: PAGE_MARGIN,
          bottom: PAGE_BOTTOM_MARGIN,
          left: PAGE_MARGIN,
        },
        bufferPages: true,
        info: {
          Title: title,
          Author: 'DentCare',
          Creator: 'DentCare',
        },
      });

      document.on('data', (chunk: Buffer) => chunks.push(chunk));
      document.on('end', () => resolve(Buffer.concat(chunks)));
      document.on('error', reject);

      render(document);
      const pageRange = document.bufferedPageRange();
      for (let page = 0; page < pageRange.count; page++) {
        document.switchToPage(pageRange.start + page);
        if (page > 0) this.drawHeader(document, title);
        this.drawFooter(document, title, page + 1, pageRange.count);
      }
      document.end();
    });
  }

  private drawHeader(document: PDFKit.PDFDocument, title: string) {
    const logoPaths = [
      join(__dirname, '../../../../public/logo.png'),
      join(__dirname, '../../../public/logo.png'),
    ];
    const logoPath = logoPaths.find((path) => existsSync(path));
    if (!logoPath) {
      throw new Error('DentCare logo asset is missing from the API assets.');
    }
    document.image(logoPath, PAGE_MARGIN, 42, { width: 40, height: 40 });

    document
      .font('Helvetica-Bold')
      .fontSize(17)
      .fillColor(COLORS.accentDark)
      .text('DentCare', PAGE_MARGIN + 52, 48, { lineBreak: false });
    document
      .font('Helvetica')
      .fontSize(7)
      .fillColor(COLORS.muted)
      .text('GESTÃO CLÍNICA ODONTOLÓGICA', PAGE_MARGIN + 53, 68, {
        lineBreak: false,
      });
    document
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(COLORS.ink)
      .text(title.toLocaleUpperCase('pt-PT'), PAGE_MARGIN, 99, {
        width: document.page.width - PAGE_MARGIN * 2,
        align: 'right',
      });
    document
      .moveTo(PAGE_MARGIN, 116)
      .lineTo(document.page.width - PAGE_MARGIN, 116)
      .lineWidth(1.2)
      .strokeColor(COLORS.accent)
      .stroke();
    document.y = 130;
  }

  private drawFooter(
    document: PDFKit.PDFDocument,
    title: string,
    page: number,
    totalPages: number,
  ) {
    document
      .font('Helvetica')
      .fontSize(7)
      .fillColor(COLORS.muted)
      .text(
        `DentCare - ${title} - Página ${page} de ${totalPages}`,
        PAGE_MARGIN,
        document.page.height - 30,
        {
          width: document.page.width - PAGE_MARGIN * 2,
          align: 'right',
          lineBreak: false,
        },
      );
  }

  private writeSection(document: PDFKit.PDFDocument, title: string) {
    this.ensureSpace(document, 42);
    document.moveDown(0.5);
    const y = document.y;
    document
      .roundedRect(PAGE_MARGIN, y, document.page.width - PAGE_MARGIN * 2, 22, 4)
      .fillColor(COLORS.background)
      .fill();
    document
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(COLORS.accentDark)
      .text(title.toLocaleUpperCase('pt-PT'), PAGE_MARGIN + 8, y + 6, {
        lineBreak: false,
      });
    document.y = y + 31;
  }

  private writeField(
    document: PDFKit.PDFDocument,
    label: string,
    value: string,
  ) {
    const left = PAGE_MARGIN;
    const labelWidth = 145;
    const valueWidth = document.page.width - PAGE_MARGIN * 2 - labelWidth;
    const displayValue = value.trim() || 'Não informado';
    document.font('Helvetica-Bold').fontSize(8);
    const labelHeight = document.heightOfString(label, { width: labelWidth });
    document.font('Helvetica').fontSize(9);
    const valueHeight = document.heightOfString(displayValue, {
      width: valueWidth,
    });
    const rowHeight = Math.max(labelHeight, valueHeight) + 7;
    this.ensureSpace(document, rowHeight);
    const y = document.y;
    document
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text(label, left, y, { width: labelWidth });
    document
      .font('Helvetica')
      .fontSize(9)
      .fillColor(COLORS.ink)
      .text(displayValue, left + labelWidth, y, { width: valueWidth });
    document.y = y + rowHeight;
  }

  private writeEntry(
    document: PDFKit.PDFDocument,
    title: string,
    lines: string[],
  ) {
    this.ensureSpace(document, 40);
    document
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(COLORS.ink)
      .text(title, { width: document.page.width - PAGE_MARGIN * 2 });
    lines.forEach((line) => this.writeParagraph(document, line));
    document.moveDown(0.45);
  }

  private writeParagraph(document: PDFKit.PDFDocument, text: string) {
    this.ensureSpace(document, 18);
    document
      .font('Helvetica')
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text(text || 'Não informado', {
        width: document.page.width - PAGE_MARGIN * 2,
        lineGap: 2,
      });
  }

  private ensureSpace(document: PDFKit.PDFDocument, height: number) {
    if (document.y + height > document.page.height - PAGE_BOTTOM_MARGIN) {
      document.addPage();
    }
  }

  private listValue(values: string[]) {
    const result = values.filter(Boolean).join(', ');
    return result || 'Nenhum registado';
  }

  private joinValues(...values: string[]) {
    return values.filter(Boolean).join(' / ') || 'Não informado';
  }

  private formatDate(value: string) {
    if (!value) return 'Não informado';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleDateString('pt-PT', { timeZone: 'Africa/Luanda' });
  }

  private statusLabel(value: string) {
    const labels: Record<string, string> = {
      active: 'Ativo',
      inactive: 'Inativo',
      completed: 'Concluído',
      resolved: 'Resolvido',
      in_treatment: 'Em tratamento',
      monitoring: 'Em monitoramento',
      scheduled: 'Agendada',
      cancelled: 'Cancelada',
      pending: 'Pendente',
      paid: 'Pago',
      overdue: 'Em atraso',
      low: 'Baixa',
      medium: 'Média',
      high: 'Alta',
      healthy: 'Saudável',
      treated: 'Tratado',
      treatment_needed: 'Tratamento necessário',
      missing: 'Ausente',
    };
    return labels[value] ?? value.replace(/_/g, ' ');
  }

  private genderLabel(value: string) {
    const labels: Record<string, string> = {
      female: 'Feminino',
      male: 'Masculino',
      other: 'Outro',
    };
    return labels[value] ?? value;
  }
}
