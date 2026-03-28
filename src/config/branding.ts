export const BRANDING = {
  appName: "Covivo",
  slogan: "Menos burocracia, mais convivência",
  institutional: {
    productDescription:
      "Sistema de gestão de despesas, rateios e pagamentos para moradias compartilhadas.",
    valueProp: "Organize as finanças e tenha mais tempo para viver o lado bom da casa.",
    legalFooter: "Todos os direitos reservados.",
  },
  invite: {
    heading: "Você foi convidado! 🏠",
    cta: "Aceitar Convite",
    expiryNotice:
      "Este convite expira em 7 dias. Se você não solicitou este convite, pode ignorar este email.",
  },
  rollout: [
    "interface",
    "comunicacoes",
    "dominio-principal",
  ] as const,
} as const;

export const ROUTE_ALIASES = [
  { from: "/entrar", to: "/login" },
  { from: "/convite", to: "/invite" },
  { from: "/inicio", to: "/dashboard" },
] as const;

export const APP_METADATA = {
  title: `${BRANDING.appName} — ${BRANDING.slogan}`,
  description: `${BRANDING.institutional.productDescription} ${BRANDING.institutional.valueProp}`,
  author: BRANDING.appName,
  ogType: "website",
  twitterCard: "summary_large_image",
} as const;
