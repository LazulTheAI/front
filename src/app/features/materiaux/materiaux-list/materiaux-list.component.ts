import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';

import { MateriauControllerService, MateriauResponse } from '@/app/modules/openapi';
import { MateriauFormComponent } from '../materiau-form/materiau-form.component';

@Component({
    selector: 'app-materiaux-list',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, FormsModule, TableModule, ButtonModule, TagModule, TooltipModule, ToastModule, ToolbarModule, ToggleSwitchModule, InputTextModule, ConfirmDialogModule, MateriauFormComponent],
    providers: [MessageService, ConfirmationService],
    templateUrl: './materiaux-list.component.html'
})
export class MateriauxListComponent implements OnInit, OnDestroy {
    materiaux: MateriauResponse[] = [];
    totalRecords = 0;
    loading = false;

    page = 0;
    size = 20;
    sortBy = 'nom';
    sortDir = 'asc';

    inclureArchives = false;
    search = '';
    private search$ = new Subject<string>();

    showFormDialog = false;
    selectedMateriau: MateriauResponse | null = null;

    constructor(
        private materiauService: MateriauControllerService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.search$.pipe(debounceTime(400), distinctUntilChanged()).subscribe((v) => {
            this.search = v;
            this.page = 0;
            this.load();
        });
        this.load();
    }

    ngOnDestroy(): void {
        this.search$.complete();
    }

    load(): void {
        this.loading = true;
        this.materiauService.listerMateriau(this.inclureArchives, this.page, this.size, this.sortBy, this.sortDir, this.search || undefined).subscribe({
            next: (data: any) => {
                this.materiaux = data.content ?? [];
                this.totalRecords = data.totalElements ?? 0;
                this.loading = false;
                this.cdr.markForCheck();
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Chargement impossible' });
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
        this.load();
    }

    onSearchInput(v: string): void {
        this.search$.next(v);
    }
    onToggleArchives(): void {
        this.page = 0;
        this.load();
    }

    openCreate(): void {
        this.selectedMateriau = null;
        this.showFormDialog = true;
    }
    openEdit(m: MateriauResponse): void {
        this.selectedMateriau = { ...m };
        this.showFormDialog = true;
    }
    onFormSaved(): void {
        this.showFormDialog = false;
        this.load();
    }

    confirmArchive(m: MateriauResponse): void {
        this.confirmationService.confirm({
            message: `Archiver "${m.nom}" ?`,
            header: "Confirmer l'archivage",
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.materiauService.archiverMateriau(m.id!).subscribe({
                    next: () => {
                        this.messageService.add({ severity: 'success', summary: 'Archivé', detail: `"${m.nom}" archivé` });
                        this.load();
                    },
                    error: () => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Archivage impossible' })
                });
            }
        });
    }
}
