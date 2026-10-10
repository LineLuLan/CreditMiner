import { Header } from "@/components/layout/Header";
import { PredictForm } from "@/components/features/PredictForm";

export default function PredictPage() {
  return (
    <div className="flex flex-col">
      <Header title="Default Prediction" />
      <div className="min-w-0 flex-1 p-4 sm:p-6">
        <PredictForm />
      </div>
    </div>
  );
}
