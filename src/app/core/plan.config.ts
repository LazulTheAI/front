// ─────────────────────────────────────────────────────────────
//  plan.config.ts — Source de vérité des plans MakerStock
//  Modifie uniquement ici pour ajouter/modifier une feature.
// ─────────────────────────────────────────────────────────────
export type PlanLevel = 'trial' | 'starter' | 'pro' | 'business';

export const PLAN_HIERARCHY: Record<PlanLevel, number> = {
    trial: 0,
    starter: 1,
    pro: 2,
    business: 3
};

export const FEATURE_PLAN_REQUIREMENTS: Record<string, PlanLevel> = {
    'multi-users': 'pro',
    'cogs-complet': 'pro',
    'prix-recommande': 'pro',
    'commandes-fournisseurs': 'pro',
    'tracabilite-lots': 'pro',
    'export-comptable': 'pro',
    'allergenes-inci': 'pro',

    'planning-production': 'business',
    'rapport-pl': 'business',
    'multi-entrepots': 'business',
    'api-publique': 'business',
    'multi-devises': 'business',
    'support-prioritaire': 'business',
    'commandes-b2b': 'business'
};

export const PLAN_PRODUCT_LIMITS: Record<PlanLevel, number> = {
    trial: 25,
    starter: 75,
    pro: 300,
    business: 2000
};

export const PLAN_META: Record<PlanLevel, { label: string; color: string; bgColor: string }> = {
    trial: { label: 'Essai', color: '#5F5E5A', bgColor: '#F1EFE8' },
    starter: { label: 'Starter', color: '#185FA5', bgColor: '#E6F1FB' },
    pro: { label: 'Pro', color: '#0F6E56', bgColor: '#E1F5EE' },
    business: { label: 'Business', color: '#3C3489', bgColor: '#EEEDFE' }
};

export const BC_CHECKOUT_URLS: Record<Exclude<PlanLevel, 'trial'>, string> = {
    starter: '',
    pro: '',
    business: ''
};

export const PLAN_PRICING: Record<Exclude<PlanLevel, 'trial'>, { monthly: number; annual: number }> = {
    starter: { monthly: 29, annual: 25 },
    pro: { monthly: 59, annual: 49 },
    business: { monthly: 99, annual: 82 }
};

export const PLAN_DESCRIPTION: Record<Exclude<PlanLevel, 'trial'>, string> = {
    starter: 'Idéal pour démarrer et gérer votre production artisanale.',
    pro: 'Pour les ateliers en croissance avec des besoins avancés.',
    business: 'La solution complète pour les ateliers professionnels.'
};
export interface PlanFeatureItem {
    label: string;
    included: boolean;
}

export const PLAN_FEATURES: Record<Exclude<PlanLevel, 'trial'>, PlanFeatureItem[]> = {
    starter: [
        { label: '1 utilisateur', included: true },
        { label: 'Stock + BOM (recettes)', included: true },
        { label: 'Déduction FIFO automatique BC', included: true },
        { label: 'COGS matières premières', included: true },
        { label: 'Alertes de seuil', included: true },
        { label: 'App mobile (1 appareil)', included: true },
        { label: 'Export mouvements CSV', included: true },
        { label: 'Approvisionnements', included: false },
        { label: 'Traçabilité lots', included: false },
        { label: 'Multi-utilisateurs', included: false }
    ],
    pro: [
        { label: 'Tout Starter', included: true },
        { label: '3 utilisateurs inclus', included: true },
        { label: 'COGS complet (MO + charges)', included: true },
        { label: 'Prix de vente recommandé', included: true },
        { label: 'Approvisionnements', included: true },
        { label: 'Traçabilité lots fournisseur', included: true },
        { label: 'Export comptable XLSX', included: true },
        { label: 'Allergènes + fiche INCI', included: true },
        { label: 'App mobile illimitée', included: true },
        { label: 'Commandes B2B', included: false },
        { label: 'Multi-entrepôts', included: false }
    ],
    business: [
        { label: 'Tout Pro', included: true },
        { label: '10 utilisateurs inclus', included: true },
        { label: 'Commandes B2B', included: true },
        { label: 'Multi-entrepôts', included: true },
        { label: 'Planning de production', included: true },
        { label: 'Rapport P&L par produit', included: true },
        { label: 'API publique (Zapier / Make)', included: true },
        { label: 'Multi-devises', included: true },
        { label: 'Support prioritaire', included: true }
    ]
};
