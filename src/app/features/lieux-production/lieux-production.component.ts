import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';

import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';

import { CreateEntrepotRequest, EntrepotControllerService, EntrepotResponse, UpdateEntrepotRequest, UtilisateurMarchandControllerService, UtilisateurResponse } from '@/app/modules/openapi';
import { ToolbarModule } from 'primeng/toolbar';

interface LieuVm extends EntrepotResponse {
    utilisateursAssignes: UtilisateurResponse[];
    expanded: boolean;
}

@Component({
    selector: 'app-lieux-production',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, FormsModule, ButtonModule, ToolbarModule, TagModule, ToastModule, InputTextModule, TextareaModule, DialogModule, TooltipModule, DividerModule],
    providers: [MessageService, ConfirmationService],
    templateUrl: './lieux-production.component.html'
})
export class LieuxProductionComponent implements OnInit {
    lieux: LieuVm[] = [];
    tousUtilisateurs: UtilisateurResponse[] = [];
    loading = false;

    // Dialog form création/édition
    showFormDialog = false;
    editingLieu: LieuVm | null = null;
    savingForm = false;
    formData = { nom: '', adresse: '' };

    // Assignation en cours (lieuId → userId en loading)
    assignationLoading = new Set<string>();

    constructor(
        private entrepotService: EntrepotControllerService,
        private utilisateurService: UtilisateurMarchandControllerService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.utilisateurService.listerUtilisateurMarchand().subscribe({
            next: (data: UtilisateurResponse[]) => {
                this.tousUtilisateurs = data.filter((u) => u.actif);
                this.cdr.detectChanges();
            }
        });
        this.loadLieux();
    }

    loadLieux(): void {
        this.loading = true;
        this.entrepotService.listerEntrepot().subscribe({
            next: (data: EntrepotResponse[]) => {
                // On conserve l'état expanded si déjà ouvert
                const prevExpanded = new Map(this.lieux.map((l) => [l.id, l.expanded]));
                this.lieux = data.map((e) => ({
                    ...e,
                    utilisateursAssignes: [],
                    expanded: prevExpanded.get(e.id) ?? false
                }));
                this.loading = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.loading = false;
                this.cdr.detectChanges();
            }
        });
    }

    // ── Création / Édition ──────────────────────────────────────────────────

    openCreate(): void {
        this.editingLieu = null;
        this.formData = { nom: '', adresse: '' };
        this.showFormDialog = true;
        this.cdr.detectChanges();
    }

    openEdit(lieu: LieuVm, event: Event): void {
        event.stopPropagation();
        this.editingLieu = lieu;
        this.formData = { nom: lieu.nom ?? '', adresse: lieu.adresse ?? '' };
        this.showFormDialog = true;
        this.cdr.detectChanges();
    }

    submitForm(ngForm: NgForm): void {
        if (ngForm.invalid) return;
        this.savingForm = true;

        if (this.editingLieu?.id) {
            const req: UpdateEntrepotRequest = { nom: this.formData.nom, adresse: this.formData.adresse || undefined };
            this.entrepotService.modifierEntrepot(this.editingLieu.id, req).subscribe({
                next: () => {
                    this.savingForm = false;
                    this.showFormDialog = false;
                    this.messageService.add({ severity: 'success', summary: 'Modifié', detail: `${this.formData.nom} mis à jour` });
                    this.loadLieux();
                },
                error: () => {
                    this.savingForm = false;
                    this.cdr.detectChanges();
                }
            });
        } else {
            const req: CreateEntrepotRequest = { nom: this.formData.nom, adresse: this.formData.adresse || undefined };
            this.entrepotService.creerEntrepot(req).subscribe({
                next: () => {
                    this.savingForm = false;
                    this.showFormDialog = false;
                    this.messageService.add({ severity: 'success', summary: 'Créé', detail: `${this.formData.nom} ajouté` });
                    this.loadLieux();
                },
                error: () => {
                    this.savingForm = false;
                    this.cdr.detectChanges();
                }
            });
        }
    }

    confirmDesactiver(lieu: LieuVm, event: Event): void {
        event.stopPropagation();
        this.confirmationService.confirm({
            message: `Désactiver "${lieu.nom}" ? Les runs existants ne seront pas affectés.`,
            header: 'Désactiver ce lieu',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.entrepotService.desactiverEntrepot(lieu.id!).subscribe({
                    next: () => {
                        this.messageService.add({ severity: 'success', summary: 'Désactivé', detail: lieu.nom });
                        this.loadLieux();
                    }
                });
            }
        });
    }

    // ── Assignation utilisateurs ─────────────────────────────────────────────

    isAssigne(lieu: LieuVm, user: UtilisateurResponse): boolean {
        return lieu.utilisateursAssignes.some((u) => u.id === user.id);
    }

    isAssignationLoading(lieuId: number, userId: number): boolean {
        return this.assignationLoading.has(`${lieuId}-${userId}`);
    }

    toggleAssignation(lieu: LieuVm, user: UtilisateurResponse): void {
        if (!lieu.id || !user.id) return;
        const key = `${lieu.id}-${user.id}`;
        this.assignationLoading.add(key);
        this.cdr.detectChanges();

        const assigne = this.isAssigne(lieu, user);
        const action$ = assigne ? this.entrepotService.desassignerEntrepot(lieu.id, user.id) : this.entrepotService.assignerEntrepot(lieu.id, user.id);

        action$.subscribe({
            next: () => {
                if (assigne) {
                    lieu.utilisateursAssignes = lieu.utilisateursAssignes.filter((u) => u.id !== user.id);
                } else {
                    lieu.utilisateursAssignes = [...lieu.utilisateursAssignes, user];
                }
                this.assignationLoading.delete(key);
                this.messageService.add({
                    severity: 'success',
                    summary: assigne ? 'Désassigné' : 'Assigné',
                    detail: `${user.nom} ${assigne ? 'retiré de' : 'ajouté à'} ${lieu.nom}`
                });
                this.cdr.detectChanges();
            },
            error: () => {
                this.assignationLoading.delete(key);
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Action impossible' });
                this.cdr.detectChanges();
            }
        });
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    toggleExpand(lieu: LieuVm): void {
        lieu.expanded = !lieu.expanded;
        this.cdr.detectChanges();
    }

    getInitiales(nom: string | undefined): string {
        if (!nom) return '?';
        return nom
            .split(' ')
            .map((p) => p[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }

    getAvatarColor(index: number): string {
        const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];
        return colors[index % colors.length];
    }

    getUserIndex(user: UtilisateurResponse): number {
        return this.tousUtilisateurs.findIndex((u) => u.id === user.id);
    }

    get lieuxActifs(): LieuVm[] {
        return this.lieux.filter((l) => l.actif);
    }

    get lieuxInactifs(): LieuVm[] {
        return this.lieux.filter((l) => !l.actif);
    }
}
