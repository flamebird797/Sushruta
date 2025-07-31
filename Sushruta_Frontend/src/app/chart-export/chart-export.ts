import { Component, Input } from '@angular/core';
import jsPDF from 'jspdf';
import { CommonModule } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';
import { getRegionSideMap } from './region-side-map';

interface ImageWithSize {
  url: string;
  width: number;
  height: number;
}
const LOGO = "data:image/jpeg;base64,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";


@Component({
  selector: 'app-chart-export',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chart-export.html',
  styleUrls: ['./chart-export.css'],
})
export class ChartExportComponent {
  @Input() chartName!: string;
  @Input() userId!: string;
  @Input() frontImage!: ImageWithSize;
  @Input() backImage!: ImageWithSize;
  @Input() activeMode: 'pain' | 'scar' | 'bruise' | 'burn' | 'discoloration' = 'pain';
  @Input() regionData!: Record<
  string,
  {
    pain?: number;
    scar?: number;
    bruise?: number;
    burn?: number;
    discoloration?: number;
    note?: string;
  }
>;

  regionSideMap: Record<string, 'front' | 'back'> = {};

  constructor(public sanitizer: DomSanitizer) {}

  async ngOnInit() {
    this.regionSideMap = await getRegionSideMap();
  }

  getRegionKeys(): string[] {
    return Object.keys(this.regionData || {});
  }

  

 async exportToPDF() {
  const pdf = new jsPDF('portrait', 'pt', 'a4');
  const margin = 40;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const lineSpacing = 18;
  const now = new Date();
  const dateStr = now.toLocaleString();

  const drawLogo = () => {
    const logoWidth = 80;
    const logoHeight = 40;
    const x = pdf.internal.pageSize.getWidth() - logoWidth - margin;
    const y = 30;
    pdf.addImage(LOGO, 'PNG', x, y, logoWidth, logoHeight);
  };

  drawLogo();

  if (Object.keys(this.regionSideMap).length === 0) {
    this.regionSideMap = await getRegionSideMap();
  }

  const frontRegions = Object.entries(this.regionData).filter(
    ([key]) => this.regionSideMap[key] === 'front'
  );
  const backRegions = Object.entries(this.regionData).filter(
    ([key]) => this.regionSideMap[key] === 'back'
  );

  const activeRegions = [...frontRegions, ...backRegions].filter(
  ([_, data]) =>
    ['pain', 'scar', 'bruise', 'burn', 'discoloration'].some(mode => (data as any)[mode] > 0)
);

  // 🔢 Aspect-preserving scaling
  const scaleToFit = (w: number, h: number, maxW: number, maxH: number) => {
    const ratio = w / h;
    let newW = maxW;
    let newH = newW / ratio;
    if (newH > maxH) {
      newH = maxH;
      newW = newH * ratio;
    }
    return { width: newW, height: newH };
  };

 const frontSize = scaleToFit(this.frontImage.width, this.frontImage.height, 320, 580);
const backSize = scaleToFit(this.backImage.width, this.backImage.height, 320, 580);

const gap = 40; // spacing between front and back images
const totalWidth = frontSize.width + backSize.width + gap;
const centerX = (pageWidth - totalWidth) / 2;

const frontX = centerX;
const backX = frontX + frontSize.width + gap;
  // ============= 🧾 Header
  pdf.setFontSize(18);
  pdf.setTextColor('#1A237E');
  pdf.text(`Body Pain Report`, margin, 40);

  pdf.setFontSize(11);
  pdf.setTextColor('#333');
  pdf.text(`Chart Name: ${this.chartName || '(Unnamed Chart)'}`, margin, 60);
  pdf.text(`Patient ID: ${this.userId || 'N/A'}`, margin, 60 + lineSpacing);
  pdf.text(`Date: ${dateStr}`, margin, 60 + lineSpacing * 2);

  // ============= 🧍 Body Views
  pdf.setFontSize(14);
  pdf.setTextColor('#000');
  const frontLabel = '3D Body View – Front';
const backLabel = '3D Body View – Back';

const frontLabelX = frontX + frontSize.width / 2 - pdf.getTextWidth(frontLabel) / 2;
const backLabelX = backX + backSize.width / 2 - pdf.getTextWidth(backLabel) / 2;

pdf.text(frontLabel, frontLabelX, 140);
pdf.text(backLabel, backLabelX, 140);

  pdf.addImage(this.frontImage.url, 'PNG', frontX, 150, frontSize.width, frontSize.height);
  pdf.addImage(this.backImage.url, 'PNG', backX, 150, backSize.width, backSize.height);

  // ============= 📋 Notes Table (starts below images)
  const tableStartY = 150 + Math.max(frontSize.height, backSize.height) + 40;
  renderTable(pdf, activeRegions, tableStartY);

  // ============= 💾 Save
  pdf.save(`${this.chartName || 'Chart'}_${this.userId || 'user'}_3D_PainChart.pdf`);

  // ===================== 📝 Styled Table Renderer
  function renderTable(
  pdf: jsPDF,
  entries: [string, any][],
  startY: number
) {
  let y = startY;
  const rowHeight = 20;
  const col1 = margin;
  const col2 = margin + 150;
  const col3 = margin + 280;
  const colWidth = pageWidth - margin * 2;
  const maxPageHeight = pdf.internal.pageSize.getHeight() - margin;

  const modes = ['pain', 'scar', 'bruise', 'burn', 'discoloration'];

  pdf.setFontSize(16);
  pdf.setTextColor('#1A237E');
  pdf.text('Detailed Region Notes', margin, y);
  y += 25;

  pdf.setFontSize(12);
  pdf.setTextColor('#000');
  pdf.setDrawColor(180, 180, 180);
  pdf.setFillColor(230, 230, 230);

  // Table header
  pdf.rect(margin, y, colWidth, rowHeight, 'F');
  pdf.text('Region', col1 + 5, y + 14);
  pdf.text('Pain Modes', col2 + 5, y + 14);
  pdf.text('Note', col3 + 5, y + 14);
  y += rowHeight;

  pdf.setFont('helvetica', 'normal');

  for (const [key, data] of entries) {
    const region = key.replaceAll('_', ' ');

    const levelStr = modes
      .map(mode => {
        const value = data[mode];
        return value ? `${mode}: ${value}` : null;
      })
      .filter(Boolean)
      .join(', ') || 'None';

    const wrappedNote = pdf.splitTextToSize(data.note || '(No note)', pageWidth - col3 - 20);
    const height = Math.max(rowHeight, wrappedNote.length * 14);

    if (y + height > maxPageHeight) {
      pdf.addPage();
      drawLogo();
      y = margin;
    }

    pdf.setDrawColor(220);
    pdf.rect(margin, y, colWidth, height);
    pdf.text(region, col1 + 5, y + 14);
    pdf.text(levelStr, col2 + 5, y + 14);
    pdf.text(wrappedNote, col3 + 5, y + 14);
    y += height;
  }
}
}
}