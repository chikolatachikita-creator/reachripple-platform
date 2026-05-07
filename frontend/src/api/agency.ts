import api from "./client";

export interface AgencyDetails {
  companyName?: string;
  companyNumber?: string;
  vatNumber?: string;
  directorName?: string;
  registeredAddress?: string;
  tradingAddress?: string;
  website?: string;
  companyRegistrationDoc?: string;
  proofOfAddress?: string;
  directorIdDoc?: string;
  verifiedAt?: string;
  rejectionReason?: string;
}

export interface AgencyMe {
  accountType: "independent" | "agency";
  verificationStatus: "unverified" | "pending" | "verified" | "rejected";
  agencyDetails: AgencyDetails | null;
  postingPlan: string;
  accountTier: string;
}

export const getAgencyMe = async (): Promise<AgencyMe> => {
  const res = await api.get<AgencyMe>("/agency/me");
  return res.data;
};

export const upgradeToAgency = async (payload: {
  companyName: string;
  companyNumber?: string;
  website?: string;
  directorName?: string;
  phone?: string;
}) => {
  const res = await api.post("/agency/upgrade", payload);
  return res.data;
};

export const updateAgencyDetails = async (payload: Partial<AgencyDetails>) => {
  const res = await api.put("/agency/details", payload);
  return res.data;
};

export const uploadAgencyKyc = async (files: {
  companyRegistrationDoc?: File;
  proofOfAddress?: File;
  directorIdDoc?: File;
}) => {
  const fd = new FormData();
  if (files.companyRegistrationDoc) fd.append("companyRegistrationDoc", files.companyRegistrationDoc);
  if (files.proofOfAddress) fd.append("proofOfAddress", files.proofOfAddress);
  if (files.directorIdDoc) fd.append("directorIdDoc", files.directorIdDoc);
  const res = await api.post("/agency/kyc", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

// Admin
export const getPendingAgencies = async () => {
  const res = await api.get("/agency/admin/pending");
  return res.data as Array<{
    _id: string;
    name: string;
    email: string;
    phone?: string;
    verificationStatus: string;
    agencyDetails?: AgencyDetails;
    createdAt: string;
  }>;
};

export const approveAgency = async (userId: string) => {
  const res = await api.put(`/agency/admin/${userId}/approve`);
  return res.data;
};

export const rejectAgency = async (userId: string, reason?: string) => {
  const res = await api.put(`/agency/admin/${userId}/reject`, { reason });
  return res.data;
};
