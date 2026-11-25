export type ServiceCategory = {
  slug: string;
  title: string;
  description: string;
  icon: string;
};

export type Service = {
  slug: string;
  title: string;
  category: string;
  description: string;
  fulfilment: "request" | "quote" | "consultation";
};

export const categories: ServiceCategory[] = [
  { slug: "business-registration", title: "Business Registration & CAC", description: "Business names, company incorporation, NGO registration and ongoing compliance support.", icon: "briefcase-business" },
  { slug: "nin-identity", title: "NIN & Identity Services", description: "Guidance and assistance for eligible identity verification and modification requests.", icon: "fingerprint" },
  { slug: "documents-certificates", title: "Documentation & Certificates", description: "Support with selected civil, academic and personal documentation processes.", icon: "file-check" },
  { slug: "intellectual-property", title: "Intellectual Property", description: "Trademark search support and application assistance for your brand.", icon: "shield-check" },
  { slug: "digital-business", title: "Digital Business Services", description: "Digital presence, Google Business Profile support and learning resources.", icon: "globe" }
];

// Public prices and turnaround estimates remain unset until confirmed by the business.
export const services: Service[] = [
  { slug: "business-name-registration", title: "Business Name Registration", category: "business-registration", description: "Guidance and assistance with the business name registration process.", fulfilment: "request" },
  { slug: "company-registration", title: "Company Registration", category: "business-registration", description: "Support through the company incorporation process and its documentation requirements.", fulfilment: "quote" },
  { slug: "ngo-registration", title: "NGO Registration", category: "business-registration", description: "Guidance for eligible non-governmental and not-for-profit registration pathways.", fulfilment: "consultation" },
  { slug: "incorporated-trustee-registration", title: "Incorporated Trustee Registration", category: "business-registration", description: "Guidance on applicable requirements and official processes for incorporated trustee registration.", fulfilment: "consultation" },
  { slug: "annual-returns-filing", title: "Annual Returns Filing", category: "business-registration", description: "Assistance understanding and preparing applicable annual returns filings.", fulfilment: "request" },
  { slug: "post-incorporation-services", title: "Post-Incorporation Services", category: "business-registration", description: "Enquire about available post-incorporation services and requirements for your organization.", fulfilment: "consultation" },
  { slug: "nin-verification", title: "NIN Verification", category: "nin-identity", description: "Enquiry support for eligible NIN verification requests through appropriate channels.", fulfilment: "consultation" },
  { slug: "nin-retrieval", title: "NIN Retrieval", category: "nin-identity", description: "Guidance on the official NIN retrieval process.", fulfilment: "consultation" },
  { slug: "nin-validation", title: "NIN Validation", category: "nin-identity", description: "Guidance for eligible NIN validation requests through authorized channels.", fulfilment: "consultation" },
  { slug: "nin-modification", title: "NIN Modification", category: "nin-identity", description: "Guidance on official procedures for eligible NIN modifications.", fulfilment: "consultation" },
  { slug: "nin-slip-reprint", title: "NIN Slip Reprint", category: "nin-identity", description: "Assistance understanding NIN slip reprint options and the applicable official process.", fulfilment: "consultation" },
  { slug: "nin-plastic-id-support", title: "NIN Plastic ID Support", category: "nin-identity", description: "Enquiry support for available plastic identity card services, subject to official availability.", fulfilment: "consultation" },
  { slug: "bvn-verification", title: "BVN Verification", category: "nin-identity", description: "Enquiry support for eligible BVN verification needs through authorized channels.", fulfilment: "consultation" },
  { slug: "suspended-nin-resolution", title: "Suspended NIN Resolution", category: "nin-identity", description: "Guidance on official channels for suspended NIN issues; outcomes are not guaranteed.", fulfilment: "consultation" },
  { slug: "birth-certificate-assistance", title: "Birth Certificate Assistance", category: "documents-certificates", description: "Guidance on applicable birth certificate documentation processes.", fulfilment: "consultation" },
  { slug: "citizenship-certificate-assistance", title: "Citizenship Certificate Assistance", category: "documents-certificates", description: "Guidance on citizenship certificate documentation processes and official requirements.", fulfilment: "consultation" },
  { slug: "waec-certificate-retrieval", title: "WAEC Certificate Retrieval", category: "documents-certificates", description: "Guidance on official WAEC certificate retrieval options and requirements.", fulfilment: "consultation" },
  { slug: "neco-certificate-retrieval", title: "NECO Certificate Retrieval", category: "documents-certificates", description: "Guidance on official NECO certificate retrieval options and requirements.", fulfilment: "consultation" },
  { slug: "trademark-search", title: "Trademark Search", category: "intellectual-property", description: "Initial trademark search support and guidance on next steps for trademark protection.", fulfilment: "quote" },
  { slug: "trademark-registration-assistance", title: "Trademark Registration Assistance", category: "intellectual-property", description: "Support navigating trademark application requirements and the applicable registry process.", fulfilment: "quote" },
  { slug: "google-business-profile", title: "Google Business Profile Support", category: "digital-business", description: "Assistance with eligible Google Business Profile setup, verification guidance and optimization.", fulfilment: "request" }
];
