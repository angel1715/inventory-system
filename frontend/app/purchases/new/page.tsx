import { Suspense } from "react";
import PurchaseContent from "./PurchaseContent";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PurchaseContent />
    </Suspense>
  );
}
