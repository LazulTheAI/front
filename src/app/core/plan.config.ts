// ─────────────────────────────────────────────────────────────
//  plan.config.ts — Source de vérité des plans MakerStock
//  Modifie uniquement ici pour ajouter/modifier une feature.
// ─────────────────────────────────────────────────────────────

export type PlanLevel = 'trial' | 'starter' | 'maker' | 'atelier';

/** Hiérarchie numérique : plus c'est élevé, plus c'est permissif */
export const PLAN_HIERARCHY: Record<PlanLevel, number> = {
    trial: 0,
    starter: 1,
    maker: 2,
    atelier: 3
};

/**
 * Feature flags — associe chaque feature au plan minimum requis.
 * Si une feature n'est pas listée ici, elle est accessible à tous.
 */
export const FEATURE_PLAN_REQUIREMENTS: Record<string, PlanLevel> = {
    // ── Maker ──────────────────────────────────────────────────
    'multi-users': 'maker',
    'cogs-complet': 'maker',
    'prix-recommande': 'maker',
    'commandes-fournisseurs': 'maker',
    'tracabilite-lots': 'maker',
    'export-comptable': 'maker',
    'allergenes-inci': 'maker',

    // ── Atelier ────────────────────────────────────────────────
    'planning-production': 'atelier',
    'rapport-pl': 'atelier',
    'multi-entrepots': 'atelier',
    'api-publique': 'atelier',
    'multi-devises': 'atelier',
    'support-prioritaire': 'atelier'
};

/** Limites de produits BC synchronisés par plan */
export const PLAN_PRODUCT_LIMITS: Record<PlanLevel, number> = {
    trial: 25, // suffisant pour tester
    starter: 75, // Sophie solo : boutique artisanale classique
    maker: 300, // Patrick en croissance : catalogue raisonnable
    atelier: 2000 // "illimité" en pratique, garde-fou technique
};

/** Métadonnées d'affichage pour le badge et la page upgrade */
export const PLAN_META: Record<PlanLevel, { label: string; color: string; bgColor: string }> = {
    trial: { label: 'Essai', color: '#5F5E5A', bgColor: '#F1EFE8' },
    starter: { label: 'Starter', color: '#185FA5', bgColor: '#E6F1FB' },
    maker: { label: 'Maker', color: '#0F6E56', bgColor: '#E1F5EE' },
    atelier: { label: 'Atelier', color: '#3C3489', bgColor: '#EEEDFE' }
};

/** URL de checkout BC par plan — à remplacer par tes vrais plan_id BC */
export const BC_CHECKOUT_URLS: Record<Exclude<PlanLevel, 'trial'>, string> = {
    starter: 'https://www.bigcommerce.com/apps/makerstock/checkout?plan_id=STARTER_PLAN_ID',
    maker: 'https://www.bigcommerce.com/apps/makerstock/checkout?plan_id=MAKER_PLAN_ID',
    atelier: 'https://www.bigcommerce.com/apps/makerstock/checkout?plan_id=ATELIER_PLAN_ID'
};
