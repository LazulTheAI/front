import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ConfirmationService, MessageService } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { AvatarGroupModule } from 'primeng/avatargroup';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';

import {
  EntrepotControllerService,
  EntrepotResponse,
  UtilisateurMarchandControllerService,
  UtilisateurResponse,
} from '@/app/modules/openapi';

import { AssignerUtilisateurDialogComponent } from '../assigner-utilisateur-dialog/assigner-utilisateur-dialog.component';
import { EntrepotFormComponent } from '../entrepot-form/entrepot-form.component';

@Component({
  selector: 'app-entrepots-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    TagModule,
    TooltipModule,
    ToastModule,
    ToolbarModule,
    ConfirmDialogModule,
    AvatarModule,
    AvatarGroupModule,
    EntrepotFormComponent,
    AssignerUtilisateurDialogComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './entrepots-list.component.html',
})
export class EntrepotsListComponent implements OnInit {
  entrepots: EntrepotResponse[] = [];
  utilisateurs: UtilisateurResponse[] = [];
  loading = false;

  // Assignations : map entrepotId → liste utilisateurIds
  assignations: Map<number, number[]> = new Map();

  showFormDialog = false;
  showAssignerDialog = false;
  selectedEntrepot: EntrepotResponse | null = null;

  constructor(
    private entrepotService: EntrepotControllerService,
    private utilisateurService: UtilisateurMarchandControllerService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadUtilisateurs();
    this.loadEntrepots();
  }

  loadUtilisateurs(): void {
    this.utilisateurService.listerUtilisateurMarchand().subscribe({
      next: (data: UtilisateurResponse[]) => {
        this.utilisateurs = data;
        this.cdr.detectChanges();
      },
    });
  }

  loadEntrepots(): void {
    this.loading = true;
    this.entrepotService.listerEntrepot().subscribe({
      next: (data: EntrepotResponse[]) => {
        this.entrepots = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  openCreate(): void {
    this.selectedEntrepot = null;
    this.showFormDialog = true;
    this.cdr.detectChanges();
  }

  openEdit(entrepot: EntrepotResponse, event: Event): void {
    event.stopPropagation();
    this.selectedEntrepot = { ...entrepot };
    this.showFormDialog = true;
    this.cdr.detectChanges();
  }

  openAssigner(entrepot: EntrepotResponse, event: Event): void {
    event.stopPropagation();
    this.selectedEntrepot = entrepot;
    this.showAssignerDialog = true;
    this.cdr.detectChanges();
  }

  confirmDesactiver(entrepot: EntrepotResponse, event: Event): void {
    event.stopPropagation();
    this.confirmationService.confirm({
      message: `Désactiver l'entrepôt "${entrepot.nom}" ?`,
      header: 'Confirmer la désactivation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.desactiverEntrepot(entrepot.id!),
    });
  }

  private desactiverEntrepot(id: number): void {
    this.entrepotService.desactiverEntrepot(id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Désactivé', detail: 'Entrepôt désactivé' });
        this.loadEntrepots();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de désactiver' });
      },
    });
  }

  onFormSaved(result: { success: boolean; message: string }): void {
    this.showFormDialog = false;
    this.messageService.add({
      severity: result.success ? 'success' : 'error',
      summary: result.success ? 'Succès' : 'Erreur',
      detail: result.message,
    });
    if (result.success) this.loadEntrepots();
    this.cdr.detectChanges();
  }

  onAssignationSaved(result: { success: boolean; message: string }): void {
    this.showAssignerDialog = false;
    this.messageService.add({
      severity: result.success ? 'success' : 'error',
      summary: result.success ? 'Succès' : 'Erreur',
      detail: result.message,
    });
    this.cdr.detectChanges();
  }

  getInitiales(nom: string | undefined): string {
    if (!nom) return '?';
    return nom.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
  } 
  
  getAvatarColor(index: number): string {
    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];
    return colors[index % colors.length];
  }
}
