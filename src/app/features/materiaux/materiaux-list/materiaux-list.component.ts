import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, startWith, switchMap, takeUntil } from 'rxjs/operators';

// PrimeNG 21
import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Chip } from 'primeng/chip';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Toast } from 'primeng/toast';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { Toolbar } from 'primeng/toolbar';
import { Tooltip } from 'primeng/tooltip';

// Services & modèles OpenAPI
import { EntrepotControllerService, EntrepotResponse, MateriauControllerService, MateriauResponse, PageMateriauResponse, StockParEntrepot } from '@/app/modules/openapi';
import { APP_CURRENCY } from '@/app/core/currency.config';

// Dialogs
import { TranslocoModule } from '@jsverse/transloco';
import { EntreeStockDialogComponent } from '../entree-stock-dialog/entree-stock-dialog.component';
import { HistoriqueDialogComponent } from '../historique-dialog/historique-dialog.component';
import { MateriauFormComponent } from '../materiau-form/materiau-form.component';

/**
 * LigneStockMateriau — une ligne = un MateriauResponse × un entrepôt.
 * Champs financiers/infos copiés depuis MateriauResponse (partagés entre toutes
 * les lignes du même matériau).
 */
export interface LigneStockMateriau {
    // clé PrimeNG dataKey
    trackId: string;
    // identification
    materiauId: number;
    nom: string;
    unite: string;
    archive: boolean;
    // stock (par entrepôt explosé)
    entrepotId: number | null;
    entrepotNom: string;
    stocks: StockParEntrepot[];
    stockActuel: number; // toujours le stockTotal — ne change pas
    stockEntrepot: number | null; // stock de l'entrepôt filtré, null si vue globale
    seuilAlerte: number | null;
    enAlerte: boolean;
    statut: 'ok' | 'alert' | 'archive';
    // finance
    coutUnitaire: number | null;
    valeurStock: number;
    nbRecettes: number | null;
    // infos
    dlcProchaineExpiration: string | null;
    derniereEntreeAt: string | null;
    createdAt: string | null;
}

interface SelectOption {
    label: string;
    value: number | string | null;
}

@Component({
    selector: 'app-stock-materiaux',
    templateUrl: './materiaux-list.component.html',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        FormsModule,
        RouterModule,
        // PrimeNG 21
        Toast,
        Button,
        InputText,
        TranslocoModule,
        IconField,
        InputIcon,
        Select,
        ToggleSwitch,
        Chip,
        TableModule,
        Tag,
        Tooltip,
        Toolbar,
        ConfirmDialog,
        // Dialogs
        EntreeStockDialogComponent,
        HistoriqueDialogComponent,
        MateriauFormComponent
    ],
    providers: [MessageService, ConfirmationService]
})
export class StockMateriauxComponent implements OnInit, OnDestroy {
    private materiauxBruts: MateriauResponse[] = [];
    showTransfertDialog = false;
    sku: string | null;
    lignes: LigneStockMateriau[] = [];
    lignesFiltrees: LigneStockMateriau[] = [];
    entrepots: EntrepotResponse[] = [];
    protected readonly appCurrency = APP_CURRENCY;

    entrepotOptions: SelectOption[] = [];
    readonly statutOptions: SelectOption[] = [
        { label: 'En alerte', value: 'alert' },
        { label: 'Stock OK', value: 'ok' }
    ];

    filters: FormGroup;
    activeChips: { label: string; field: string }[] = [];

    loading = true;

    // Dialogs
    showFormDialog = false;
    showEntreeDialog = false;
    showAjustementDialog = false;
    showHistoriqueDialog = false;
    selectedMateriau: MateriauResponse | null = null;

    get nbAlertes(): number {
        return this.lignesFiltrees.filter((l) => l.statut === 'alert').length;
    }

    private destroy$ = new Subject<void>();

    constructor(
        private fb: FormBuilder,
        private materiauService: MateriauControllerService,
        private entrepotService: EntrepotControllerService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private cdr: ChangeDetectorRef,
        public router: Router
    ) {
        this.filters = this.fb.group({
            search: [''],
            entrepotId: [null],
            statut: [null],
            archive: [false]
        });
    }

    ngOnInit(): void {
        this.entrepotService
            .listerEntrepot()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (list) => {
                    this.entrepots = list;
                    this.entrepotOptions = [{ label: 'Tous les entrepôts', value: null }, ...list.map((e) => ({ label: e.nom!, value: e.id! }))];
                    this.cdr.markForCheck();
                },
                error: () => {}
            });

        // startWith(null) + debounceTime évite NG0100
        this.filters.valueChanges
            .pipe(
                startWith(null),
                debounceTime(300),
                switchMap((_) => {
                    this.loading = true;
                    this.cdr.markForCheck();
                    const v = this.filters.value;
                    // entrepotId N'est PAS envoyé au back — filtrage entrepôt 100% front
                    // pour éviter que stockTotal soit recalculé côté back
                    return this.materiauService.listerMateriau(v.archive || false, 0, 500, 'nom', 'asc', v.search || undefined);
                }),
                takeUntil(this.destroy$)
            )
            .subscribe({
                next: (page: PageMateriauResponse) => {
                    this.materiauxBruts = page.content ?? [];
                    this.lignes = this.buildLignes(this.materiauxBruts);
                    this.applyLocalFilters();
                    this.loading = false;
                    this.cdr.markForCheck();
                },
                error: () => {
                    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les matériaux.' });
                    this.loading = false;
                    this.cdr.markForCheck();
                }
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    openLots(l: LigneStockMateriau): void {
        this.router.navigate(['/materiaux', l.materiauId, 'lots'], {
            queryParams: { nom: l.nom }
        });
    }
    openTransfert(l: LigneStockMateriau): void {
        this.selectedMateriau = this.findMateriau(l.materiauId);
        this.showTransfertDialog = true;
    }

    // ─── 1 ligne par matériau (stockTotal si pas de filtre entrepôt) ───────────

    private buildLignes(materiaux: MateriauResponse[]): LigneStockMateriau[] {
        // Le filtrage entrepôt est 100% front — on ne l'envoie PAS au back
        // afin que stocks[] contienne TOUJOURS tous les entrepôts
        // et que stockTotal reste le vrai total toutes succursales confondues.
        const entrepotIdFiltre: number | null = this.filters.value.entrepotId ?? null;

        return materiaux.map((m) => {
            // stockEntrepot = stock de l'entrepôt sélectionné (null = vue globale)
            const stockEntrepot = entrepotIdFiltre != null ? (m.stocks?.find((s) => s.entrepotId === entrepotIdFiltre)?.stockActuel ?? 0) : null;

            // stockTotal et valeurStock viennent toujours de l'API, jamais recalculés
            const valeur = m.valeurStock ?? 0;
            const enAlerte = m.enAlerte === true;

            return {
                sku: m.sku ?? null,
                trackId: `${m.id}`,
                materiauId: m.id!,
                nom: m.nom!,
                unite: m.unite!,
                archive: m.archive ?? false,
                entrepotId: entrepotIdFiltre,
                entrepotNom: entrepotIdFiltre != null ? (m.stocks?.find((s) => s.entrepotId === entrepotIdFiltre)?.entrepotNom ?? '—') : '—',
                stocks: m.stocks ?? [],
                stockActuel: m.stockTotal ?? 0,
                stockEntrepot: stockEntrepot,
                seuilAlerte: m.seuilAlerte ?? null,
                enAlerte,
                statut: m.archive ? 'archive' : enAlerte ? 'alert' : 'ok',
                coutUnitaire: m.coutUnitaire ?? null,
                valeurStock: valeur,
                nbRecettes: m.nbRecettes ?? null,
                dlcProchaineExpiration: m.dlcProchaineExpiration ?? null,
                derniereEntreeAt: m.derniereEntreeAt ?? null,
                createdAt: m.createdAt ?? null
            };
        });
    }

    // ─── Filtre local statut ──────────────────────────────────────────────────

    applyLocalFilters(): void {
        const { statut, entrepotId } = this.filters.value;

        this.lignesFiltrees = this.lignes.filter((l) => {
            // Filtre entrepôt front : exclure les matériaux sans stock dans cet entrepôt
            if (entrepotId != null) {
                const stockDansEntrepot = l.stocks.find((s) => s.entrepotId === entrepotId);
                if (!stockDansEntrepot) return false;
            }
            if (statut === 'alert' && l.statut !== 'alert') return false;
            if (statut === 'ok' && l.statut !== 'ok') return false;
            return true;
        });

        this.buildChips();
    }

    // ─── Tri PrimeNG ──────────────────────────────────────────────────────────

    onSort(event: { field: string; order: number }): void {
        const col = event.field as keyof LigneStockMateriau;
        const dir = event.order as 1 | -1;
        this.lignesFiltrees = [...this.lignesFiltrees].sort((a, b) => {
            const va = a[col] ?? '';
            const vb = b[col] ?? '';
            if (typeof va === 'string') return dir * (va as string).localeCompare(vb as string);
            return dir * ((va as number) - (vb as number));
        });
    }

    // ─── DLC ──────────────────────────────────────────────────────────────────

    isDlcProche(dlc: string | null): boolean {
        if (!dlc) return false;
        const diff = new Date(dlc).getTime() - Date.now();
        return diff < 30 * 24 * 60 * 60 * 1000; // < 30 jours
    }

    // ─── Chips ────────────────────────────────────────────────────────────────

    private buildChips(): void {
        const { search, entrepotId, statut, archive } = this.filters.value;
        this.activeChips = [];
        if (search) this.activeChips.push({ label: `Nom : ${search}`, field: 'search' });
        if (entrepotId != null) this.activeChips.push({ label: `Entrepôt : ${this.entrepotLabel(entrepotId)}`, field: 'entrepotId' });
        if (statut) this.activeChips.push({ label: statut === 'alert' ? 'En alerte' : 'Stock OK', field: 'statut' });
        if (archive) this.activeChips.push({ label: 'Inclut archivés', field: 'archive' });
    }

    removeChip(field: string): void {
        const defaults: Record<string, unknown> = { search: '', entrepotId: null, statut: null, archive: false };
        this.filters.patchValue({ [field]: defaults[field] });
    }

    resetFilters(): void {
        this.filters.reset({ search: '', entrepotId: null, statut: null, archive: false });
    }

    // ─── Rechargement ─────────────────────────────────────────────────────────

    private reload(): void {
        this.filters.updateValueAndValidity({ emitEvent: true });
    }

    onDialogSaved(result: { success: boolean; message: string }): void {
        this.messageService.add({
            severity: result.success ? 'success' : 'error',
            summary: result.success ? 'Succès' : 'Erreur',
            detail: result.message
        });
        if (result.success) this.reload();
    }

    onFormSaved(): void {
        this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Matériau enregistré.' });
        this.reload();
    }

    // ─── Dialogs ──────────────────────────────────────────────────────────────

    openCreate(): void {
        this.selectedMateriau = null;
        this.showFormDialog = true;
    }

    openEdit(l: LigneStockMateriau): void {
        this.selectedMateriau = this.findMateriau(l.materiauId);
        this.showFormDialog = true;
    }

    openEntreeStock(l: LigneStockMateriau): void {
        this.selectedMateriau = this.findMateriau(l.materiauId);
        this.showEntreeDialog = true;
    }

    openAjustement(l: LigneStockMateriau): void {
        this.selectedMateriau = this.findMateriau(l.materiauId);
        this.showAjustementDialog = true;
    }

    openHistorique(l: LigneStockMateriau): void {
        this.selectedMateriau = this.findMateriau(l.materiauId);
        this.showHistoriqueDialog = true;
    }

    confirmArchive(l: LigneStockMateriau): void {
        this.confirmationService.confirm({
            message: `Archiver « ${l.nom} » ? Cette action est réversible.`,
            header: "Confirmer l'archivage",
            icon: 'pi pi-inbox',
            accept: () => this.archiver(l.materiauId)
        });
    }

    private archiver(id: number): void {
        this.materiauService.archiverMateriau(id).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Archivé', detail: 'Matériau archivé.' });
                this.reload();
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: "Impossible d'archiver." });
            }
        });
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private findMateriau(id: number): MateriauResponse | null {
        return this.materiauxBruts.find((m) => m.id === id) ?? null;
    }

    private entrepotLabel(id: number): string {
        return this.entrepots.find((e) => e.id === id)?.nom ?? String(id);
    }
}
