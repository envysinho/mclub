import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

function PageCard({ title, description, children, action }) {
  return (
    <Card>
      <CardHeader
        className={cn(
          "gap-4 space-y-0",
          action && "flex flex-col sm:flex-row sm:items-start sm:justify-between"
        )}
      >
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-xl font-semibold sm:text-2xl">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {action && <div className="w-full shrink-0 sm:w-auto">{action}</div>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default PageCard;
