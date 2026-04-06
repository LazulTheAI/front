import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import {
    BonCommandeControllerService,
    BonCommandeResponse,
    EntreeStockRequest,
    EntrepotControllerService,
    EntrepotResponse,
    FournisseurControllerService,
    FournisseurResponse,
    MateriauControllerService,
    MateriauResponse
} from '@/app/modules/openapi';
import { MessageService } from 'primeng/api';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DividerModule } from 'primeng/divider';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';

@Component({
    selector: 'app-mobile-reception',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        FormsModule,
        ButtonModule,
        InputTextModule,
        InputNumberModule,
        AutoCompleteModule,
        SelectModule,
        DatePickerModule,
        DividerModule,
        ToastModule
    ],
    providers: [MessageService],
    templateUrl: './mobile-reception.component.html',
    styleUrl: './mobile-reception.component.scss'
})
export class MobileReceptionComponent implements OnInit {
    saving = false;
    today = new Date();

    allMateriaux: MateriauResponse[] = [];
    filteredMateriaux: MateriauResponse[] = [];
    fournisseurs: FournisseurResponse[] = [];
    entrepots: EntrepotResponse[] = [];

    form = {
        materiau: null as MateriauResponse | null,
        fournisseurId: null as number | null,
        quantite: null as number | null,
        coutUnitaire: null as number | null,
        numeroLot: '',
        dlc: null as Date | null,
        entrepotId: null as number | null
    };

    constructor(
        private materiauService: MateriauControllerService,
        private fournisseurService: FournisseurControllerService,
        private entrepotService: EntrepotControllerService,
        private bonCommandeService: BonCommandeControllerService,
        private messageService: MessageService,
        private route: ActivatedRoute,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.loadReferentials();
        this.route.queryParamMap.subscribe((params) => {
            const materiauId = params.get('materiauId');
            if (materiauId) {
                this.materiauService.detailMateriau(+materiauId).subscribe({
                    next: (m) => {
                        this.form.materiau = m;
                        this.cdr.markForCheck();
                    }
                });
            }
            const commandeId = params.get('commandeId');
            if (commandeId) {
                this.prefillFromCommande(+commandeId);
            }
        });
    }

    private loadReferentials(): void {
        this.materiauService.tousLesMateriaux().subscribe({
            next: (data: any) => {
                this.allMateriaux = Array.isArray(data) ? data : (data.content ?? []);
                this.cdr.markForCheck();
            }
        });
        this.fournisseurService.listerFournisseur().subscribe({
            next: (data) => {
                this.fournisseurs = Array.isArray(data) ? data : [];
                this.cdr.markForCheck();
            }
        });
        this.entrepotService.listerEntrepot().subscribe({
            next: (data: any) => {
                const items = Array.isArray(data) ? data : (data.content ?? data.items ?? []);
                this.entrepots = items.filter((e: EntrepotResponse) => e.actif);
                this.cdr.markForCheck();
            }
        });
    }

    private prefillFromCommande(commandeId: number): void {
        this.bonCommandeService.getBonCommandeById(commandeId).subscribe({
            next: (commande: BonCommandeResponse) => {
                if (commande.fournisseurId) {
                    this.form.fournisseurId = commande.fournisseurId;
                }
                // Pre-fill first undelivered line
                const ligne = commande.lignes?.find((l) => l.statut !== 'RECU');
                if (ligne?.materiauId) {
                    this.materiauService.detailMateriau(ligne.materiauId).subscribe({
                        next: (m) => {
                            this.form.materiau = m;
                            this.form.quantite = ligne.quantiteCommandee ?? null;
                            this.cdr.markForCheck();
                        }
                    });
                }
                this.cdr.markForCheck();
            }
        });
    }

    searchMateriau(event: { query: string }): void {
        const q = event.query.toLowerCase();
        this.filteredMateriaux = this.allMateriaux.filter((m) => m.nom?.toLowerCase().includes(q));
    }

    get fournisseurOptions() {
        return this.fournisseurs.map((f) => ({ label: f.nom!, value: f.id! }));
    }

    get entrepotOptions() {
        return this.entrepots.map((e) => ({ label: e.nom!, value: e.id! }));
    }

    submit(ngForm: NgForm): void {
        if (ngForm.invalid || !this.form.materiau?.id || !this.form.entrepotId || !this.form.quantite) return;
        this.saving = true;
        this.cdr.markForCheck();

        const req: EntreeStockRequest = {
            quantite: this.form.quantite,
            coutUnitaire: this.form.coutUnitaire ?? undefined,
            entrepotId: this.form.entrepotId,
            numeroLot: this.form.numeroLot || undefined,
            expiresAt: this.form.dlc?.toISOString() ?? undefined,
            referenceId: this.form.fournisseurId ? String(this.form.fournisseurId) : undefined
        };

        this.materiauService.entreeMouvementStock(this.form.materiau.id, req).subscribe({
            next: () => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Réception enregistrée',
                    detail: `${this.form.quantite} ${this.form.materiau?.unite} de ${this.form.materiau?.nom} reçu(s)`
                });
                this.saving = false;
                this.resetForm(ngForm);
                this.cdr.markForCheck();
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible d\'enregistrer la réception' });
                this.saving = false;
                this.cdr.markForCheck();
            }
        });
    }

    private resetForm(ngForm: NgForm): void {
        ngForm.resetForm();
        this.form = {
            materiau: null,
            fournisseurId: null,
            quantite: null,
            coutUnitaire: null,
            numeroLot: '',
            dlc: null,
            entrepotId: null
        };
    }

    scanAnother(): void {
        this.router.navigate(['/mobile/scanner']);
    }
}
