import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
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

import {
    ChargeAtelierControllerService,
    ChargeAtelierRequest,
    ChargeAtelierResponse,
    CreateEntrepotRequest,
    EntrepotControllerService,
    EntrepotResponse,
    TauxHoraireControllerService,
    TauxHoraireRequest,
    TauxHoraireResponse,
    UpdateEntrepotRequest,
    UtilisateurMarchandControllerService,
    UtilisateurResponse
} from '@/app/modules/openapi';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { ToolbarModule } from 'primeng/toolbar';

interface LieuVm extends EntrepotResponse {
    utilisateursAssignes: UtilisateurResponse[];
    expanded: boolean;
}

@Component({
    selector: 'app-lieux-production',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        InputNumberModule,
        ToolbarModule,
        SkeletonModule,
        TableModule,
        ConfirmDialogModule,
        CommonModule,
        FormsModule,
        ButtonModule,
        ToolbarModule,
        TagModule,
        ToastModule,
        InputTextModule,
        TextareaModule,
        DialogModule,
        TooltipModule,
        DividerModule
    ],
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

    // Charges
    charges: ChargeAtelierResponse[] = [];
    loadingCharges = false;
    showChargeDialog = false;
    editingCharge: ChargeAtelierResponse | null = null;
    savingCharge = false;
    chargeForm: ChargeAtelierRequest = { libelle: '', montantMensuel: 0, volumeCibleMensuel: 0 };

    // Taux horaires
    tauxHoraires: TauxHoraireResponse[] = [];
    loadingTaux = false;
    showTauxDialog = false;
    editingTaux: TauxHoraireResponse | null = null;
    savingTaux = false;
    tauxForm: TauxHoraireRequest = { libelle: '', tauxHoraire: 0, nbOperateurs: 1 };

    constructor(
        private entrepotService: EntrepotControllerService,
        private utilisateurService: UtilisateurMarchandControllerService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private cdr: ChangeDetectorRef,
        @Inject(ChargeAtelierControllerService)
        private chargeService: ChargeAtelierControllerService,
        @Inject(TauxHoraireControllerService)
        private tauxService: TauxHoraireControllerService
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
    // ── Charges ──────────────────────────────────────────────────

    get totalChargesFixesMensuelles(): number {
        return this.charges.reduce((s, c) => s + (c.montantMensuel ?? 0), 0);
    }

    loadCharges(): void {
        this.loadingCharges = true;
        this.chargeService.listerChargeAtelier().subscribe({
            next: (data) => {
                this.charges = data;
                this.loadingCharges = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.loadingCharges = false;
                this.cdr.detectChanges();
            }
        });
    }

    openCreateCharge(): void {
        this.editingCharge = null;
        this.chargeForm = { libelle: '', montantMensuel: 0, volumeCibleMensuel: 0 };
        this.showChargeDialog = true;
        this.cdr.detectChanges();
    }

    openEditCharge(c: ChargeAtelierResponse): void {
        this.editingCharge = c;
        this.chargeForm = {
            libelle: c.libelle ?? '',
            montantMensuel: c.montantMensuel ?? 0,
            volumeCibleMensuel: c.volumeCibleMensuel ?? 0
        };
        this.showChargeDialog = true;
        this.cdr.detectChanges();
    }

    submitCharge(): void {
        if (!this.chargeForm.libelle || !this.chargeForm.montantMensuel || !this.chargeForm.volumeCibleMensuel) return;
        this.savingCharge = true;
        const action$ = this.editingCharge?.id ? this.chargeService.modifierChargeAtelier(this.editingCharge.id, this.chargeForm) : this.chargeService.creerChargeAtelier(this.chargeForm);
        action$.subscribe({
            next: () => {
                this.savingCharge = false;
                this.showChargeDialog = false;
                this.messageService.add({ severity: 'success', summary: 'Succès', detail: this.editingCharge ? 'Charge modifiée' : 'Charge ajoutée' });
                this.loadCharges();
            },
            error: () => {
                this.savingCharge = false;
                this.cdr.detectChanges();
            }
        });
    }

    supprimerCharge(c: ChargeAtelierResponse): void {
        this.confirmationService.confirm({
            message: `Supprimer "${c.libelle}" ?`,
            header: 'Confirmer la suppression',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.chargeService.supprimerChargeAtelier(c.id!).subscribe({
                    next: () => {
                        this.messageService.add({ severity: 'success', summary: 'Supprimé', detail: c.libelle });
                        this.loadCharges();
                    }
                });
            }
        });
    }

    getCoutUnitaireCharge(c: ChargeAtelierResponse): number {
        if (!c.montantMensuel || !c.volumeCibleMensuel) return 0;
        return c.montantMensuel / c.volumeCibleMensuel;
    }

    // ── Taux horaires ─────────────────────────────────────────────

    loadTaux(): void {
        this.loadingTaux = true;
        this.tauxService.lister().subscribe({
            next: (data) => {
                this.tauxHoraires = data;
                this.loadingTaux = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.loadingTaux = false;
                this.cdr.detectChanges();
            }
        });
    }

    openCreateTaux(): void {
        this.editingTaux = null;
        this.tauxForm = { libelle: '', tauxHoraire: 0, nbOperateurs: 1 };
        this.showTauxDialog = true;
        this.cdr.detectChanges();
    }

    openEditTaux(t: TauxHoraireResponse): void {
        this.editingTaux = t;
        this.tauxForm = {
            libelle: t.libelle ?? '',
            tauxHoraire: t.tauxHoraire ?? 0,
            nbOperateurs: t.nbOperateurs ?? 1
        };
        this.showTauxDialog = true;
        this.cdr.detectChanges();
    }

    submitTaux(): void {
        if (!this.tauxForm.libelle || !this.tauxForm.tauxHoraire) return;
        this.savingTaux = true;
        const action$ = this.editingTaux?.id ? this.tauxService.modifier(this.editingTaux.id, this.tauxForm) : this.tauxService.creer(this.tauxForm);
        action$.subscribe({
            next: () => {
                this.savingTaux = false;
                this.showTauxDialog = false;
                this.messageService.add({ severity: 'success', summary: 'Succès', detail: this.editingTaux ? 'Taux modifié' : 'Taux ajouté' });
                this.loadTaux();
            },
            error: () => {
                this.savingTaux = false;
                this.cdr.detectChanges();
            }
        });
    }

    supprimerTaux(t: TauxHoraireResponse): void {
        this.confirmationService.confirm({
            message: `Supprimer "${t.libelle}" ?`,
            header: 'Confirmer la suppression',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.tauxService.supprimer(t.id!).subscribe({
                    next: () => {
                        this.messageService.add({ severity: 'success', summary: 'Supprimé', detail: t.libelle });
                        this.loadTaux();
                    }
                });
            }
        });
    }

    getCoutMOParBatch(t: TauxHoraireResponse): string {
        if (!t.tauxHoraire || !t.nbOperateurs) return '—';
        return (t.tauxHoraire * t.nbOperateurs).toFixed(2) + ' €/h';
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
