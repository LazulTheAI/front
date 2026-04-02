import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';

import { BonCommandeControllerService, BonCommandeResponse, EntrepotControllerService, EntrepotResponse, LigneCommandeFournisseurResponse, ReceptionControllerService, ReceptionRequest } from '@/app/modules/openapi';
import { TranslocoModule } from '@jsverse/transloco';
import { DatePickerModule } from 'primeng/datepicker';

interface LigneReception {
    ligneId: number;
    materiauNom: string;
    unite: string;
    quantiteCommandee: number;
    quantiteRecue: number;
    quantiteARecevoir: number | null;
    statut: string;
}

@Component({
    selector: 'app-bon-commande-detail',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, FormsModule, DialogModule, ButtonModule, TableModule, TagModule, DividerModule, TooltipModule, ToastModule, InputNumberModule, SelectModule, TranslocoModule, DatePickerModule],
    providers: [MessageService],
    templateUrl: './bon-commande-detail.component.html'
})
export class BonCommandeDetailComponent implements OnChanges {
    @Input() visible = false;
    @Output() visibleChange = new EventEmitter<boolean>();

    @Input() bonId: number | null = null;
    @Output() closed = new EventEmitter<void>();

    bon: BonCommandeResponse | null = null;
    loading = false;

    // Mode réception
    modeReception = false;
    savingReception = false;
    lignesReception: LigneReception[] = [];
    entrepots: EntrepotResponse[] = [];
    entrepotOptions: { label: string; value: number }[] = [];
    entrepotReceptionId: number | null = null;

    constructor(
        private bonService: BonCommandeControllerService,
        private receptionService: ReceptionControllerService,
        private entrepotService: EntrepotControllerService,
        private messageService: MessageService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['visible'] && this.visible && this.bonId) {
            this.modeReception = false;
            this.loadBon();
            this.loadEntrepots();
        }
    }

    loadBon(): void {
        if (!this.bonId) return;
        this.loading = true;
        this.bonService.getBonCommandeById(this.bonId).subscribe({
            next: (data: BonCommandeResponse) => {
                this.bon = data;
                this.loading = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.loading = false;
                this.cdr.detectChanges();
            }
        });
    }

    loadEntrepots(): void {
        this.entrepotService.listerEntrepot().subscribe({
            next: (data: EntrepotResponse[]) => {
                this.entrepots = data.filter((e) => e.actif);
                this.entrepotOptions = this.entrepots.map((e) => ({ label: e.nom!, value: e.id! }));
                if (this.entrepots.length === 1) this.entrepotReceptionId = this.entrepots[0].id!;
                this.cdr.detectChanges();
            }
        });
    }

    onHide(): void {
        this.visibleChange.emit(false);
        this.closed.emit();
    }

    // Envoyer le BC
    envoyerBC(): void {
        if (!this.bon?.id) return;
        this.bonService.envoyerBonCommande(this.bon.id).subscribe({
            next: (data: BonCommandeResponse) => {
                this.bon = data;
                this.messageService.add({ severity: 'success', summary: 'Envoyé', detail: 'Bon de commande marqué comme envoyé' });
                this.cdr.detectChanges();
            }
        });
    }

    // Démarrer la réception
    startReception(): void {
        this.lignesReception = (this.bon?.lignes ?? [])
            .filter((l) => l.statut !== 'RECU')
            .map((l) => ({
                ligneId: l.id!,
                materiauNom: l.materiauNom ?? '',
                unite: l.unite ?? '',
                quantiteCommandee: l.quantiteCommandee ?? 0,
                quantiteRecue: l.quantiteRecue ?? 0,
                quantiteARecevoir: (l.quantiteCommandee ?? 0) - (l.quantiteRecue ?? 0),
                statut: l.statut ?? ''
            }));
        this.modeReception = true;
        this.cdr.detectChanges();
    }

    cancelReception(): void {
        this.modeReception = false;
        this.cdr.detectChanges();
    }

    submitReception(): void {
        if (!this.bon?.id || !this.entrepotReceptionId) return;
        const lignesARecevoir = this.lignesReception.filter((l) => (l.quantiteARecevoir ?? 0) > 0);
        if (lignesARecevoir.length === 0) return;

        this.savingReception = true;
        const req: ReceptionRequest = {
            entrepotId: this.entrepotReceptionId,
            lignes: lignesARecevoir.map((l) => ({
                ligneId: l.ligneId,
                quantiteRecue: l.quantiteARecevoir!
            }))
        };

        this.receptionService.reception(this.bon.id, req).subscribe({
            next: (data: BonCommandeResponse) => {
                this.bon = data;
                this.savingReception = false;
                this.modeReception = false;
                this.messageService.add({ severity: 'success', summary: 'Réception enregistrée', detail: 'Le stock a été mis à jour' });
                this.cdr.detectChanges();
            },
            error: () => {
                this.savingReception = false;
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: "Impossible d'enregistrer la réception" });
                this.cdr.detectChanges();
            }
        });
    }

    // Helpers
    getStatutSeverity(statut: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        const map: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary'> = {
            BROUILLON: 'secondary',
            ENVOYE: 'info',
            PARTIELLEMENT_RECU: 'warn',
            RECU: 'success',
            ANNULE: 'danger'
        };
        return map[statut] ?? 'secondary';
    }

    getStatutLabel(statut: string): string {
        const map: Record<string, string> = {
            BROUILLON: 'Brouillon',
            ENVOYE: 'Envoyé',
            PARTIELLEMENT_RECU: 'Partiellement reçu',
            RECU: 'Reçu',
            ANNULE: 'Annulé'
        };
        return map[statut] ?? statut;
    }

    getLigneStatutSeverity(statut: string): 'success' | 'warn' | 'secondary' {
        const map: Record<string, 'success' | 'warn' | 'secondary'> = {
            EN_ATTENTE: 'secondary',
            PARTIELLEMENT_RECU: 'warn',
            RECU: 'success'
        };
        return map[statut] ?? 'secondary';
    }

    getLigneStatutLabel(statut: string): string {
        const map: Record<string, string> = {
            EN_ATTENTE: 'En attente',
            PARTIELLEMENT_RECU: 'Partiel',
            RECU: 'Reçu'
        };
        return map[statut] ?? statut;
    }

    getTotalBC(): number {
        return (
            this.bon?.lignes?.reduce((sum, l) => {
                return sum + ((l.quantiteCommandee ?? 0) * (l.prixUnitaireCents ?? 0)) / 100;
            }, 0) ?? 0
        );
    }

    getProgressionLigne(ligne: LigneCommandeFournisseurResponse): number {
        if (!ligne.quantiteCommandee) return 0;
        return Math.round(((ligne.quantiteRecue ?? 0) / ligne.quantiteCommandee) * 100);
    }

    canEnvoyer(): boolean {
        return this.bon?.statut === 'BROUILLON';
    }
    canReceptionner(): boolean {
        return this.bon?.statut === 'ENVOYE' || this.bon?.statut === 'PARTIELLEMENT_RECU';
    }
}
