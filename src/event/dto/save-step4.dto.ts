export class SaveStep4Dto {
  bank_account_name: string;
  bank_account_number: string;
  bank_name: string;
  bank_branch?: string;
  vat_business_type: 'INDIVIDUAL' | 'COMPANY';
  vat_full_name?: string;
  vat_address?: string;
  vat_tax_code?: string;
}
