import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

// PrimeNG
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProgressBarModule } from 'primeng/progressbar';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';

import { MateriauControllerService, MateriauResponse } from '@/app/modules/openapi';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { AjustementDialogComponent } from '../ajustement-dialog/ajustement-dialog.component';
import { EntreeStockDialogComponent } from '../entree-stock-dialog/entree-stock-dialog.component';
import { HistoriqueDialogComponent } from '../historique-dialog/historique-dialog.component';
import { MateriauFormComponent } from '../materiau-form/materiau-form.component';

@Component({
  selector: 'app-materiaux-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    TagModule,
    TooltipModule,
    ToastModule,
    ToolbarModule,
    ToggleSwitchModule,
    ConfirmDialogModule,
    ProgressBarModule,
    MateriauFormComponent,
    EntreeStockDialogComponent,
    AjustementDialogComponent,
    HistoriqueDialogComponent
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './materiaux-list.component.html',
})
export class MateriauxListComponent implements OnInit {
  materiaux: MateriauResponse[] = [];
  loading = false;
  inclureArchives = false;

  // Dialog states
  showFormDialog = false;
  showEntreeDialog = false;
  showAjustementDialog = false;
  showHistoriqueDialog = false;

  selectedMateriau: MateriauResponse | null = null;

  constructor(
    private materiauService: MateriauControllerService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadMateriaux();
  }

  loadMateriaux(): void {
    this.loading = true;
    this.materiauService.listerMateriau(this.inclureArchives).subscribe({
      next: (data: any) => {
        this.materiaux = Array.isArray(data) ? data : data.content ?? data.items ?? [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les matériaux' });
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  get materiauxEnAlerte(): MateriauResponse[] {
    return this.materiaux.filter(m => m.enAlerte && !m.archive);
  }

  onToggleArchives(): void {
    this.loadMateriaux();
  }

  openCreate(): void {
    this.selectedMateriau = null;
    this.showFormDialog = true;
  }

  openEdit(materiau: MateriauResponse): void {
    this.selectedMateriau = { ...materiau };
    this.showFormDialog = true;
  }

  openEntreeStock(materiau: MateriauResponse): void {
    this.selectedMateriau = materiau;
    this.showEntreeDialog = true;
  }

  openAjustement(materiau: MateriauResponse): void {
    this.selectedMateriau = materiau;
    this.showAjustementDialog = true;
  }

  openHistorique(materiau: MateriauResponse): void {
    this.selectedMateriau = materiau;
    this.showHistoriqueDialog = true;
  }

  confirmArchive(materiau: MateriauResponse): void {
    this.confirmationService.confirm({
      message: `Archiver le matériau "${materiau.nom}" ?`,
      header: 'Confirmer l\'archivage',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.archiveMateriau(materiau.id!),
    });
  }

  private archiveMateriau(id: number): void {
    this.materiauService.archiverMateriau(id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Archivé', detail: 'Matériau archivé avec succès' });
        this.loadMateriaux();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Archivage impossible' });
      },
    });
  }

  onFormSaved(): void {
    this.showFormDialog = false;
    this.loadMateriaux();
  }

  onStockUpdated(result: { success: boolean; message: string }): void {
    this.showEntreeDialog = false;
    this.showAjustementDialog = false;
    this.messageService.add({
      severity: result.success ? 'success' : 'error',
      summary: result.success ? 'Succès' : 'Erreur',
      detail: result.message
    });
    if (result.success) this.loadMateriaux();
  }

  getTotalStock(materiau: MateriauResponse): number {
    return materiau.stocks?.reduce((sum, s) => sum + (s.stockActuel ?? 0), 0) ?? 0;
  }

  getStockSeverity(materiau: MateriauResponse): 'success' | 'warn' | 'danger' {
    if (materiau.enAlerte) return 'danger';
    const total = this.getTotalStock(materiau);
    if (total === 0) return 'warn';
    return 'success';
  }

  getStockLabel(materiau: MateriauResponse): string {
    if (materiau.enAlerte) return 'Alerte';
    const total = this.getTotalStock(materiau);
    if (total === 0) return 'Vide';
    return 'OK';
  }
}
