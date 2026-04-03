import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { FileUploadModule } from 'primeng/fileupload';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectModule } from 'primeng/select';
import { StepperModule } from 'primeng/stepper';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';

import { environment } from '@/environments/environment';
import { TranslocoModule } from '@jsverse/transloco';

interface ChampSysteme {
    label: string;
    value: string;
    requis: boolean;
}

interface ErreurImport {
    ligne: number;
    colonne: string;
    message: string;
}

const CHAMPS_PAR_TYPE: Record<string, ChampSysteme[]> = {
    MATIERES: [
        { label: 'Nom *', value: 'nom', requis: true },
        { label: 'Unité *', value: 'unite', requis: true },
        { label: 'Coût unitaire', value: 'coutUnitaire', requis: false },
        { label: 'Seuil alerte', value: 'seuilAlerte', requis: false },
        { label: 'Fournisseur', value: 'fournisseur', requis: false },
        { label: 'Stock initial', value: 'stockInitial', requis: false },
        { label: 'Entrepôt', value: 'entrepot', requis: false }
    ],
    FOURNISSEURS: [
        { label: 'Nom *', value: 'nom', requis: true },
        { label: 'Email', value: 'email', requis: false },
        { label: 'Téléphone', value: 'telephone', requis: false }
    ],
    RECETTES: [
        { label: 'Nom recette *', value: 'recette', requis: true },
        { label: 'Qté produite *', value: 'quantiteProduite', requis: true },
        { label: 'Unité produite *', value: 'uniteProduite', requis: true },
        { label: 'Durée (min)', value: 'dureeFabricationMinutes', requis: false },
        { label: 'Matière *', value: 'matiere', requis: true },
        { label: 'Qté matière *', value: 'quantiteMatiere', requis: true },
        { label: 'Unité matière', value: 'uniteMatiere', requis: false }
    ]
};

@Component({
    selector: 'app-import',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, FormsModule, ToolbarModule, ButtonModule, SelectModule, FileUploadModule, TableModule, TagModule, ToastModule, DividerModule, StepperModule, ProgressBarModule, TooltipModule, TranslocoModule],
    providers: [MessageService],
    templateUrl: './import.component.html'
})
export class ImportComponent {
    // ── Step ──────────────────────────────────────────────────
    activeStep = 0;

    // ── Step 1 ────────────────────────────────────────────────
    typeOptions = [
        { label: 'Matières premières', value: 'MATIERES' },
        { label: 'Fournisseurs', value: 'FOURNISSEURS' },
        { label: 'Recettes', value: 'RECETTES' }
    ];
    typeSelectionne: string | null = null;
    uploading = false;

    // ── Step 2 ────────────────────────────────────────────────
    jobId: number | null = null;
    colonnes: string[] = [];
    apercu: Record<string, string>[] = [];
    mapping: Record<string, string> = {};

    // ── Step 3 ────────────────────────────────────────────────
    processing = false;
    resultat: { statut: string; ok: number; erreurs: number; details: ErreurImport[] } | null = null;

    // ── Historique ────────────────────────────────────────────
    historique: any[] = [];
    loadingHistorique = false;
    ordreImport = [
        { ordre: 1, label: 'Fournisseurs', icon: 'pi-truck', note: 'optionnel' },
        { ordre: 2, label: 'Matières', icon: 'pi-box', note: 'avec stock initial' },
        { ordre: 3, label: 'Recettes', icon: 'pi-book', note: 'matières auto-créées' }
    ];
    constructor(
        private http: HttpClient,
        private messageService: MessageService,
        private cdr: ChangeDetectorRef
    ) {
        this.loadHistorique();
    }

    // ── Getters ───────────────────────────────────────────────

    get champsSysteme(): ChampSysteme[] {
        return this.typeSelectionne ? (CHAMPS_PAR_TYPE[this.typeSelectionne] ?? []) : [];
    }

    get champOptions(): { label: string; value: string | null }[] {
        const opts = (CHAMPS_PAR_TYPE[this.typeSelectionne ?? ''] ?? []).map((c) => ({ label: c.label, value: c.value }));
        return [{ label: '— Ignorer —', value: null }, ...opts];
    }

    get mappingComplet(): boolean {
        const requis = this.champsSysteme.filter((c) => c.requis).map((c) => c.value);
        const mapped = Object.values(this.mapping).filter((v) => v != null);
        return requis.every((r) => mapped.includes(r));
    }

    undoImport(job: any): void {
        this.http.delete(`${environment.baseUrl}/api/imports/${job.id}/undo`).subscribe({
            next: () => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Import annulé',
                    detail: `Les données de l'import #${job.id} ont été supprimées`
                });
                this.loadHistorique();
            },
            error: () => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Erreur',
                    detail: "Impossible d'annuler cet import"
                });
            }
        });
    }

    get champsMappesRequisManquants(): string[] {
        const requis = this.champsSysteme.filter((c) => c.requis).map((c) => c.value);
        const mapped = Object.values(this.mapping).filter((v) => v != null);
        return requis.filter((r) => !mapped.includes(r)).map((r) => this.champsSysteme.find((c) => c.value === r)?.label ?? r);
    }

    // ── Step 1 : Upload ───────────────────────────────────────

    onFileSelect(event: any): void {
        const file: File = event.files?.[0];
        if (!file || !this.typeSelectionne) return;

        const fd = new FormData();
        fd.append('file', file);
        fd.append('type', this.typeSelectionne);

        this.uploading = true;
        this.http.post<any>(`${environment.baseUrl}/api/imports/upload`, fd).subscribe({
            next: (res) => {
                this.jobId = res.jobId;
                this.colonnes = res.colonnes;
                this.apercu = res.apercu;
                this.mapping = { ...res.mappingSuggere };
                this.uploading = false;
                this.activeStep = 1;
                this.cdr.markForCheck();
            },
            error: (err) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Erreur upload',
                    detail: err?.error?.message ?? 'Fichier invalide'
                });
                this.uploading = false;
                this.cdr.markForCheck();
            }
        });
    }

    // ── Step 2 : Mapping ──────────────────────────────────────

    saveMapping(): void {
        if (!this.jobId) return;
        const cleanMapping: Record<string, string> = {};
        Object.entries(this.mapping).forEach(([col, champ]) => {
            if (champ) cleanMapping[col] = champ;
        });

        this.http.post(`${environment.baseUrl}/api/imports/${this.jobId}/mapping`, { mapping: cleanMapping }).subscribe({
            next: () => {
                this.activeStep = 2;
                this.cdr.markForCheck();
            },
            error: () => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Erreur',
                    detail: 'Sauvegarde mapping impossible'
                });
            }
        });
    }

    // ── Step 3 : Process ──────────────────────────────────────

    process(): void {
        if (!this.jobId) return;
        this.processing = true;
        this.http.post<any>(`${environment.baseUrl}/api/imports/${this.jobId}/process`, {}).subscribe({
            next: (res) => {
                this.resultat = res;
                this.processing = false;
                this.loadHistorique();
                this.cdr.markForCheck();
            },
            error: (err) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Erreur traitement',
                    detail: err?.error?.message ?? 'Traitement impossible'
                });
                this.processing = false;
                this.cdr.markForCheck();
            }
        });
    }

    // ── Reset ─────────────────────────────────────────────────

    reset(): void {
        this.activeStep = 0;
        this.jobId = null;
        this.colonnes = [];
        this.apercu = [];
        this.mapping = {};
        this.resultat = null;
        this.typeSelectionne = null;
        this.cdr.markForCheck();
    }

    // ── Historique ────────────────────────────────────────────

    loadHistorique(): void {
        this.loadingHistorique = true;
        this.http.get<any[]>(`${environment.baseUrl}/api/imports`).subscribe({
            next: (data) => {
                this.historique = data;
                this.loadingHistorique = false;
                this.cdr.markForCheck();
            },
            error: () => {
                this.loadingHistorique = false;
                this.cdr.markForCheck();
            }
        });
    }

    // ── Helpers ───────────────────────────────────────────────

    getStatutSeverity(statut: string): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
        const map: Record<string, any> = {
            DONE: 'success',
            PROCESSING: 'info',
            MAPPED: 'info',
            UPLOADED: 'secondary',
            ERROR: 'danger'
        };
        return map[statut] ?? 'secondary';
    }

    getTypeLabel(type: string): string {
        return this.typeOptions.find((t) => t.value === type)?.label ?? type;
    }

    getMappingLabel(champ: string): string {
        return this.champsSysteme.find((c) => c.value === champ)?.label ?? champ;
    }

    isMapped(colonne: string): boolean {
        return !!this.mapping[colonne];
    }

    getChampsNonMappes(): string[] {
        const mapped = Object.values(this.mapping).filter(Boolean);
        return this.champsSysteme.filter((c) => c.requis && !mapped.includes(c.value)).map((c) => c.label);
    }
}
