import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface PageHeroProps {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  badge?: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "primary" | "warning";
}

const toneStyles: Record<NonNullable<PageHeroProps["tone"]>, string> = {
  default: "border-border bg-gradient-to-br from-card via-card/95 to-muted/70",
  primary: "border-primary/25 bg-gradient-to-br from-primary/25 via-primary/10 to-card",
  warning: "border-warning/35 bg-gradient-to-br from-warning/25 via-warning/10 to-card",
};
const toneAccentClass: Record<NonNullable<PageHeroProps["tone"]>, string> = {
  default: "bg-border",
  primary: "bg-primary",
  warning: "bg-warning",
};

const toneGlowClass: Record<NonNullable<PageHeroProps["tone"]>, string> = {
  default: "bg-muted/60",
  primary: "bg-primary/80",
  warning: "bg-warning/80",
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring", bounce: 0.3, duration: 0.8 },
  },
};

const accentVariants = {
  hidden: { scaleX: 0, opacity: 0 },
  visible: {
    scaleX: 1,
    opacity: 1,
    transition: { type: "spring", bounce: 0.2, duration: 0.6 },
  },
};

export function PageHero({
  title,
  subtitle,
  actions,
  badge,
  icon,
  tone = "default",
}: PageHeroProps) {
  return (
    <motion.section
      className="relative overflow-hidden rounded-xl border bg-card/70 p-5 backdrop-blur supports-[backdrop-filter]:bg-card/60 sm:p-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        className={cn("absolute inset-x-0 top-0 h-1 origin-left", toneAccentClass[tone])}
        variants={accentVariants}
        aria-hidden="true"
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          {(badge || icon) && (
            <motion.div className="mb-3 flex items-center gap-2 text-muted-foreground" variants={itemVariants}>
              {icon ? <span className="shrink-0">{icon}</span> : null}
              {badge}
            </motion.div>
          )}

          <motion.h1 className="text-3xl font-serif tracking-tight" variants={itemVariants}>
            {title}
          </motion.h1>
          {subtitle ? (
            <motion.p className="mt-1 text-sm text-muted-foreground sm:text-base" variants={itemVariants}>
              {subtitle}
            </motion.p>
          ) : null}
        </div>

        {actions ? (
          <motion.div className="flex flex-wrap items-center gap-2 lg:justify-end" variants={itemVariants}>
            {actions}
          </motion.div>
        ) : null}
      </div>
    </motion.section>
  );
}
