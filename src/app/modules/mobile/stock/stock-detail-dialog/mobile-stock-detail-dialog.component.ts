import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';

import { MateriauControllerService, MateriauResponse, MouvementStockResponse } from '@/app/modules/openapi';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';

@Component({
    selector: 'app-mobile-stock-detail-dialog',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, DialogModule, ButtonModule, TagModule, DividerModule, ProgressSpinnerModule],
    templateUrl: './mobile-stock-detail-dialog.component.html',
    styleUrl: './mobile-stock-detail-dialog.component.scss'
})
export class MobileStockDetailDialogComponent implements OnChanges {
    @Input() visible = false;
    @Output() visibleChange = new EventEmitter<boolean>();
    @Input() materiau: MateriauResponse | null = null;

    mouvements: MouvementStockResponse[] = [];
    loadingMouvements = false;

    constructor(
        private materiauService: MateriauControllerService,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['visible'] && this.visible && this.materiau?.id) {
            this.loadHistorique();
        }
    }

    loadHistorique(): void {
        if (!this.materiau?.id) return;
        this.loadingMouvements = true;
        this.materiauService
            .historiqueMouvementStock(this.materiau.id, undefined, undefined, undefined, undefined, 0, 10, 'createdAt', 'desc')
            .subscribe({
                next: (data: any) => {
                    this.mouvements = data.content ?? [];
                    this.loadingMouvements = false;
                    this.cdr.markForCheck();
                },
                error: () => {
                    this.loadingMouvements = false;
                    this.cdr.markForCheck();
                }
            });
    }

    onHide(): void {
        this.visibleChange.emit(false);
    }

    goAjustement(): void {
        this.onHide();
        this.router.navigate(['/mobile/ajustement'], { queryParams: { materiauId: this.materiau?.id } });
    }

    goReception(): void {
        this.onHide();
        this.router.navigate(['/mobile/reception'], { queryParams: { materiauId: this.materiau?.id } });
    }

    getStatut(m: MateriauResponse): 'OK' | 'ALERTE' | 'RUPTURE' {
        if ((m.stockTotal ?? 0) <= 0) return 'RUPTURE';
        if (m.enAlerte) return 'ALERTE';
        return 'OK';
    }

    getSeverity(m: MateriauResponse): 'success' | 'warn' | 'danger' {
        const s = this.getStatut(m);
        if (s === 'RUPTURE') return 'danger';
        if (s === 'ALERTE') return 'warn';
        return 'success';
    }

    getMouvementIcon(type: string | undefined): string {
        if (!type) return 'pi-circle';
        if (type.includes('ENTREE')) return 'pi-arrow-down-left';
        if (type.includes('SORTIE') || type.includes('CONSOMMATION')) return 'pi-arrow-up-right';
        return 'pi-arrows-h';
    }
}
