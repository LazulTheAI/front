import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { TimelineModule } from 'primeng/timeline';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';

import {
  LotConsommeResponse,
  ProductionControllerService,
  ReportControllerService,
  RunProductionResponse,
} from '@/app/modules/openapi';

interface LotParMateriau {
  materiauNom: string;
  materiauUnite: string;
  quantiteTotale: number;
  cogsTotaux: number;
  lots: LotConsommeResponse[];
}

@Component({
  selector: 'app-run-detail-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule,
    DialogModule, ButtonModule, TableModule,
    TagModule, DividerModule, TooltipModule,
    TabsModule, ToastModule, TimelineModule,
  ],
  providers: [MessageService],
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
    private messageService: MessageService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible && this.runId) {
      this.run = null;
      this.loadRun();
    }
  }

  loadRun(): void {
    if (!this.runId) return;
    this.loading = true;
    this.productionService.detailProduction(this.runId).subscribe({
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

  // ── Export CSV ────────────────────────────────────────────────────────────

  exportCsv(): void {
    if (!this.runId) return;
    this.exportingCsv = true;
    this.cdr.detectChanges();

    this.reportService.exportCsv(this.runId).subscribe({
      next: (data: any) => {
        const blob = data instanceof Blob ? data : new Blob([data], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tracabilite-run-${this.runId}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.exportingCsv = false;
        this.messageService.add({ severity: 'success', summary: 'Export réussi', detail: 'Fichier CSV téléchargé' });
        this.cdr.detectChanges();
      },
      error: () => {
        this.exportingCsv = false;
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Export CSV impossible' });
        this.cdr.detectChanges();
      },
    });
  }

  // ── Getters KPIs ──────────────────────────────────────────────────────────

  get cogsTotal(): number {
    return (this.run?.cogsTotal as unknown as number) ?? 0;
  }

  get coutParUniteValue(): number {
    return (this.run?.coutParUnite as unknown as number) ?? 0;
  }

  // ── Traçabilité lots ──────────────────────────────────────────────────────

  getLots(): LotConsommeResponse[] {
    return (this.run as any)?.lots ?? [];
  }

  getLotsByMateriau(): LotParMateriau[] {
    const lots = this.getLots();
    const map = new Map<string, LotParMateriau>();

    for (const lot of lots) {
      const key = lot.materiauNom ?? '';
      if (!map.has(key)) {
        map.set(key, {
          materiauNom: lot.materiauNom ?? '',
          materiauUnite: lot.materiauUnite ?? '',
          quantiteTotale: 0,
          cogsTotaux: 0,
          lots: [],
        });
      }
      const entry = map.get(key)!;
      entry.quantiteTotale += (lot.quantiteConsommee as unknown as number) ?? 0;
      entry.cogsTotaux += (lot.coutTotal as unknown as number) ?? 0;
      entry.lots.push(lot);
    }

    return Array.from(map.values());
  }

  getTotalCogs(): number {
    return this.getLots()
      .reduce((s, l) => s + ((l.coutTotal as unknown as number) ?? 0), 0);
  }

  getPctMateriau(mat: LotParMateriau): number {
    const total = this.getTotalCogs();
    if (!total || !mat.cogsTotaux) return 0;
    return Math.round((mat.cogsTotaux / total) * 100);
  }

  isExpired(date: string | undefined): boolean {
    if (!date) return false;
    return new Date(date) < new Date();
  }

  expireSoon(date: string | undefined): boolean {
    if (!date) return false;
    const diff = new Date(date).getTime() - Date.now();
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000; // 30 jours
  }

  // ── Statut ────────────────────────────────────────────────────────────────

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

  // ── Timeline ──────────────────────────────────────────────────────────────

  get timelineEvents(): { label: string; date: string | undefined; icon: string; color: string; detail?: string }[] {
    const events = [];

    events.push({
      label: 'Run créé',
      date: this.run?.createdAt,
      icon: 'pi pi-plus-circle',
      color: '#6366f1',
    });

    if (this.run?.statut === 'PLANIFIE') {
      events.push({
        label: 'En attente d\'exécution',
        date: undefined,
        icon: 'pi pi-clock',
        color: '#f59e0b',
      });
    }

    if (this.run?.statut === 'ANNULE') {
      events.push({
        label: 'Run annulé',
        date: this.run.completeAt,
        icon: 'pi pi-times-circle',
        color: '#ef4444',
      });
    }

    if (this.run?.statut === 'TERMINE') {
      if (this.run.stockInsuffisant) {
        events.push({
          label: 'Stock insuffisant détecté',
          date: this.run.completeAt,
          icon: 'pi pi-exclamation-triangle',
          color: '#f97316',
          detail: `${this.run.manques?.length} matériau(x) manquant(s)`,
        });
      }
      events.push({
        label: 'Production terminée',
        date: this.run.completeAt,
        icon: 'pi pi-check-circle',
        color: '#10b981',
        detail: `${this.run.unitesProduite} unités — COGS ${this.cogsTotal.toFixed(2)} €`,
      });
    }

    return events;
  }
}
