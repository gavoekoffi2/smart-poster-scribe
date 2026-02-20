/// <reference types="vite/client" />

interface FedaPayCheckoutOptions {
  public_key: string;
  transaction: {
    amount: number;
    description: string;
    custom_metadata?: Record<string, string>;
  };
  customer?: {
    email?: string;
    firstname?: string;
    lastname?: string;
  };
  environment?: "sandbox" | "live";
  onComplete?: (response: { reason: string; transaction: { id: number; reference: string; status: string; amount: number } }) => void;
  onClose?: () => void;
}

interface FedaPayStatic {
  init(options: FedaPayCheckoutOptions): { open: () => void };
}

interface Window {
  FedaPay?: FedaPayStatic;
}
