import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

function PageCard({ title, description, children, action }) {
  const hasHeaderText = Boolean(title || description);
  const hasHeader = hasHeaderText || action;

  return (
    <Card className="[--card-spacing:--spacing(3)] sm:[--card-spacing:--spacing(4)]">
      {hasHeader && (
        <CardHeader
          className={cn(
            "gap-4 space-y-0",
            action && "flex flex-col sm:flex-row sm:items-start sm:justify-between",
            action && !hasHeaderText && "items-end"
          )}
        >
          {hasHeaderText && (
            <div className="min-w-0 space-y-1">
              {title && <CardTitle className="text-lg font-semibold sm:text-2xl">{title}</CardTitle>}
              {description && <CardDescription>{description}</CardDescription>}
            </div>
          )}
          {action && <div className="w-full shrink-0 sm:w-auto">{action}</div>}
        </CardHeader>
      )}
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default PageCard;
