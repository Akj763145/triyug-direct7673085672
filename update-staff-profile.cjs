const fs = require('fs');

let content = fs.readFileSync('src/pages/StaffProfile.tsx', 'utf-8');

// Update staffForm state
content = content.replace(
  /const \[staffForm, setStaffForm\] \= useState\(\{[\s\S]*?designationIds: \[\] as string\[\]\n\s*\}\);/,
  `const [staffForm, setStaffForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    status: "Active",
    designationIds: [] as string[],
    dateOfBirth: "",
    permanentAddress: "",
    currentAddress: "",
    governmentId: "",
    educationQualifications: "",
    employmentHistory: "",
    referenceContacts: "",
    backgroundScreening: "",
    bankAccountDetails: "",
    taxDeclarations: "",
    pensionAccounts: "",
    emergencyContact: "",
    signedContract: false,
    equipmentRequirements: ""
  });`
);

// Update Initialization from supabse inside loadData
content = content.replace(
  /setStaffForm\(\{\n\s*firstName: sData.first_name \|\| "",\n\s*lastName: sData.last_name \|\| "",\n\s*email: sData.email \|\| "",\n\s*phone: sData.phone \|\| "",\n\s*status: sData.status \|\| "Active",\n\s*designationIds: dIds\n\s*\}\);/,
  `setStaffForm({
          firstName: sData.first_name || "",
          lastName: sData.last_name || "",
          email: sData.email || "",
          phone: sData.phone || "",
          status: sData.status || "Active",
          designationIds: dIds,
          dateOfBirth: sData.date_of_birth || "",
          permanentAddress: sData.permanent_address || "",
          currentAddress: sData.current_address || "",
          governmentId: sData.government_id || "",
          educationQualifications: sData.education_qualifications || "",
          employmentHistory: sData.employment_history || "",
          referenceContacts: sData.reference_contacts || "",
          backgroundScreening: sData.background_screening || "",
          bankAccountDetails: sData.bank_account_details || "",
          taxDeclarations: sData.tax_declarations || "",
          pensionAccounts: sData.pension_accounts || "",
          emergencyContact: sData.emergency_contact || "",
          signedContract: sData.signed_contract || false,
          equipmentRequirements: sData.equipment_requirements || ""
       });`
);

// Update Save function body
content = content.replace(
  /const \{ error: staffUpdateErr \} = await supabase\.from\('staffs'\)\.update\(\{\n\s*first_name: staffForm.firstName,\n\s*last_name: staffForm.lastName,\n\s*email: staffForm.email,\n\s*phone: staffForm.phone,\n\s*status: staffForm.status\n\s*\}\)\.eq\('id', id\);/,
  `const { error: staffUpdateErr } = await supabase.from('staffs').update({
       first_name: staffForm.firstName,
       last_name: staffForm.lastName,
       email: staffForm.email,
       phone: staffForm.phone,
       status: staffForm.status,
       date_of_birth: staffForm.dateOfBirth || null,
       permanent_address: staffForm.permanentAddress,
       current_address: staffForm.currentAddress,
       government_id: staffForm.governmentId,
       education_qualifications: staffForm.educationQualifications,
       employment_history: staffForm.employmentHistory,
       reference_contacts: staffForm.referenceContacts,
       background_screening: staffForm.backgroundScreening,
       bank_account_details: staffForm.bankAccountDetails,
       tax_declarations: staffForm.taxDeclarations,
       pension_accounts: staffForm.pensionAccounts,
       emergency_contact: staffForm.emergencyContact,
       signed_contract: staffForm.signedContract,
       equipment_requirements: staffForm.equipmentRequirements
    }).eq('id', id);`
);

fs.writeFileSync('src/pages/StaffProfile.tsx', content);
