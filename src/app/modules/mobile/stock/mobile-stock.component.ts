import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';

import { MateriauControllerService, MateriauResponse } from '@/app/modules/openapi';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressBarModule } from 'primeng/progressbar';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { MobileStockDetailDialogComponent } from './stock-detail-dialog/mobile-stock-detail-dialog.component';

@Component({
    selector: 'app-mobile-stock',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        FormsModule,
        InputTextModule,
        ButtonModule,
        TagModule,
        ProgressBarModule,
        ProgressSpinnerModule,
        SkeletonModule,
        ToastModule,
        MobileStockDetailDialogComponent
    ],
    providers: [MessageService],
    templateUrl: './mobile-stock.component.html',
    styleUrl: './mobile-stock.component.scss'
})
export class MobileStockComponent implements OnInit, OnDestroy {
    materiaux: MateriauResponse[] = [];
    totalRecords = 0;
    loading = false;
    searchQuery = '';
    page = 0;
    size = 20;

    selectedMateriau: MateriauResponse | null = null;
    showDetail = false;

    private search$ = new Subject<string>();
    private destroy$ = new Subject<void>();

    constructor(
        private materiauService: MateriauControllerService,
        private messageService: MessageService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.search$
            .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
            .subscribe((v) => {
                this.searchQuery = v;
                this.page = 0;
                this.loadMateriaux();
            });
        this.loadMateriaux();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    onSearchInput(value: string): void {
        this.search$.next(value);
    }

    loadMateriaux(): void {
        this.loading = true;
        this.materiauService
            .listerMateriau(false, this.page, this.size, 'nom', 'asc', this.searchQuery || undefined)
            .subscribe({
                next: (data: any) => {
                    this.materiaux = data.content ?? [];
                    this.totalRecords = data.totalElements ?? 0;
                    this.loading = false;
                    this.cdr.markForCheck();
                },
                error: () => {
                    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les matières' });
                    this.loading = false;
                    this.cdr.markForCheck();
                }
            });
    }

    loadMore(): void {
        this.page++;
        this.materiauService
            .listerMateriau(false, this.page, this.size, 'nom', 'asc', this.searchQuery || undefined)
            .subscribe({
                next: (data: any) => {
                    this.materiaux = [...this.materiaux, ...(data.content ?? [])];
                    this.cdr.markForCheck();
                }
            });
    }

    openDetail(m: MateriauResponse): void {
        this.selectedMateriau = m;
        this.showDetail = true;
        this.cdr.markForCheck();
    }

    getStockPercent(m: MateriauResponse): number {
        const stock = m.stockTotal ?? 0;
        const seuil = m.seuilAlerte ?? 0;
        if (seuil <= 0) return stock > 0 ? 100 : 0;
        return Math.min(100, Math.round((stock / seuil) * 100));
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

    get hasMore(): boolean {
        return this.materiaux.length < this.totalRecords;
    }
}
