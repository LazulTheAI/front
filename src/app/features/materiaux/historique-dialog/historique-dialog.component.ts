import { EntrepotControllerService, EntrepotResponse, MateriauControllerService, MateriauResponse, MouvementStockResponse } from '@/app/modules/openapi';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

@Component({
    selector: 'app-historique-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule, DialogModule, ButtonModule, TranslocoModule, TableModule, TagModule, SelectModule, DatePickerModule, TooltipModule],
    templateUrl: './historique-dialog.component.html'
})
export class HistoriqueDialogComponent implements OnChanges {
    @Input() visible = false;
    @Output() visibleChange = new EventEmitter<boolean>();

    @Input() materiau: MateriauResponse | null = null;

    loading = false;
    mouvements: MouvementStockResponse[] = [];
    entrepots: EntrepotResponse[] = [];
    totalMouvements = 0;

    // Filtres
    filtreDepuis: Date | null = null;
    filtreJusqu: Date | null = null;
    filtreEntrepotId: number | null = null;

    constructor(
        private materiauService: MateriauControllerService,
        private entrepotService: EntrepotControllerService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['visible'] && this.visible && this.materiau?.id) {
            this.loadEntrepots();
            this.loadHistorique();
        }
    }

    loadHistorique(): void {
        if (!this.materiau?.id) return;
        this.loading = true;
        this.mouvements = [];

        this.materiauService
            .historiqueMouvementStock(
                this.materiau.id,
                this.filtreDepuis?.toISOString(),
                this.filtreJusqu?.toISOString(),
                this.filtreEntrepotId ?? undefined,
                undefined, // typeMouvement
                0, // page
                50, // size — assez grand pour l'historique d'un seul matériau
                'createdAt',
                'desc'
            )
            .subscribe({
                next: (data: any) => {
                    this.mouvements = data.content ?? [];
                    this.totalMouvements = data.totalElements ?? 0;
                    this.loading = false;
                    this.cdr.markForCheck();
                },
                error: () => {
                    this.loading = false;
                    this.cdr.markForCheck();
                }
            });
    }

    loadEntrepots(): void {
        this.entrepotService.listerEntrepot().subscribe({
            next: (d) => {
                this.entrepots = d;
                this.cdr.markForCheck(); // ← ici aussi
            }
        });
    }

    onHide(): void {
        this.visibleChange.emit(false);
    }

    get entrepotOptions(): { label: string; value: number | null }[] {
        return [{ label: 'Tous les entrepôts', value: null }, ...this.entrepots.map((e: EntrepotResponse) => ({ label: e.nom!, value: e.id! }))];
    }

    isExpired(date: string | undefined): boolean {
        if (!date) return false;
        return new Date(date) < new Date();
    }

    getTypeSeverity(type: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        switch (type) {
            case 'ENTREE':
                return 'success';
            case 'SORTIE':
                return 'danger';
            case 'AJUSTEMENT_POSITIF':
                return 'info';
            case 'AJUSTEMENT_NEGATIF':
                return 'warn';
            case 'PRODUCTION':
                return 'secondary';
            default:
                return 'secondary';
        }
    }

    getTypeLabel(type: string): string {
        const labels: Record<string, string> = {
            ENTREE: 'Entrée',
            SORTIE: 'Sortie',
            AJUSTEMENT_POSITIF: 'Ajust. +',
            AJUSTEMENT_NEGATIF: 'Ajust. -',
            PRODUCTION: 'Production'
        };
        return labels[type] ?? type;
    }

    getQuantiteDisplay(m: MouvementStockResponse): string {
        const prefix = m.typeMouvement?.includes('SORTIE') || m.typeMouvement?.includes('NEGATIF') ? '-' : '+';
        return `${prefix}${m.quantite}`;
    }
}
