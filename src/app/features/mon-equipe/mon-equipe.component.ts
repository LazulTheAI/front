import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';

import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';

import { CreateUtilisateurRequest, UpdateUtilisateurRequest, UtilisateurMarchandControllerService, UtilisateurResponse } from '@/app/modules/openapi';
import { ToolbarModule } from 'primeng/toolbar';
import { UtilisateursInactifsPipe } from './mon-equipe.pipes';
import { TranslocoModule } from '@jsverse/transloco';
import { UpgradeBannerComponent } from '@/app/shared/plan-gating.components';
import { RequiresFeatureDirective } from '@/app/shared/requires-plan.directive';

@Component({
    selector: 'app-mon-equipe',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, FormsModule, ToolbarModule, ButtonModule, TagModule, ToastModule, InputTextModule, PasswordModule, SelectModule, DialogModule, TooltipModule, DividerModule, UtilisateursInactifsPipe, TranslocoModule, RequiresFeatureDirective, UpgradeBannerComponent],
    providers: [MessageService, ConfirmationService],
    templateUrl: './mon-equipe.component.html'
})
export class MonEquipeComponent implements OnInit {
    utilisateurs: UtilisateurResponse[] = [];
    loading = false;

    showFormDialog = false;
    editingUser: UtilisateurResponse | null = null;
    savingForm = false;

    formData = {
        nom: '',
        email: '',
        motDePasse: '',
        role: 'OPERATEUR' as 'ADMIN' | 'OPERATEUR'
    };

    roleOptions = [
        { label: 'Opérateur', value: 'OPERATEUR' },
        { label: 'Administrateur', value: 'ADMIN' }
    ];

    constructor(
        private utilisateurService: UtilisateurMarchandControllerService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.loadUtilisateurs();
    }

    loadUtilisateurs(): void {
        this.loading = true;
        this.utilisateurService.listerUtilisateurMarchand().subscribe({
            next: (data: UtilisateurResponse[]) => {
                this.utilisateurs = data;
                this.loading = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.loading = false;
                this.cdr.detectChanges();
            }
        });
    }

    get admins(): UtilisateurResponse[] {
        return this.utilisateurs.filter((u) => u.role === 'ADMIN');
    }

    get operateurs(): UtilisateurResponse[] {
        return this.utilisateurs.filter((u) => u.role === 'OPERATEUR');
    }

    get nbActifs(): number {
        return this.utilisateurs.filter((u) => u.actif).length;
    }

    openCreate(): void {
        this.editingUser = null;
        this.formData = { nom: '', email: '', motDePasse: '', role: 'OPERATEUR' };
        this.showFormDialog = true;
        this.cdr.detectChanges();
    }

    openEdit(user: UtilisateurResponse, event: Event): void {
        event.stopPropagation();
        this.editingUser = user;
        this.formData = {
            nom: user.nom ?? '',
            email: user.email ?? '',
            motDePasse: '',
            role: (user.role as 'ADMIN' | 'OPERATEUR') ?? 'OPERATEUR'
        };
        this.showFormDialog = true;
        this.cdr.detectChanges();
    }

    submitForm(ngForm: NgForm): void {
        if (ngForm.invalid) return;
        this.savingForm = true;

        if (this.editingUser?.id) {
            const req: UpdateUtilisateurRequest = {
                nom: this.formData.nom,
                role: this.formData.role,
                motDePasse: this.formData.motDePasse || undefined
            };
            this.utilisateurService.modifieUtilisateurMarchandr(this.editingUser.id, req).subscribe({
                next: () => {
                    this.savingForm = false;
                    this.showFormDialog = false;
                    this.messageService.add({ severity: 'success', summary: 'Modifié', detail: `${this.formData.nom} mis à jour` });
                    this.loadUtilisateurs();
                },
                error: () => {
                    this.savingForm = false;
                    this.cdr.detectChanges();
                }
            });
        } else {
            const req: CreateUtilisateurRequest = {
                nom: this.formData.nom,
                email: this.formData.email,
                motDePasse: this.formData.motDePasse,
                role: this.formData.role
            };
            this.utilisateurService.creerUtilisateurMarchand(req).subscribe({
                next: () => {
                    this.savingForm = false;
                    this.showFormDialog = false;
                    this.messageService.add({ severity: 'success', summary: 'Invité', detail: `${this.formData.nom} ajouté à l'équipe` });
                    this.loadUtilisateurs();
                },
                error: () => {
                    this.savingForm = false;
                    this.cdr.detectChanges();
                }
            });
        }
    }

    confirmDesactiver(user: UtilisateurResponse, event: Event): void {
        event.stopPropagation();
        this.confirmationService.confirm({
            message: `Désactiver "${user.nom}" ? Il ne pourra plus se connecter.`,
            header: 'Désactiver ce membre',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.utilisateurService.desactiverUtilisateurMarchand(user.id!).subscribe({
                    next: () => {
                        this.messageService.add({ severity: 'success', summary: 'Désactivé', detail: user.nom });
                        this.loadUtilisateurs();
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

    getAvatarColor(index: number): string {
        const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];
        return colors[index % colors.length];
    }

    getUserIndex(user: UtilisateurResponse): number {
        return this.utilisateurs.findIndex((u) => u.id === user.id);
    }
}
