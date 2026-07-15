import { useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";

export function useCheckout() {
  const trpc = useTRPC();
  const mutation = useMutation(
    trpc.billing.createCheckout.mutationOptions({})
  );

    const checkout = useCallback(() => {
    mutation.mutate(undefined, {
      onSuccess: (data) => {
        window.location.assign(data.checkoutUrl);
      },
      onError: (error) => {
        toast.error(error.message || "Unable to start checkout");
      },
    });
  }, [mutation]);

  return { checkout, isPending: mutation.isPending };
};
