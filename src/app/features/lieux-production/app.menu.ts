// À intégrer dans app.menu.component.ts (ou app.menuitem.component.ts selon votre version Sakai)
// Remplacez le contenu de la propriété model[] par ceci :

export const APP_MENU: any[] = [
    {
        label: 'Tableau de bord',
        items: [
            {
                label: "Vue d'ensemble",
                icon: 'pi pi-home',
                routerLink: ['/rapports']
            }
        ]
    },
    {
        label: 'Stock',
        items: [
            {
                label: 'Matériaux',
                icon: 'pi pi-box',
                routerLink: ['/materiaux'],
                badge: '!', // à remplacer dynamiquement si vous avez des alertes
                badgeClass: 'p-badge-danger'
            }
        ]
    },
    {
        label: 'Fabrication',
        items: [
            {
                label: 'Recettes',
                icon: 'pi pi-book',
                routerLink: ['/recettes']
            },
            {
                label: 'Production',
                icon: 'pi pi-cog',
                routerLink: ['/production']
            }
        ]
    },
    {
        label: 'Achats',
        items: [
            {
                label: 'Fournisseurs',
                icon: 'pi pi-truck',
                routerLink: ['/fournisseurs']
            },
            {
                label: 'Bons de commande',
                icon: 'pi pi-shopping-cart',
                routerLink: ['/bons-commande']
            }
        ]
    },
    {
        label: 'Administration',
        items: [
            {
                label: 'Lieux de production',
                icon: 'pi pi-warehouse',
                routerLink: ['/lieux-production']
            },
            {
                label: 'Mon équipe',
                icon: 'pi pi-users',
                routerLink: ['/utilisateurs']
            },
            {
                label: 'Abonnement',
                icon: 'pi pi-credit-card',
                routerLink: ['/abonnement']
            }
        ]
    }
];
