import { environment } from '@/environments/environment';
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';

interface PlanFeature {
    label: string;
    included: boolean;
}

interface Plan {
    id: string;
    nom: string;
    prix: number;
    prixAnnuel: number;
    description: string;
    badge: string | null;
    badgeSeverity: 'success' | 'info' | 'warn';
    couleur: string;
    features: PlanFeature[];
}

@Component({
    selector: 'app-onboarding-plan',
    standalone: true,
    imports: [CommonModule, ButtonModule, TagModule, ToastModule],
    providers: [MessageService],
    templateUrl: './onboarding-plan.component.html'
})
export class OnboardingPlanComponent implements OnInit {
    accountUuid = '';
    storeHash = '';
    marchandId = '';
    loading = false;
    planChoisi: string | null = null;
    trialJours = 14;

    constructor(
        private route: ActivatedRoute,
        private messageService: MessageService
    ) {}

    plans: Plan[] = [
        {
            id: 'Starter',
            nom: 'Starter',
            prix: 29,
            prixAnnuel: 25,
            description: 'Idéal pour démarrer et gérer votre production artisanale.',
            badge: null,
            badgeSeverity: 'info',
            couleur: '#6366f1',
            features: [
                { label: '1 entrepôt', included: true },
                { label: 'Gestion matières premières', included: true },
                { label: 'Recettes illimitées', included: true },
                { label: 'Sync BigCommerce', included: true },
                { label: 'Runs de production', included: true },
                { label: 'Import CSV/Excel', included: true },
                { label: 'Alertes stock', included: false },
                { label: 'Gestion multi-entrepôts', included: false },
                { label: 'Commandes B2B', included: false },
                { label: 'Exports & rapports avancés', included: false }
            ]
        },
        {
            id: 'Pro',
            nom: 'Pro',
            prix: 59,
            prixAnnuel: 49,
            description: 'Pour les ateliers en croissance avec des besoins avancés.',
            badge: 'Recommandé',
            badgeSeverity: 'success',
            couleur: '#1D9E75',
            features: [
                { label: '3 entrepôts', included: true },
                { label: 'Gestion matières premières', included: true },
                { label: 'Recettes illimitées', included: true },
                { label: 'Sync BigCommerce', included: true },
                { label: 'Runs de production', included: true },
                { label: 'Import CSV/Excel', included: true },
                { label: 'Alertes stock', included: true },
                { label: 'Gestion multi-entrepôts', included: true },
                { label: 'Commandes B2B', included: false },
                { label: 'Exports & rapports avancés', included: false }
            ]
        },
        {
            id: 'Business',
            nom: 'Business',
            prix: 99,
            prixAnnuel: 82,
            description: 'La solution complète pour les ateliers professionnels.',
            badge: null,
            badgeSeverity: 'info',
            couleur: '#7c3aed',
            features: [
                { label: 'Entrepôts illimités', included: true },
                { label: 'Gestion matières premières', included: true },
                { label: 'Recettes illimitées', included: true },
                { label: 'Sync BigCommerce', included: true },
                { label: 'Runs de production', included: true },
                { label: 'Import CSV/Excel', included: true },
                { label: 'Alertes stock', included: true },
                { label: 'Gestion multi-entrepôts', included: true },
                { label: 'Commandes B2B', included: true },
                { label: 'Exports & rapports avancés', included: true }
            ]
        }
    ];

    ngOnInit(): void {
        this.route.queryParams.subscribe((params) => {
            this.accountUuid = params['accountUuid'] ?? '';
            this.storeHash = params['storeHash'] ?? '';
            const token = params['token'];
            if (token) {
                localStorage.setItem('jwt', token);
            }
        });
    }

    choisirPlan(plan: Plan): void {
        if (this.loading) return;
        this.planChoisi = plan.id;
        this.loading = true;

        const token = localStorage.getItem('jwt') ?? '';
        const url = `${environment.baseUrl}/api/bc/subscription/checkout` + `?planLevel=${plan.id}` + `&accountUuid=${encodeURIComponent(this.accountUuid)}` + `&storeHash=${encodeURIComponent(this.storeHash)}` + `&token=${encodeURIComponent(token)}`;

        window.location.href = url;
    }
}
