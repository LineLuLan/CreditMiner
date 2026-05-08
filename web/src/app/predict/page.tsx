import { Header } from "@/components/layout/Header";
import { PredictForm } from "@/components/features/PredictForm";

export default function PredictPage() {
  return (
    <div className="flex flex-col">
      <Header title="Churn Prediction" />
      <div className="flex-1 p-6">
        <PredictForm />
      </div>
    </div>
  );
}
