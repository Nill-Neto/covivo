import * as React from "react"
import { motion } from "framer-motion"
import { ClipboardCopy } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"

export interface DetailItem {
  label: string;
  value: string;
  copyable?: boolean;
  className?: string;
  fullWidth?: boolean;
}

interface InfoCardProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  avatarSrc?: string;
  topRightContent?: React.ReactNode;
  details: DetailItem[];
  footerContent?: React.ReactNode;
  onAction?: () => void;
  actionLabel?: string;
}

const InfoItem = ({ label, value, copyable, fullWidth, className }: DetailItem) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
  };

  return (
    <div className={`flex flex-col ${fullWidth ? "col-span-2" : ""} ${className || ""}`}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-semibold text-sm text-card-foreground break-all">{value || "—"}</span>
        {copyable && value && value !== "—" && (
          <Button variant="ghost" size="icon" className="h-5 w-5 -my-1" onClick={handleCopy} title="Copiar">
            <ClipboardCopy className="h-3 w-3 text-muted-foreground" />
          </Button>
        )}
      </div>
    </div>
  );
};

export const InfoCard = ({
  title,
  subtitle,
  badge,
  avatarSrc,
  topRightContent,
  details,
  footerContent,
  onAction,
  actionLabel,
}: InfoCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="w-full rounded-2xl shadow-sm border-primary/10 overflow-hidden">
        <CardHeader className="p-6 bg-muted/30">
          <div className="flex justify-between items-start gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-4 border-background shadow-sm">
                <AvatarImage src={avatarSrc} alt={title} />
                <AvatarFallback className="text-xl font-bold text-muted-foreground">
                  {title.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-1.5">
                <div>
                  <h3 className="font-bold text-lg text-foreground leading-tight">{title}</h3>
                  {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
                </div>
                {badge}
              </div>
            </div>
            {topRightContent}
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-x-4 gap-y-6">
            {details.map((item, idx) => (
              <InfoItem key={idx} {...item} />
            ))}
          </div>
          {footerContent && (
            <div className="border-t border-border pt-4 mt-2">
               {footerContent}
            </div>
          )}
        </CardContent>
        
        {onAction && actionLabel && (
          <CardFooter className="p-6 bg-muted/30">
            <Button className="w-full" onClick={onAction}>
              {actionLabel}
            </Button>
          </CardFooter>
        )}
      </Card>
    </motion.div>
  );
};