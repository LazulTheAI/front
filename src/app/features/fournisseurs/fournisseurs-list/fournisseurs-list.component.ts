import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';

import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';

import { FournisseurControllerService, FournisseurRequest, FournisseurResponse } from '@/app/modules/openapi';
import { ToolbarModule } from 'primeng/toolbar';

@Component({
    selector: 'app-fournisseurs-list',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, ToolbarModule, FormsModule, ButtonModule, TagModule, ToastModule, InputTextModule, TextareaModule, InputNumberModule, DialogModule, TooltipModule, DividerModule, TableModule],
    providers: [MessageService, ConfirmationService],
    templateUrl: './fournisseurs-list.component.html'
})
export class FournisseursListComponent implements OnInit {
    fournisseurs: FournisseurResponse[] = [];
    loading = false;

    showFormDialog = false;
    showDetailPanel = false;
    editingFournisseur: FournisseurResponse | null = null;
    selectedFournisseur: FournisseurResponse | null = null;
    savingForm = false;

    formData: FournisseurRequest = {
        nom: '',
        email: '',
        telephone: '',
        delaiLivraisonJours: undefined,
        notes: ''
    };

    constructor(
        private fournisseurService: FournisseurControllerService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.loadFournisseurs();
    }

    loadFournisseurs(): void {
        this.loading = true;
        this.fournisseurService.listerFournisseur().subscribe({
            next: (data: FournisseurResponse[]) => {
                this.fournisseurs = data;
                this.loading = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.loading = false;
                this.cdr.detectChanges();
            }
        });
    }

    get fournisseursActifs(): FournisseurResponse[] {
        return this.fournisseurs.filter((f) => !f.archive);
    }

    get fournisseursArchives(): FournisseurResponse[] {
        return this.fournisseurs.filter((f) => f.archive);
    }

    openCreate(): void {
        this.editingFournisseur = null;
        this.formData = { nom: '', email: '', telephone: '', delaiLivraisonJours: undefined, notes: '' };
        this.showFormDialog = true;
        this.cdr.detectChanges();
    }

    openEdit(f: FournisseurResponse, event: Event): void {
        event.stopPropagation();
        this.editingFournisseur = f;
        this.formData = {
            nom: f.nom ?? '',
            email: f.email ?? '',
            telephone: f.telephone ?? '',
            delaiLivraisonJours: f.delaiLivraisonJours ?? undefined,
            notes: f.notes ?? ''
        };
        this.showFormDialog = true;
        this.cdr.detectChanges();
    }

    openDetail(f: FournisseurResponse): void {
        this.selectedFournisseur = f;
        this.showDetailPanel = true;
        this.cdr.detectChanges();
    }

    submitForm(ngForm: NgForm): void {
        if (ngForm.invalid) return;
        this.savingForm = true;

        if (this.editingFournisseur?.id) {
            this.fournisseurService.modifierFournisseur(this.editingFournisseur.id, this.formData).subscribe({
                next: () => {
                    this.savingForm = false;
                    this.showFormDialog = false;
                    this.messageService.add({ severity: 'success', summary: 'Modifié', detail: `${this.formData.nom} mis à jour` });
                    this.loadFournisseurs();
                },
                error: () => {
                    this.savingForm = false;
                    this.cdr.detectChanges();
                }
            });
        } else {
            this.fournisseurService.creerFournisseur(this.formData).subscribe({
                next: () => {
                    this.savingForm = false;
                    this.showFormDialog = false;
                    this.messageService.add({ severity: 'success', summary: 'Créé', detail: `${this.formData.nom} ajouté` });
                    this.loadFournisseurs();
                },
                error: () => {
                    this.savingForm = false;
                    this.cdr.detectChanges();
                }
            });
        }
    }

    confirmArchiver(f: FournisseurResponse, event: Event): void {
        event.stopPropagation();
        this.confirmationService.confirm({
            message: `Archiver "${f.nom}" ? Il ne sera plus disponible à la sélection.`,
            header: 'Archiver ce fournisseur',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.fournisseurService.archiverFournisseur(f.id!).subscribe({
                    next: () => {
                        this.messageService.add({ severity: 'success', summary: 'Archivé', detail: f.nom });
                        if (this.selectedFournisseur?.id === f.id) {
                            this.showDetailPanel = false;
                            this.selectedFournisseur = null;
                        }
                        this.loadFournisseurs();
                    }
                });
            }
        });
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

    getDelaiLabel(jours: number | undefined): string {
        if (!jours) return '—';
        if (jours === 1) return '1 jour';
        if (jours < 7) return `${jours} jours`;
        if (jours === 7) return '1 semaine';
        if (jours < 30) return `${Math.round(jours / 7)} semaines`;
        return `${Math.round(jours / 30)} mois`;
    }
}
