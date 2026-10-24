import type { Bureau } from "./bureaus.js";

// Sample payprime responses (fictional person) used only when REPORTS_DEMO_MODE=true outside production.
const monthsBack = (count: number) => Array.from({ length: count }, (_, index) => {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() - index);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
});

const today = new Date().toISOString().slice(0, 10);
const compactToday = today.replaceAll("-", "");

const experian = {
  status: true,
  txn_id: "DEMO-EXP-0001",
  txn_status: "success",
  message: "Generate Experian Report",
  data: {
    status: "success",
    data: {
      name: "Demo User",
      mobile: "9999999999",
      pan: "ABCDE1234F",
      credit_score: 742,
      credit_report: {
        CreditProfileHeader: { ReportDate: Number(compactToday), Version: "V2.4" },
        Current_Application: {
          Current_Application_Details: {
            Current_Applicant_Details: { First_Name: "Demo", Last_Name: "User", Gender_Code: "1", IncomeTaxPan: "ABCDE1234F", Date_Of_Birth_Applicant: "19940512", MobilePhoneNumber: "9999999999", EMailId: "demo@example.com" },
            Current_Applicant_Address_Details: { FlatNoPlotNoHouseNo: "12, MG Road", City: "Bengaluru", PINCode: "560001" },
          },
        },
        CAIS_Account: {
          CAIS_Summary: { Credit_Account: { CreditAccountTotal: 4, CreditAccountActive: 3, CreditAccountClosed: 1 }, Total_Outstanding_Balance: { Outstanding_Balance_All: 412500 } },
          CAIS_Account_DETAILS: [
            { Subscriber_Name: "HDFC Bank", Account_Type: "10", Account_Number: "4567123498761234", Open_Date: "20190315", Credit_Limit_Amount: 150000, Highest_Credit_or_Original_Loan_Amount: 150000, Current_Balance: 32500, Amount_Past_Due: 0, Account_Status: "11", Date_of_Last_Payment: compactToday,
              CAIS_Account_History: monthsBack(12).map(({ year, month }) => ({ Year: year, Month: month, Days_Past_Due: 0 })) },
            { Subscriber_Name: "ICICI Bank", Account_Type: "05", Account_Number: "LN00998877", Open_Date: "20220110", Highest_Credit_or_Original_Loan_Amount: 500000, Current_Balance: 280000, Amount_Past_Due: 4500, Account_Status: "71", Date_of_Last_Payment: compactToday,
              CAIS_Account_History: monthsBack(12).map(({ year, month }, index) => ({ Year: year, Month: month, Days_Past_Due: index === 1 ? 30 : 0 })) },
            { Subscriber_Name: "Bajaj Finance", Account_Type: "06", Account_Number: "CD55443322", Open_Date: "20230705", Highest_Credit_or_Original_Loan_Amount: 120000, Current_Balance: 100000, Amount_Past_Due: 0, Account_Status: "11",
              CAIS_Account_History: monthsBack(12).map(({ year, month }) => ({ Year: year, Month: month, Days_Past_Due: 0 })) },
            { Subscriber_Name: "Axis Bank", Account_Type: "01", Account_Number: "AL11223344", Open_Date: "20160801", Date_Closed: "20210801", Highest_Credit_or_Original_Loan_Amount: 400000, Current_Balance: 0, Amount_Past_Due: 0, Account_Status: "13", CAIS_Account_History: [] },
          ],
        },
        CAPS: {
          CAPS_Application_Details: [
            { Subscriber_Name: "Kotak Mahindra Bank", Date_of_Request: compactToday, Enquiry_Reason: "1", Finance_Purpose: "05", Amount_Financed: 300000 },
            { Subscriber_Name: "SBI Card", Date_of_Request: "20250102", Enquiry_Reason: "1", Finance_Purpose: "10", Amount_Financed: 0 },
          ],
        },
        TotalCAPS_Summary: { TotalCAPSLast180Days: 1 },
      },
    },
  },
};

const equifax = {
  status: true,
  txn_id: "DEMO-EQF-0001",
  txn_status: "success",
  message: "Generate Equifax CCR Report",
  data: {
    bureauConsentId: "demo-consent",
    consent: true,
    data: {
      name: "Demo User",
      id_number: "ABCDE1234F",
      mobile: "9999999999",
      credit_score: "728",
      credit_report: {
        InquiryResponseHeader: { Date: today },
        CCRResponse: {
          CIRReportDataLst: [{
            CIRReportData: {
              IDAndContactInfo: {
                PersonalInfo: { Name: { FullName: "DEMO USER" }, DateOfBirth: "1994-05-12", Gender: "Male" },
                IdentityInfo: { PANId: [{ IdNumber: "ABCDE1234F" }] },
                PhoneInfo: [{ Number: "9999999999" }],
                EmailAddressInfo: [{ EmailAddress: "demo@example.com" }],
                AddressInfo: [{ Address: "12, MG ROAD", State: "KA", Postal: "560001" }],
              },
              RetailAccountsSummary: { NoOfAccounts: "3", NoOfActiveAccounts: "2", NoOfPastDueAccounts: "1", TotalBalanceAmount: "312500", TotalPastDue: "4500", TotalSanctionAmount: "650000" },
              RetailAccountDetails: [
                { Institution: "HDFC Bank", AccountType: "Credit Card", AccountNumber: "XXXXXXXX1234", Open: "Yes", DateOpened: "2019-03-15", CreditLimit: "150000", Balance: "32500", PastDueAmount: "0", AccountStatus: "Current Account", LastPaymentDate: today,
                  History48Months: monthsBack(12).map(({ year, month }) => ({ key: `${String(month).padStart(2, "0")}-${String(year).slice(-2)}`, PaymentStatus: "000" })) },
                { Institution: "ICICI Bank", AccountType: "Personal Loan", AccountNumber: "XXXXXX8877", Open: "Yes", DateOpened: "2022-01-10", SanctionAmount: "500000", Balance: "280000", PastDueAmount: "4500", AccountStatus: "Current Account",
                  History48Months: monthsBack(12).map(({ year, month }, index) => ({ key: `${String(month).padStart(2, "0")}-${String(year).slice(-2)}`, PaymentStatus: index === 1 ? "30" : "000" })) },
                { Institution: "Axis Bank", AccountType: "Auto Loan", AccountNumber: "XXXXXX3344", Open: "No", DateOpened: "2016-08-01", DateClosed: "2021-08-01", SanctionAmount: "400000", Balance: "0", PastDueAmount: "0", AccountStatus: "Closed Account", History48Months: [] },
              ],
              Enquiries: [{ Institution: "Kotak Mahindra Bank", Date: today, RequestPurpose: "Personal Loan", Amount: "300000" }],
              EnquirySummary: { Past6Months: "1" },
            },
          }],
        },
      },
    },
  },
};

const cibil = {
  status: true,
  txn_id: "DEMO-CIB-0001",
  txn_status: "success",
  message: "Generate Cibil Report",
  data: {
    data: {
      htmlUrl: null,
      cibilData: {
        GetCustomerAssetsResponse: {
          ResponseStatus: "Success",
          GetCustomerAssetsSuccess: {
            Asset: {
              TrueLinkCreditReport: {
                Borrower: {
                  BorrowerName: { Name: { Forename: "Demo", Surname: "User" } },
                  Birth: { date: "1994-05-12" },
                  Gender: "Male",
                  CreditScore: { riskScore: "756" },
                  IdentifierPartition: { Identifier: [{ ID: { Id: "ABCDE1234F" } }] },
                  BorrowerTelephone: [{ PhoneNumber: { Number: "9999999999" } }],
                  BorrowerAddress: [{ CreditAddress: { StreetAddress: "12, MG Road", City: "Bengaluru", PostalCode: "560001" } }],
                },
                TradeLinePartition: [
                  { Tradeline: { creditorName: "HDFC Bank", accountTypeSymbol: "10", accountNumber: "4567123498761234", dateOpened: "2019-03-15", highBalance: "150000", currentBalance: "32500", OpenClosed: { symbol: "O" },
                    GrantedTrade: { CreditLimit: "150000", amountPastDue: "0", dateLastPayment: today, PayStatusHistory: { MonthlyPayStatus: monthsBack(12).map(({ year, month }) => ({ date: `${year}-${String(month).padStart(2, "0")}-01`, status: "0" })) } } } },
                  { Tradeline: { creditorName: "ICICI Bank", accountTypeSymbol: "05", accountNumber: "LN00998877", dateOpened: "2022-01-10", highBalance: "500000", currentBalance: "280000", OpenClosed: { symbol: "O" },
                    GrantedTrade: { amountPastDue: "4500", PayStatusHistory: { MonthlyPayStatus: monthsBack(12).map(({ year, month }, index) => ({ date: `${year}-${String(month).padStart(2, "0")}-01`, status: index === 1 ? "30" : "0" })) } } } },
                  { Tradeline: { creditorName: "Axis Bank", accountTypeSymbol: "01", accountNumber: "AL11223344", dateOpened: "2016-08-01", dateClosed: "2021-08-01", highBalance: "400000", currentBalance: "0", OpenClosed: { symbol: "C" }, GrantedTrade: { amountPastDue: "0" } } },
                ],
                InquiryPartition: [{ Inquiry: { subscriberName: "Kotak Mahindra Bank", inquiryDate: today, amount: "300000", inquiryType: "Personal Loan" } }],
              },
            },
          },
        },
      },
    },
  },
};

export const demoReportResponses: Record<Bureau, unknown> = { cibil, equifax, experian };

export const isReportsDemoMode = () => process.env.REPORTS_DEMO_MODE === "true" && process.env.NODE_ENV !== "production";
