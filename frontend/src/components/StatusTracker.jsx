import { Check, Clock, PackageCheck, Truck, Home, XCircle } from "lucide-react";

const STEPS = [
  { key: "En attente", label: "En attente", icon: Clock },
  { key: "Confirmée", label: "Confirmée", icon: PackageCheck },
  { key: "Expédiée", label: "Expédiée", icon: Truck },
  { key: "Livrée", label: "Livrée", icon: Home },
];

export default function StatusTracker({ status }) {
  if (status === "Annulée") {
    return (
      <div className="flex items-center gap-2 text-red-500 text-sm font-semibold" data-testid="status-cancelled">
        <XCircle className="w-4 h-4" /> Commande annulée
      </div>
    );
  }
  const currentIndex = Math.max(0, STEPS.findIndex((s) => s.key === status));
  return (
    <div className="flex items-center" data-testid="status-tracker">
      {STEPS.map((step, i) => {
        const done = i <= currentIndex;
        const Icon = done && i < currentIndex ? Check : step.icon;
        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full grid place-items-center transition-colors ${done ? "bg-mint-600 text-white" : "bg-slate-100 text-slate-400"}`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className={`text-[10px] sm:text-xs font-medium ${done ? "text-mint-700" : "text-slate-400"}`}>{step.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 sm:mx-2 -mt-4 ${i < currentIndex ? "bg-mint-500" : "bg-slate-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
