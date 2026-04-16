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
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';

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

interface ImportResultat {
    statut: string;
    ok: number;
    nbCrees: number;
    nbMisAJour: number;
    erreurs: number;
    details: ErreurImport[];
}

interface ColonneInfo {
    key: string;   // clé i18n sous import_data.cols.*
    required: boolean;
}

interface TypeConfig {
    label: string;
    icon: string;
    description: string;
    formats: string;
    templateLabel: string;
    colonnesInfo: ColonneInfo[];
    templateExemples: string[][];  // lignes d'exemple sans les en-têtes
}

const CHAMPS_PAR_TYPE: Record<string, ChampSysteme[]> = {
    MATIERES: [
        { label: 'Nom *', value: 'nom', requis: true },
        { label: 'Unité *', value: 'unite', requis: true },
        { label: 'SKU', value: 'sku', requis: false },
        { label: 'Quantité', value: 'quantite', requis: false },
        { label: 'Coût unitaire', value: 'coutUnitaire', requis: false },
        { label: 'Numéro de lot', value: 'numeroLot', requis: false },
        { label: 'DLC (DD/MM/YYYY)', value: 'dlc', requis: false },
        { label: 'Fournisseur', value: 'fournisseur', requis: false },
        { label: 'Entrepôt', value: 'entrepot', requis: false }
    ],
    FOURNISSEURS: [
        { label: 'Nom *', value: 'nom', requis: true },
        { label: 'Email', value: 'email', requis: false },
        { label: 'Téléphone', value: 'telephone', requis: false }
    ],
    RECETTE: [
        { label: 'recipe_name *', value: 'recipe_name', requis: true },
        { label: 'batch_size *', value: 'batch_size', requis: true },
        { label: 'batch_unit *', value: 'batch_unit', requis: true },
        { label: 'ingredient_name *', value: 'ingredient_name', requis: true },
        { label: 'ingredient_amount *', value: 'ingredient_amount', requis: true },
        { label: 'ingredient_unit', value: 'ingredient_unit', requis: false },
        { label: 'ingredient_type', value: 'ingredient_type', requis: false }
    ]
};

const TYPE_CONFIG: Record<string, TypeConfig> = {
    MATIERES: {
        label: 'Matières premières',
        icon: 'pi-box',
        description: 'Importer des matières premières depuis un fichier Excel ou CSV. Les matières existantes (même nom) seront mises à jour.',
        formats: '.csv, .xlsx',
        templateLabel: 'Template CSV',
        colonnesInfo: [
            { key: 'nom', required: true },
            { key: 'unite', required: true },
            { key: 'sku', required: false },
            { key: 'quantite', required: false },
            { key: 'cout_unitaire', required: false },
            { key: 'numero_lot', required: false },
            { key: 'dlc', required: false },
            { key: 'fournisseur', required: false },
            { key: 'entrepot', required: false }
        ],
        templateExemples: [
            ['Farine de blé T55', 'kg', 'FAR-001', '50', '1.20', 'LOT-2024-001', '31/12/2025', 'Moulin du Sud', 'Entrepôt principal'],
            ['Sucre blanc', 'kg', 'SUC-001', '25', '0.90', '', '', '', ''],
            ['Beurre doux', 'kg', 'BEU-001', '10', '8.50', 'LOT-2024-002', '15/06/2025', 'Laiterie Nord', 'Chambre froide']
        ]
    },
    FOURNISSEURS: {
        label: 'Fournisseurs',
        icon: 'pi-truck',
        description: 'Importer ou mettre à jour des fournisseurs.',
        formats: '.csv, .xlsx',
        templateLabel: 'Template CSV',
        colonnesInfo: [
            { key: 'nom', required: true },
            { key: 'email', required: false },
            { key: 'telephone', required: false }
        ],
        templateExemples: [
            ['Moulin du Sud', 'contact@moulin-du-sud.fr', '04 91 00 11 22'],
            ['Laiterie Nord', 'commandes@laiterie-nord.fr', '03 20 00 33 44'],
            ['Ferme Dupont', 'ferme.dupont@email.com', '']
        ]
    },
    RECETTE: {
        label: 'Recettes',
        icon: 'pi-file-import',
        description: "Importer des recettes depuis un export CSV RECETTE. Les matières sont auto-créées si elles n'existent pas.",
        formats: '.csv',
        templateLabel: 'Exemple CSV',
        colonnesInfo: [
            { key: 'recipe_name', required: true },
            { key: 'batch_size', required: true },
            { key: 'batch_unit', required: true },
            { key: 'ingredient_name', required: true },
            { key: 'ingredient_amount', required: true },
            { key: 'ingredient_unit', required: false },
            { key: 'ingredient_type', required: false }
        ],
        templateExemples: [
            ['Tarte aux pommes', '1', 'unité', 'Farine de blé T55', '250', 'g', 'MATIERE_PREMIERE'],
            ['Tarte aux pommes', '1', 'unité', 'Beurre doux', '125', 'g', 'MATIERE_PREMIERE'],
            ['Tarte aux pommes', '1', 'unité', 'Sucre blanc', '80', 'g', 'MATIERE_PREMIERE']
        ]
    }
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
        { label: 'Recettes', value: 'RECETTE' }
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
    resultat: ImportResultat | null = null;

    // ── Historique ────────────────────────────────────────────
    historique: any[] = [];
    loadingHistorique = false;

    ordreImport = [
        { ordre: 1, label: 'Fournisseurs', icon: 'pi-truck', note: 'optionnel' },
        { ordre: 2, label: 'Matières', icon: 'pi-box', note: 'avec lot et DLC' },
        { ordre: 3, label: 'Recettes', icon: 'pi-book', note: 'matières auto-créées' }
    ];

    constructor(
        private http: HttpClient,
        private messageService: MessageService,
        private cdr: ChangeDetectorRef,
        private transloco: TranslocoService
    ) {
        this.loadHistorique();
    }

    // ── Getters ───────────────────────────────────────────────

    get config(): TypeConfig | null {
        return this.typeSelectionne ? TYPE_CONFIG[this.typeSelectionne] : null;
    }

    get champsSysteme(): ChampSysteme[] {
        return this.typeSelectionne ? (CHAMPS_PAR_TYPE[this.typeSelectionne] ?? []) : [];
    }

    get champOptions(): { label: string; value: string | null }[] {
        const opts = this.champsSysteme.map((c) => ({ label: c.label, value: c.value }));
        return [{ label: '— Ignorer —', value: null }, ...opts];
    }

    get mappingComplet(): boolean {
        const requis = this.champsSysteme.filter((c) => c.requis).map((c) => c.value);
        const mapped = Object.values(this.mapping).filter((v) => v != null);
        return requis.every((r) => mapped.includes(r));
    }

    get champsMappesRequisManquants(): string[] {
        const requis = this.champsSysteme.filter((c) => c.requis).map((c) => c.value);
        const mapped = Object.values(this.mapping).filter((v) => v != null);
        return requis.filter((r) => !mapped.includes(r)).map((r) => this.champsSysteme.find((c) => c.value === r)?.label ?? r);
    }

    get hasErreurs(): boolean {
        return (this.resultat?.erreurs ?? 0) > 0;
    }

    // ── Step 1 : Upload ───────────────────────────────────────

    onTypeChange(): void {
        this.jobId = null;
        this.colonnes = [];
        this.apercu = [];
        this.mapping = {};
        this.resultat = null;
        this.activeStep = 0;
        this.cdr.markForCheck();
    }

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

    telechargerTemplate(): void {
        if (!this.config) return;
        const headers = this.config.colonnesInfo.map((c) => this.transloco.translate(`import_data.cols.${c.key}`));
        const rows = [headers, ...this.config.templateExemples];
        const csv = rows.map((r) => r.map((cell) => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `template-${this.typeSelectionne!.toLowerCase()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
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
}
