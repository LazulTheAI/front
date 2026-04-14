import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';

import { BonCommandeControllerService, BonCommandeRequest, FournisseurControllerService, FournisseurResponse, LigneCommandeFournisseurRequest, MateriauControllerService, MateriauResponse } from '@/app/modules/openapi';
import { APP_CURRENCY, APP_CURRENCY_LOCALE } from '@/app/core/currency.config';
import { TranslocoModule } from '@jsverse/transloco';

interface LigneForm {
    materiauId: number | null;
    materiauNom?: string;
    materiauUnite?: string;
    quantiteCommandee: number | null;
    prixUnitaireCents: number | null;
    unite: string;
}

@Component({
    selector: 'app-bon-commande-form',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, TranslocoModule, FormsModule, DialogModule, ButtonModule, InputTextModule, InputNumberModule, SelectModule, DatePickerModule, TextareaModule, DividerModule, TagModule, TooltipModule],
    providers: [],
    templateUrl: './bon-commande-form.component.html'
})
export class BonCommandeFormComponent implements OnChanges, OnInit {
    @Input() visible = false;
    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() saved = new EventEmitter<{ success: boolean; message: string }>();

    saving = false;
    protected readonly appCurrency = APP_CURRENCY;
    protected readonly appCurrencyLocale = APP_CURRENCY_LOCALE;

    fournisseurs: FournisseurResponse[] = [];
    materiaux: MateriauResponse[] = [];
    fournisseurOptions: { label: string; value: number }[] = [];
    materiauOptions: { label: string; value: number; unite: string }[] = [];

    form = {
        fournisseurId: null as number | null,
        numeroReference: '',
        dateCommande: new Date(),
        dateLivraisonPrevue: null as Date | null,
        notes: ''
    };

    lignes: LigneForm[] = [];

    constructor(
        private bonService: BonCommandeControllerService,
        private fournisseurService: FournisseurControllerService,
        private materiauService: MateriauControllerService,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.fournisseurService.listerFournisseur().subscribe({
            next: (data: FournisseurResponse[]) => {
                this.fournisseurs = data.filter((f) => !f.archive);
                this.fournisseurOptions = this.fournisseurs.map((f) => ({ label: f.nom!, value: f.id! }));
                this.cdr.detectChanges();
            }
        });
        this.materiauService.tousLesMateriaux().subscribe({
            next: (data: MateriauResponse[]) => {
                this.materiaux = data.filter((m) => !m.archive);
                this.materiauOptions = this.materiaux.map((m) => ({
                    label: `${m.nom} (${m.unite})`,
                    value: m.id!,
                    unite: m.unite!
                }));
                this.cdr.detectChanges();
            }
        });
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['visible'] && this.visible) {
            this.form = {
                fournisseurId: null,
                numeroReference: '',
                dateCommande: new Date(),
                dateLivraisonPrevue: null,
                notes: ''
            };
            this.lignes = [];
            this.cdr.detectChanges();
        }
    }

    onHide(): void {
        this.visibleChange.emit(false);
    }

    addLigne(): void {
        this.lignes = [...this.lignes, { materiauId: null, quantiteCommandee: null, prixUnitaireCents: null, unite: '' }];
        this.cdr.detectChanges();
    }

    removeLigne(index: number): void {
        this.lignes = this.lignes.filter((_, i) => i !== index);
        this.cdr.detectChanges();
    }

    onMateriauChange(index: number, materiauId: number): void {
        const found = this.materiaux.find((m) => m.id === materiauId);
        if (found) {
            this.lignes[index].unite = found.unite ?? '';
            this.lignes[index].materiauNom = found.nom ?? '';
            this.lignes[index].materiauUnite = found.unite ?? '';
            if (found.coutUnitaire) {
                this.lignes[index].prixUnitaireCents = Math.round(found.coutUnitaire * 100);
            }
        }
        this.cdr.detectChanges();
    }

    get totalEstime(): number {
        return this.lignes.reduce((sum, l) => {
            return sum + ((l.quantiteCommandee ?? 0) * (l.prixUnitaireCents ?? 0)) / 100;
        }, 0);
    }

    get lignesValides(): boolean {
        return this.lignes.length > 0 && this.lignes.every((l) => l.materiauId && l.quantiteCommandee && l.quantiteCommandee > 0 && l.unite);
    }

    submit(ngForm: NgForm): void {
        if (ngForm.invalid || !this.lignesValides) return;
        this.saving = true;

        const req: BonCommandeRequest = {
            fournisseurId: this.form.fournisseurId!,
            numeroReference: this.form.numeroReference || undefined,
            dateCommande: this.form.dateCommande.toISOString().split('T')[0],
            dateLivraisonPrevue: this.form.dateLivraisonPrevue?.toISOString().split('T')[0] ?? undefined,
            notes: this.form.notes || undefined,
            lignes: this.lignes.map(
                (l) =>
                    ({
                        materiauId: l.materiauId!,
                        quantiteCommandee: l.quantiteCommandee!,
                        prixUnitaireCents: l.prixUnitaireCents ?? undefined,
                        unite: l.unite
                    }) as LigneCommandeFournisseurRequest
            )
        };

        this.bonService.creerBonCommande(req).subscribe({
            next: () => {
                this.saving = false;
                this.saved.emit({ success: true, message: 'Bon de commande créé' });
                this.visibleChange.emit(false);
            },
            error: () => {
                this.saving = false;
                this.saved.emit({ success: false, message: 'Impossible de créer le bon de commande' });
            }
        });
    }
}
