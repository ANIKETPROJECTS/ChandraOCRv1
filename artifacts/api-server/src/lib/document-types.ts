export type FieldType = "string" | "number" | "boolean" | "string[]";

export interface FieldDef {
  key: string;
  label: string;
  description: string;
  type: FieldType;
  section: string;
}

export interface TableDef {
  key: string;
  label: string;
  section: string;
  description: string;
  columns: { key: string; label: string; description: string; type: FieldType }[];
}

export interface DocumentTypeDef {
  id: string;
  label: string;
  description: string;
  sections: string[];
  fields: FieldDef[];
  tables: TableDef[];
}

const FORM7: DocumentTypeDef = {
  id: "form7",
  label: "Form 7 (Maharashtra 7/12 — Ownership Register)",
  description:
    "Maharashtra Satbara Form 7 — अधिकार अभिलेख / Rights Register containing landowner details, area, assessment, encumbrances, and mutation history.",
  sections: [
    "Header Details",
    "Ownership Details",
    "Area & Assessment",
    "Other Rights & Encumbrances",
    "Mutation",
  ],
  fields: [
    {
      key: "village",
      label: "Village (गाव)",
      description: "Name of the village where the land is situated.",
      type: "string",
      section: "Header Details",
    },
    {
      key: "taluka",
      label: "Taluka (तालुका)",
      description: "Sub-district / block the village falls under.",
      type: "string",
      section: "Header Details",
    },
    {
      key: "district",
      label: "District (जिल्हा)",
      description: "District where the land is located.",
      type: "string",
      section: "Header Details",
    },
    {
      key: "survey_number",
      label: "Survey Number / Sub-Division (भूमापन क्रमांक व उपविभाग)",
      description: "Unique survey number with sub-division of the plot.",
      type: "string",
      section: "Header Details",
    },
    {
      key: "pu_id",
      label: "PU-ID (Permanent Unique ID)",
      description: "Permanent unique identifier of the 7/12 record on the e-MahaBhumi portal.",
      type: "string",
      section: "Header Details",
    },
    {
      key: "occupant_class",
      label: "Occupant Class (भोगवटदार वर्ग)",
      description:
        "Class of occupant — typically 'Class 1' (full ownership) or 'Class 2' (conditional). Return exactly what is printed.",
      type: "string",
      section: "Ownership Details",
    },
    {
      key: "owner_names",
      label: "Owner Name(s) (शेताचे स्वामिनाव)",
      description: "Full name(s) of the registered landowner(s). Return as a list of names.",
      type: "string[]",
      section: "Ownership Details",
    },
    {
      key: "khate_number",
      label: "Khate (Account) Number (खाते क्र.)",
      description: "Land revenue account number for the owner.",
      type: "string",
      section: "Ownership Details",
    },
    {
      key: "owner_share",
      label: "Owner Share / Hissa (भोगवटादाराचे भाग)",
      description: "Fractional share of the land in joint ownership e.g. 1/2, 1/3.",
      type: "string",
      section: "Ownership Details",
    },
    {
      key: "mode_of_acquisition",
      label: "Mode of Acquisition",
      description:
        "How the land was acquired — Purchase (खरेद), Inheritance (वारसान), or Gift Deed (बक्षीस). Return the printed value.",
      type: "string",
      section: "Ownership Details",
    },
    {
      key: "total_area",
      label: "Total Area (क्षेत्र)",
      description:
        "Total land area of the survey number, including units (hectares and ares). Return exactly as printed.",
      type: "string",
      section: "Area & Assessment",
    },
    {
      key: "land_revenue_assessment",
      label: "Land Revenue Assessment (आकार)",
      description: "Annual government tax payable on the land, with currency symbol if shown.",
      type: "string",
      section: "Area & Assessment",
    },
    {
      key: "collection_charges",
      label: "Collection Charges (पो.ख.)",
      description: "Administrative collection fee on top of land revenue.",
      type: "string",
      section: "Area & Assessment",
    },
    {
      key: "non_agricultural_area",
      label: "Non-Agricultural Area (अकृषिक क्षेत्र)",
      description: "Portion of the land converted to non-agricultural use, if mentioned.",
      type: "string",
      section: "Area & Assessment",
    },
    {
      key: "non_cultivated_area",
      label: "Non-Cultivated Area (बिन शेती)",
      description: "Land that is not currently cultivated.",
      type: "string",
      section: "Area & Assessment",
    },
    {
      key: "tenant_name",
      label: "Tenant Name (कुळाचे नाव)",
      description: "Name of the tenant (kul) cultivating the land, if any.",
      type: "string",
      section: "Other Rights & Encumbrances",
    },
    {
      key: "tenant_rent",
      label: "Tenant Rent (खंड)",
      description: "Rent payable by the tenant.",
      type: "string",
      section: "Other Rights & Encumbrances",
    },
    {
      key: "other_rights",
      label: "Other Rights (इतर अधिकार)",
      description:
        "Third-party rights — right of way, water rights, easements, etc. Summarize as printed.",
      type: "string",
      section: "Other Rights & Encumbrances",
    },
    {
      key: "encumbrances",
      label: "Encumbrance / Mortgage (बोजा / तारण)",
      description:
        "Loans or mortgages against the land. Include bank name and amount if printed.",
      type: "string",
      section: "Other Rights & Encumbrances",
    },
    {
      key: "last_mutation_number",
      label: "Last Mutation Number (शेवटचा फेरफार क्रमांक)",
      description: "Reference number of the most recent mutation (ownership change).",
      type: "string",
      section: "Mutation",
    },
    {
      key: "last_mutation_date",
      label: "Last Mutation Date",
      description: "Date of the most recent mutation entry.",
      type: "string",
      section: "Mutation",
    },
    {
      key: "pending_mutation",
      label: "Pending Mutation (प्रलंबित फेरफार)",
      description:
        "Whether there is a pending mutation. Return 'Yes' or 'No' (or 'None' / 'नाही' as printed).",
      type: "string",
      section: "Mutation",
    },
    {
      key: "old_mutation_numbers",
      label: "Previous Mutation Numbers (जुने फेरफार क्र)",
      description:
        "List of historical mutation numbers (जुने फेरफार क्र) printed at the bottom of the form, e.g. (1) (118) (715) (742). Return as a list of numeric strings.",
      type: "string[]",
      section: "Mutation",
    },
    {
      key: "boundary_and_survey_marks",
      label: "Boundary & Survey Marks (सीमा आणि भुमापन चिन्ह)",
      description:
        "Notes about the boundary and survey marks of the plot, if printed.",
      type: "string",
      section: "Other Rights & Encumbrances",
    },
  ],
  tables: [
    {
      key: "ownership_entries",
      label: "Ownership / Khata Entries",
      section: "Ownership Details",
      description:
        "All rows of the main Form 7 ownership table (खाते क्र., भोगवटादाराचे नाव, क्षेत्र, आकार, पो.ख., फेरफार क्र, कुळ खंड व इतर अधिकार). Return one entry per ownership row, ignoring header / unit-label rows.",
      columns: [
        {
          key: "khate_number",
          label: "Khate No. (खाते क्र.)",
          description: "Khata / account number for this ownership row.",
          type: "string",
        },
        {
          key: "owner_name",
          label: "Owner Name (भोगवटादाराचे नाव)",
          description:
            "Full name of the owner / occupant for this khata row, exactly as printed.",
          type: "string",
        },
        {
          key: "area",
          label: "Area (क्षेत्र)",
          description: "Area held under this khata, with units (Hectare-Are or H.R.Sq.M.).",
          type: "string",
        },
        {
          key: "assessment",
          label: "Assessment (आकार)",
          description: "Land revenue assessment for this khata row.",
          type: "string",
        },
        {
          key: "collection_charges",
          label: "Collection Charges (पो.ख.)",
          description: "Po.Kh. / collection charges shown for this row.",
          type: "string",
        },
        {
          key: "mutation_number",
          label: "Mutation No. (फेरफार क्र)",
          description: "Mutation number(s) referenced for this ownership row.",
          type: "string",
        },
        {
          key: "tenant_rent_other_rights",
          label: "Tenant / Rent / Other Rights (कुळ, खंड व इतर अधिकार)",
          description:
            "Combined tenant name, rent, and other-rights notes printed in the rightmost column.",
          type: "string",
        },
      ],
    },
  ],
};

const FORM12: DocumentTypeDef = {
  id: "form12",
  label: "Form 12 (Maharashtra 7/12 — Crop Inspection Register)",
  description:
    "Maharashtra Satbara Form 12 — पीक पाहणी / Pik Pahani containing crop, irrigation, and land-use entries recorded annually by the Talathi.",
  sections: ["Header Details", "Crop Entries"],
  fields: [
    {
      key: "village",
      label: "Village (गाव)",
      description: "Name of the village.",
      type: "string",
      section: "Header Details",
    },
    {
      key: "taluka",
      label: "Taluka (तालुका)",
      description: "Sub-district / block.",
      type: "string",
      section: "Header Details",
    },
    {
      key: "district",
      label: "District (जिल्हा)",
      description: "District.",
      type: "string",
      section: "Header Details",
    },
    {
      key: "survey_number",
      label: "Survey Number (भूमापन क्रमांक)",
      description: "Survey number of the plot.",
      type: "string",
      section: "Header Details",
    },
    {
      key: "khate_number",
      label: "Khate (Account) Number (खाते क्रमांक)",
      description: "Landowner's revenue account number.",
      type: "string",
      section: "Header Details",
    },
  ],
  tables: [
    {
      key: "crop_entries",
      label: "Crop Inspection Entries",
      section: "Crop Entries",
      description:
        "All rows of the Form 12 crop inspection register. Return one entry per row across all years and seasons.",
      columns: [
        {
          key: "year",
          label: "Year (वर्ष)",
          description: "Agricultural year e.g. 2016-17.",
          type: "string",
        },
        {
          key: "season",
          label: "Season (हंगाम)",
          description: "Kharif (खरीप), Rabi (रब्बी), Unikala (उन्हाळी), or Sampurna Varsha (संपूर्ण वर्ष).",
          type: "string",
        },
        {
          key: "khate_number",
          label: "Account Number (खाते क्रमांक)",
          description: "Owner's account number for this row, if printed.",
          type: "string",
        },
        {
          key: "crop_type",
          label: "Crop Type (पिकाचा प्रकार)",
          description: "Jirayat (rain-fed) or Bagayat (irrigated).",
          type: "string",
        },
        {
          key: "crop_name",
          label: "Crop Name (पिकांचे नाव)",
          description: "Specific crop e.g. Soybean, Wheat, Rice, Cotton, Sugarcane.",
          type: "string",
        },
        {
          key: "irrigated_area",
          label: "Irrigated Area (जल सिंचित)",
          description: "Area irrigated by a water source.",
          type: "string",
        },
        {
          key: "unirrigated_area",
          label: "Un-irrigated Area (अजल सिंचित)",
          description: "Area dependent only on rainfall.",
          type: "string",
        },
        {
          key: "irrigation_source",
          label: "Irrigation Source (जल सिंचनाचे साधन)",
          description: "Well, canal, borewell, dam, river, or lift irrigation.",
          type: "string",
        },
        {
          key: "land_use_nature",
          label: "Nature of Land Use (स्वरूप)",
          description: "e.g. Sown (पेरता), Fallow (खाली), Non-Agricultural (अकृषिक वापर).",
          type: "string",
        },
        {
          key: "area",
          label: "Area (क्षेत्र)",
          description: "Area in this status (Hectare-Are or R.Chi.Mi).",
          type: "string",
        },
        {
          key: "remarks",
          label: "Remarks (शेरा)",
          description: "Talathi's notes — disputes, errors, pending mutations.",
          type: "string",
        },
      ],
    },
  ],
};

const AADHAR: DocumentTypeDef = {
  id: "aadhar",
  label: "Aadhaar Card (UIDAI)",
  description:
    "Indian Aadhaar identity card issued by UIDAI. Extract the printed identity details exactly as shown.",
  sections: ["Identity", "Address", "Document"],
  fields: [
    {
      key: "full_name",
      label: "Full Name",
      description: "Full name of the cardholder as printed.",
      type: "string",
      section: "Identity",
    },
    {
      key: "gender",
      label: "Gender",
      description: "Gender (Male / Female / Transgender) as printed.",
      type: "string",
      section: "Identity",
    },
    {
      key: "date_of_birth",
      label: "Date of Birth",
      description: "Date of birth (DD/MM/YYYY). If only year is printed return that.",
      type: "string",
      section: "Identity",
    },
    {
      key: "aadhaar_number",
      label: "Aadhaar Number",
      description: "12-digit Aadhaar number, formatted as printed (with spaces if any).",
      type: "string",
      section: "Identity",
    },
    {
      key: "vid",
      label: "Virtual ID (VID)",
      description: "16-digit Virtual ID, if printed.",
      type: "string",
      section: "Identity",
    },
    {
      key: "fathers_or_husbands_name",
      label: "Father's / Husband's / Guardian's Name",
      description: "Care-of (S/O, D/O, W/O, C/O) name if printed.",
      type: "string",
      section: "Identity",
    },
    {
      key: "address",
      label: "Address",
      description: "Full residential address as printed on the back of the card.",
      type: "string",
      section: "Address",
    },
    {
      key: "pincode",
      label: "PIN Code",
      description: "6-digit postal PIN code from the address.",
      type: "string",
      section: "Address",
    },
    {
      key: "state",
      label: "State",
      description: "State name from the address.",
      type: "string",
      section: "Address",
    },
    {
      key: "issue_date",
      label: "Issue Date",
      description: "Date the Aadhaar was issued / printed, if visible.",
      type: "string",
      section: "Document",
    },
    {
      key: "mobile_number",
      label: "Mobile Number",
      description: "Mobile number printed on the card, if any.",
      type: "string",
      section: "Document",
    },
    {
      key: "enrolment_number",
      label: "Enrolment No.",
      description:
        "Enrolment Number / नामांकन क्रम printed on the Aadhaar letter (typically formatted like 0855/04021/00568).",
      type: "string",
      section: "Document",
    },
  ],
  tables: [],
};

const BANK_PASSBOOK: DocumentTypeDef = {
  id: "bank_passbook",
  label: "Bank Passbook",
  description:
    "Indian bank account passbook front page (and transaction pages if present). Extract account holder, branch, and account details.",
  sections: ["Bank & Branch", "Account Holder", "Account Details", "Transactions"],
  fields: [
    {
      key: "bank_name",
      label: "Bank Name",
      description: "Name of the bank issuing the passbook.",
      type: "string",
      section: "Bank & Branch",
    },
    {
      key: "branch_name",
      label: "Branch Name",
      description: "Branch where the account is held.",
      type: "string",
      section: "Bank & Branch",
    },
    {
      key: "branch_address",
      label: "Branch Address",
      description: "Postal address of the branch.",
      type: "string",
      section: "Bank & Branch",
    },
    {
      key: "ifsc_code",
      label: "IFSC Code",
      description: "11-character IFSC code of the branch.",
      type: "string",
      section: "Bank & Branch",
    },
    {
      key: "micr_code",
      label: "MICR Code",
      description: "9-digit MICR code, if printed.",
      type: "string",
      section: "Bank & Branch",
    },
    {
      key: "account_holder_name",
      label: "Account Holder Name",
      description: "Primary account holder's full name.",
      type: "string",
      section: "Account Holder",
    },
    {
      key: "joint_holders",
      label: "Joint Holders",
      description: "Names of joint holders on the account, if any.",
      type: "string[]",
      section: "Account Holder",
    },
    {
      key: "nominee_name",
      label: "Nominee Name",
      description: "Nominee's name, if printed.",
      type: "string",
      section: "Account Holder",
    },
    {
      key: "nominee_relationship",
      label: "Nominee Relationship",
      description: "Relationship of the nominee to the account holder.",
      type: "string",
      section: "Account Holder",
    },
    {
      key: "address",
      label: "Customer Address",
      description: "Mailing address of the customer.",
      type: "string",
      section: "Account Holder",
    },
    {
      key: "mobile_number",
      label: "Mobile Number",
      description: "Customer's registered mobile number.",
      type: "string",
      section: "Account Holder",
    },
    {
      key: "email",
      label: "Email",
      description: "Customer's registered email, if any.",
      type: "string",
      section: "Account Holder",
    },
    {
      key: "account_number",
      label: "Account Number",
      description: "Bank account number as printed.",
      type: "string",
      section: "Account Details",
    },
    {
      key: "account_type",
      label: "Account Type",
      description: "Savings / Current / Salary / NRE / NRO / Recurring etc.",
      type: "string",
      section: "Account Details",
    },
    {
      key: "customer_id",
      label: "Customer ID (CIF)",
      description: "Customer Information File number, if printed.",
      type: "string",
      section: "Account Details",
    },
    {
      key: "opening_date",
      label: "Account Opening Date",
      description: "Date the account was opened.",
      type: "string",
      section: "Account Details",
    },
    {
      key: "current_balance",
      label: "Current Balance",
      description: "Latest available balance shown on the passbook, if visible.",
      type: "string",
      section: "Account Details",
    },
  ],
  tables: [
    {
      key: "transactions",
      label: "Transactions",
      section: "Transactions",
      description:
        "Transaction rows from the passbook. Skip if the page does not contain a transaction ledger.",
      columns: [
        {
          key: "date",
          label: "Date",
          description: "Transaction date.",
          type: "string",
        },
        {
          key: "particulars",
          label: "Particulars",
          description: "Narration / description of the transaction.",
          type: "string",
        },
        {
          key: "cheque_ref",
          label: "Cheque / Reference",
          description: "Cheque number or reference number, if any.",
          type: "string",
        },
        {
          key: "withdrawal",
          label: "Withdrawal (Dr)",
          description: "Amount debited from the account.",
          type: "string",
        },
        {
          key: "deposit",
          label: "Deposit (Cr)",
          description: "Amount credited to the account.",
          type: "string",
        },
        {
          key: "balance",
          label: "Balance",
          description: "Running balance after the transaction.",
          type: "string",
        },
      ],
    },
  ],
};

const FORM8A: DocumentTypeDef = {
  id: "form8a",
  label: "Form 8A (Maharashtra Holding Register — गाव नमुना आठ-अ / धारण जमिनींची नोंदवही)",
  description:
    "Maharashtra Village Form 8A — धारण जमिनींची नोंदवही (आसामीवार खतावणी - जमाबंदी पत्रक). One row per survey-number holding under a khate, with assessment, damage on inherited land, local cesses (Zilla Parishad and Gram Panchayat) and totals.",
  sections: [
    "Header Details",
    "Khatedar (Account Holder)",
    "Holdings Table",
    "Totals",
  ],
  fields: [
    {
      key: "year",
      label: "Year (वर्ष)",
      description:
        "Reporting / revenue year printed in the top-left of the form (e.g. 2016-15, 2023-24).",
      type: "string",
      section: "Header Details",
    },
    {
      key: "report_date",
      label: "Report Date",
      description:
        "Print/issue date shown in the top-right of the header (typically a Gregorian date like 12/20/2016).",
      type: "string",
      section: "Header Details",
    },
    {
      key: "village",
      label: "Village (गाव)",
      description: "Name of the village where the khata is registered.",
      type: "string",
      section: "Header Details",
    },
    {
      key: "taluka",
      label: "Taluka (तालुका)",
      description: "Sub-district / block.",
      type: "string",
      section: "Header Details",
    },
    {
      key: "district",
      label: "District (जिल्हा)",
      description: "District.",
      type: "string",
      section: "Header Details",
    },
    {
      key: "khate_number",
      label: "Khate Number (खाते क्रमांक)",
      description:
        "Khata / land-revenue account number printed in the first column (e.g. 'खाते क्र.159' → '159'). Return only the digits / number string, without the 'खाते क्र.' prefix.",
      type: "string",
      section: "Khatedar (Account Holder)",
    },
    {
      key: "account_type",
      label: "Account Type (खात्याचा प्रकार)",
      description:
        "Type of khata as printed in column 1 — for example 'अविभक्त कुटूंब खाते' (joint family account), 'वैयक्तिक खाते' (individual account). Return exactly what is printed.",
      type: "string",
      section: "Khatedar (Account Holder)",
    },
    {
      key: "khatedar_names",
      label: "Khatedar Name(s) (खातेदाराचे नाव)",
      description:
        "Full name(s) of the khatedar / account holder(s), if printed. Return as a list of names exactly as printed. Many 8A pages do not list names — leave empty if absent.",
      type: "string[]",
      section: "Khatedar (Account Holder)",
    },
    {
      key: "khatedar_address",
      label: "Khatedar Address (खातेदाराचा पत्ता)",
      description: "Postal address of the khatedar, if printed.",
      type: "string",
      section: "Khatedar (Account Holder)",
    },
    {
      key: "total_area",
      label: "Total Area (एकूण क्षेत्र)",
      description:
        "Total area held under this khata, summed across all survey numbers, as printed in the bold 'एकूण' totals row of column 'क्षेत्र' (with units, typically H.R.Sq.M like '2.06.00').",
      type: "string",
      section: "Totals",
    },
    {
      key: "total_assessment_or_judi",
      label: "Total Assessment / Judi (एकूण आकारणी किंवा जुडी)",
      description:
        "Sum of column 'आकारणी किंवा जुडी' (Assessment or Judi rent) shown in the bold totals row.",
      type: "string",
      section: "Totals",
    },
    {
      key: "total_damage_on_inherited_land",
      label: "Total Damage on Inherited Land (एकूण दुमाला जमिनीवरील नुकसान)",
      description:
        "Sum of column 'दुमाला जमिनीवरील नुकसान' (damage / loss on inherited / दुमाला land) shown in the totals row.",
      type: "string",
      section: "Totals",
    },
    {
      key: "total_zp_local_cess",
      label: "Total Zilla Parishad Local Cess (एकूण जि.प. स्थानिक उपकर)",
      description:
        "Sum of the Zilla Parishad (जि.प.) sub-column under स्थानिक उपकर, in the totals row.",
      type: "string",
      section: "Totals",
    },
    {
      key: "total_gp_local_cess",
      label: "Total Gram Panchayat Local Cess (एकूण ग्रा.प. स्थानिक उपकर)",
      description:
        "Sum of the Gram Panchayat (ग्रा.प.) sub-column under स्थानिक उपकर, in the totals row.",
      type: "string",
      section: "Totals",
    },
    {
      key: "total_recovery_amount",
      label: "Total Recovery Amount (एकूण वसुलीसाठी)",
      description:
        "Total of the 'वसुलीसाठी' (for recovery) group — i.e. column (७) in the totals row, if printed separately from grand total.",
      type: "string",
      section: "Totals",
    },
    {
      key: "grand_total",
      label: "Grand Total (एकूण)",
      description:
        "Final 'एकूण' grand total amount printed in the right-most totals cell.",
      type: "string",
      section: "Totals",
    },
  ],
  tables: [
    {
      key: "holdings",
      label: "Holdings (धारण जमिनींची नोंदवही)",
      section: "Holdings Table",
      description:
        "Each non-total row of the धारण जमिनींची नोंदवही table — one row per survey-number holding held under this khate. SKIP the bold 'एकूण' totals row entirely (it is captured in the top-level totals fields instead). Preserve every printed cell verbatim, including units and any embedded notes (e.g. 'भूमिअभिलेख निर्णयात्').",
      columns: [
        {
          key: "village_form_6_entry",
          label: "Village Form 6 Entry — Khate Ref (गाव नमुना सहा मधील नोंद)",
          description:
            "Column (१) — the entry from Village Form 6 for this row. Typically contains the खाते क्रमांक and account type, e.g. 'खाते क्र.159 अविभक्त कुटूंब खाते'. Capture the full printed text.",
          type: "string",
        },
        {
          key: "survey_number_with_subdivision",
          label: "Survey No. / Sub-Division (भूमापन क्रमांक व उपविभाग क्रमांक)",
          description:
            "Column (२) — survey number with sub-division, plus any inline note printed in the same cell (e.g. '77/3 भूमिअभिलेख निर्णयात्').",
          type: "string",
        },
        {
          key: "area_or_extent",
          label: "Area / Extent (क्षेत्र)",
          description:
            "Column (३) — the area / extent value as printed in the क्षेत्र column for this row (may be a small marker like '३.', a count, or a numeric area).",
          type: "string",
        },
        {
          key: "assessment_or_judi",
          label: "Assessment / Judi (आकारणी किंवा जुडी)",
          description:
            "Column (४) — assessment or judi (rent) for this survey-number row, as printed (typically H.R.Sq.M format like '2.06.00').",
          type: "string",
        },
        {
          key: "damage_on_inherited_land",
          label: "Damage on Inherited Land (दुमाला जमिनीवरील नुकसान)",
          description:
            "Column (५) — damage / loss recorded against दुमाला (inherited) land for this row.",
          type: "string",
        },
        {
          key: "zp_local_cess",
          label: "ZP Local Cess (जि.प. स्थानिक उपकर)",
          description:
            "Column (६अ) — Zilla Parishad share of the local cess for this row.",
          type: "string",
        },
        {
          key: "gp_local_cess",
          label: "GP Local Cess (ग्रा.प. स्थानिक उपकर)",
          description:
            "Column (६ब) — Gram Panchayat share of the local cess for this row.",
          type: "string",
        },
        {
          key: "recovery_total",
          label: "Recovery Total (वसुलीसाठी एकूण)",
          description:
            "Column (७) — sub-total of the 'वसुलीसाठी' (for recovery) group for this row, if printed.",
          type: "string",
        },
        {
          key: "row_total",
          label: "Row Total (एकूण)",
          description:
            "Right-most 'एकूण' grand-total cell for this row.",
          type: "string",
        },
      ],
    },
  ],
};

export const DOCUMENT_TYPES: Record<string, DocumentTypeDef> = {
  form7: FORM7,
  form12: FORM12,
  form8a: FORM8A,
  aadhar: AADHAR,
  bank_passbook: BANK_PASSBOOK,
};

export function getDocumentType(id: string): DocumentTypeDef | null {
  return DOCUMENT_TYPES[id] ?? null;
}

function jsonSchemaTypeFor(t: FieldType): Record<string, unknown> {
  if (t === "number") return { type: "number" };
  if (t === "boolean") return { type: "boolean" };
  if (t === "string[]")
    return { type: "array", items: { type: "string" } };
  return { type: "string" };
}

/**
 * Build the page_schema JSON that Datalab's /extract endpoint expects for a
 * given document type. We always wrap the fields in an object schema with
 * descriptions so the model knows exactly what to pull.
 */
export function buildPageSchema(def: DocumentTypeDef): Record<string, unknown> {
  const properties: Record<string, unknown> = {};

  for (const f of def.fields) {
    properties[f.key] = {
      ...jsonSchemaTypeFor(f.type),
      description: f.description,
    };
  }

  for (const t of def.tables) {
    const itemProps: Record<string, unknown> = {};
    for (const c of t.columns) {
      itemProps[c.key] = {
        ...jsonSchemaTypeFor(c.type),
        description: c.description,
      };
    }
    properties[t.key] = {
      type: "array",
      description: t.description,
      items: { type: "object", properties: itemProps },
    };
  }

  return { type: "object", properties };
}

export interface PresentedField {
  key: string;
  label: string;
  value: string;
}

export interface PresentedTableRow {
  values: Record<string, string>;
}

export interface PresentedTable {
  key: string;
  label: string;
  columns: { key: string; label: string }[];
  rows: PresentedTableRow[];
}

export interface PresentedSection {
  title: string;
  fields: PresentedField[];
  tables: PresentedTable[];
}

export interface PresentedDocument {
  documentType: string;
  documentLabel: string;
  sections: PresentedSection[];
  empty: boolean;
}

function valueToString(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) {
    return v
      .map((item) => (typeof item === "string" ? item : JSON.stringify(item)))
      .filter((s) => s && s !== "null")
      .join(", ");
  }
  if (typeof v === "object") {
    try {
      return JSON.stringify(v);
    } catch {
      return "";
    }
  }
  return String(v);
}

/**
 * Convert Datalab's raw extraction_schema_json (which may be a string or an
 * object) into a UI-friendly section/field/table structure.
 */
export function presentExtraction(
  def: DocumentTypeDef,
  extractionSchemaJson: unknown,
): PresentedDocument {
  let parsed: Record<string, unknown> = {};
  if (extractionSchemaJson && typeof extractionSchemaJson === "object" && !Array.isArray(extractionSchemaJson)) {
    parsed = extractionSchemaJson as Record<string, unknown>;
  } else if (typeof extractionSchemaJson === "string") {
    try {
      const v = JSON.parse(extractionSchemaJson);
      if (v && typeof v === "object" && !Array.isArray(v)) {
        parsed = v as Record<string, unknown>;
      }
    } catch {
      parsed = {};
    }
  }

  const sectionMap = new Map<string, PresentedSection>();
  for (const s of def.sections) {
    sectionMap.set(s, { title: s, fields: [], tables: [] });
  }
  const ensureSection = (title: string): PresentedSection => {
    const existing = sectionMap.get(title);
    if (existing) return existing;
    const created: PresentedSection = { title, fields: [], tables: [] };
    sectionMap.set(title, created);
    return created;
  };

  let anyValue = false;

  for (const f of def.fields) {
    const raw = parsed[f.key];
    const value = valueToString(raw);
    if (value) anyValue = true;
    ensureSection(f.section).fields.push({
      key: f.key,
      label: f.label,
      value: value || "—",
    });
  }

  for (const t of def.tables) {
    const raw = parsed[t.key];
    const rows: PresentedTableRow[] = [];
    if (Array.isArray(raw)) {
      for (const item of raw) {
        if (!item || typeof item !== "object") continue;
        const rec = item as Record<string, unknown>;
        const values: Record<string, string> = {};
        let rowHasValue = false;
        for (const c of t.columns) {
          const v = valueToString(rec[c.key]);
          values[c.key] = v || "—";
          if (v) rowHasValue = true;
        }
        if (rowHasValue) {
          rows.push({ values });
          anyValue = true;
        }
      }
    }
    ensureSection(t.section).tables.push({
      key: t.key,
      label: t.label,
      columns: t.columns.map((c) => ({ key: c.key, label: c.label })),
      rows,
    });
  }

  const sections = Array.from(sectionMap.values()).filter(
    (s) => s.fields.length > 0 || s.tables.length > 0,
  );

  return {
    documentType: def.id,
    documentLabel: def.label,
    sections,
    empty: !anyValue,
  };
}
