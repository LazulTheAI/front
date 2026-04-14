import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { TranslocoModule } from '@jsverse/transloco';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputText } from 'primeng/inputtext';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Toast } from 'primeng/toast';
import { Toolbar } from 'primeng/toolbar';
import { Tooltip } from 'primeng/tooltip';

import { RevendeurControllerService, RevendeurResponse } from '@/app/modules/openapi';
import { APP_CURRENCY, APP_CURRENCY_LOCALE } from '@/app/core/currency.config';

import { AuthApiService } from '@/app/auth/services/api/auth.service';
import { AvatarModule } from 'primeng/avatar';
import { Badge } from 'primeng/badge';
import { RevendeurDetailDialogComponent } from '../revendeur-detail-dialog/revendeur-detail-dialog.component';
import { RevendeurFormDialogComponent } from '../revendeur-form-dialog/revendeur-form-dialog.component';

@Component({
    selector: 'app-revendeurs-list',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, Badge, FormsModule, TableModule, Button, Tag, Tooltip, Toast, Toolbar, ConfirmDialog, IconField, InputIcon, InputText, AvatarModule, RevendeurFormDialogComponent, RevendeurDetailDialogComponent, TranslocoModule],
    providers: [MessageService, ConfirmationService],
    templateUrl: './revendeurs-list.component.html'
})
export class RevendeursListComponent implements OnInit, OnDestroy {
    revendeurs: RevendeurResponse[] = [];
    totalRecords = 0;
    loading = false;
    protected readonly appCurrency = APP_CURRENCY;
    protected readonly appCurrencyLocale = APP_CURRENCY_LOCALE;

    page = 0;
    size = 20;
    sortBy = 'nom';
    sortDir = 'asc';

    search = '';
    private search$ = new Subject<string>();

    showFormDialog = false;
    showDetailDialog = false;
    selectedRevendeur: RevendeurResponse | null = null;
    currency: string;
    constructor(
        @Inject(RevendeurControllerService)
        private revendeurService: RevendeurControllerService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private cdr: ChangeDetectorRef,
        private authService: AuthApiService
    ) {
        this.currency = this.authService.getCurrency();
    }

    ngOnInit(): void {
        this.search$.pipe(debounceTime(400), distinctUntilChanged()).subscribe((v) => {
            this.search = v;
            this.page = 0;
            this.loadRevendeurs();
        });
        this.loadRevendeurs();
    }

    ngOnDestroy(): void {
        this.search$.complete();
    }

    onSearchInput(value: string): void {
        this.search$.next(value);
    }

    getEvolution(moisCourant: number, moisPrecedent: number): string {
        if (!moisPrecedent || moisPrecedent === 0) return '0';
        const evo = ((moisCourant - moisPrecedent) / moisPrecedent) * 100;
        return (evo >= 0 ? '+' : '') + evo.toFixed(1);
    }

    loadRevendeurs(): void {
        this.loading = true;
        this.revendeurService.listerRevendeur(this.page, this.size, this.search || undefined).subscribe({
            next: (data: any) => {
                this.revendeurs = data.content;
                this.totalRecords = data.totalElements;
                this.loading = false;
                this.cdr.markForCheck();
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les revendeurs' });
                this.loading = false;
                this.cdr.markForCheck();
            }
        });
    }

    onLazyLoad(event: TableLazyLoadEvent): void {
        this.page = Math.floor((event.first ?? 0) / (event.rows ?? this.size));
        this.size = event.rows ?? this.size;
        if (event.sortField) {
            this.sortBy = Array.isArray(event.sortField) ? event.sortField[0] : event.sortField;
            this.sortDir = event.sortOrder === -1 ? 'desc' : 'asc';
        }
        this.loadRevendeurs();
    }

    openCreate(): void {
        this.selectedRevendeur = null;
        this.showFormDialog = true;
    }

    openEdit(r: RevendeurResponse, event: Event): void {
        event.stopPropagation();
        this.selectedRevendeur = r;
        this.showFormDialog = true;
    }

    openDetail(r: RevendeurResponse): void {
        this.selectedRevendeur = r;
        this.showDetailDialog = true;
    }

    confirmArchiver(r: RevendeurResponse, event: Event): void {
        event.stopPropagation();
        this.confirmationService.confirm({
            message: `Archiver « ${r.nom} » ?`,
            header: "Confirmer l'archivage",
            icon: 'pi pi-inbox',
            accept: () => this.archiver(r)
        });
    }

    private archiver(r: RevendeurResponse): void {
        this.revendeurService.archiver(r.id!).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Archivé', detail: `${r.nom} archivé.` });
                this.loadRevendeurs();
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: "Impossible d'archiver." });
            }
        });
    }

    onFormSaved(): void {
        this.showFormDialog = false;
        this.loadRevendeurs();
        this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Revendeur enregistré.' });
        this.cdr.markForCheck();
    }

    getInitials(nom: string): string {
        return nom
            .split(' ')
            .slice(0, 2)
            .map((w) => w[0])
            .join('')
            .toUpperCase();
    }
}
