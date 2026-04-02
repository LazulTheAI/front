import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';

import { RecetteControllerService, RecetteResponse } from '@/app/modules/openapi';
import { TranslocoModule } from '@jsverse/transloco';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { LierProduitRecetteDialogComponent } from '../lier-produit-recette-dialog/lier-produit-recette-dialog.component';
import { RecetteDetailComponent } from '../recette-detail/recette-detail.component';
import { RecetteFormComponent } from '../recette-form/recette-form.component';

@Component({
    selector: 'app-recettes-list',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        ConfirmDialog,
        FormsModule,
        RouterModule,
        LierProduitRecetteDialogComponent,
        TableModule,
        ButtonModule,
        TagModule,
        TranslocoModule,
        TooltipModule,
        ToastModule,
        ToolbarModule,
        ToggleSwitchModule,
        ChipModule,
        RecetteFormComponent,
        RecetteDetailComponent
    ],
    providers: [MessageService, ConfirmationService],
    templateUrl: './recettes-list.component.html'
})
export class RecettesListComponent implements OnInit {
    recettes: RecetteResponse[] = [];
    loading = false;
    inclureArchives = false;

    showFormDialog = false;
    showDetailDialog = false;
    showLierProduitDialog = false;

    selectedRecette: RecetteResponse | null = null;
    recettesEnAlerte: RecetteResponse[] = [];

    constructor(
        private router: Router,
        private recetteService: RecetteControllerService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.loadRecettes();
    }

    openLierProduit(recette: RecetteResponse, event: Event): void {
        event.stopPropagation();
        this.selectedRecette = recette;
        this.showLierProduitDialog = true;
    }

    onLierProduitSaved(result: { success: boolean; message: string }): void {
        this.messageService.add({
            severity: result.success ? 'success' : 'error',
            summary: result.success ? 'Succès' : 'Erreur',
            detail: result.message
        });
        if (result.success) {
            this.loadRecettes();
        }
    }

    loadRecettes(): void {
        this.loading = true;
        this.recetteService.listerRecetteResponse(this.inclureArchives).subscribe({
            next: (data) => {
                this.recettes = data;
                this.recettesEnAlerte = data.filter((r) => !r.archive && r.ingredients?.some((i) => i.enAlerte));
                this.loading = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.loading = false;
                this.cdr.detectChanges();
            }
        });
    }

    navigateToCreate(): void {
        this.router.navigate(['/recettes/nouvelle']);
    }

    openEdit(recette: RecetteResponse, event: Event): void {
        event.stopPropagation();
        this.selectedRecette = { ...recette };
        this.showFormDialog = true;
    }

    openDetail(recette: RecetteResponse): void {
        this.selectedRecette = recette;
        this.showDetailDialog = true;
    }
    confirmArchive(recette: RecetteResponse, event: Event): void {
        event.stopPropagation();
        this.confirmationService.confirm({
            message: `Archiver la recette "${recette.nom}" ?`,
            header: "Confirmer l'archivage",
            icon: 'pi pi-exclamation-triangle',
            accept: () => this.archiveRecette(recette.id!)
        });
    }

    private archiveRecette(id: number): void {
        this.recetteService.archiverRecette(id).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Archivée', detail: 'Recette archivée avec succès' });
                this.loadRecettes();
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Archivage impossible' });
            }
        });
    }

    onFormSaved(): void {
        this.showFormDialog = false;
        this.loadRecettes();
    }

    onDetailClosed(): void {
        this.showDetailDialog = false;
        this.loadRecettes();
    }

    getNbIngredients(recette: RecetteResponse): number {
        return recette.ingredients?.length ?? 0;
    }

    hasAlerte(recette: RecetteResponse): boolean {
        return recette.ingredients?.some((i) => i.enAlerte) ?? false;
    }

    getDureeFabricationLabel(minutes: number | undefined): string {
        if (!minutes) return '—';
        if (minutes < 60) return `${minutes} min`;
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
    }
}
