
export type ICreateBranchWithHeadquarterCommand = {
  name: string;
  description: string;
  nif: string;
  logo?: string;
  planId: string;
  street: string;
  city: string;
  province: string;
  country: string;
  zipCode?: string;
}