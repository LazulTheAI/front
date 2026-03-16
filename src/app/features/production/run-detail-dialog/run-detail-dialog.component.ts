import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { TooltipModule } from 'primeng/tooltip';

import {
  ProductionControllerService,
  ReportControllerService,
  RunProductionResponse,
} from '@/app/modules/openapi';

@Component({
  selector: 'app-run-detail-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    DialogModule, ButtonModule, TableModule,
    TagModule, DividerModule, TooltipModule,
  ],
  providers: [],
  templateUrl: './run-detail-dialog.component.html',
})
export class RunDetailDialogComponent implements OnChanges {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  @Input() runId: number | null = null;

  run: RunProductionResponse | null = null;
  loading = false;
  exportingCsv = false;

  constructor(
    private productionService: ProductionControllerService,
    private reportService: ReportControllerService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible && this.runId) {
      this.loadRun();
    }
  }

  loadRun(): void {
    if (!this.runId) return;
    this.loading = true;
    this.productionService.detail3(this.runId).subscribe({
      next: (data: RunProductionResponse) => {
        this.run = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  onHide(): void { this.visibleChange.emit(false); }

  exportCsv(): void {
    if (!this.runId) return;
    this.exportingCsv = true;
    this.cdr.detectChanges();

    this.reportService.exportCsv(this.runId).subscribe({
      next: (data: any) => {
        const blob = data instanceof Blob ? data : new Blob([data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tracabilite-run-${this.runId}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.exportingCsv = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.exportingCsv = false;
        this.cdr.detectChanges();
      },
    });
  }

  getStatutSeverity(statut: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    const map: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary'> = {
      TERMINE: 'success', EN_COURS: 'info', PLANIFIE: 'warn', ANNULE: 'danger',
    };
    return map[statut] ?? 'secondary';
  }

  getStatutLabel(statut: string): string {
    const map: Record<string, string> = {
      PLANIFIE: 'Planifié', EN_COURS: 'En cours', TERMINE: 'Terminé', ANNULE: 'Annulé',
    };
    return map[statut] ?? statut;
  }
}
