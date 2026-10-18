import { useQuery } from "@tanstack/react-query";
import { getShopContact } from "./contact.functions";
import { BUSINESS } from "@/data/catalog";

export function useShopContact() {
  const { data } = useQuery({
    queryKey: ["shop-contact"],
    queryFn: () => getShopContact(),
    staleTime: 30_000,
    retry: false,
  });
  const phone = data?.phone ?? BUSINESS.phoneE164;
  return {
    whatsapp: `https://wa.me/${phone}`,
    phoneE164: phone,
    phoneDisplay: phone === BUSINESS.phoneE164 ? BUSINESS.phoneDisplay : `+${phone}`,
  };
}
