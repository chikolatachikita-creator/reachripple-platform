import api from "./client";

export interface VerificationStatus {
  idVerificationStatus: "none" | "pending" | "verified" | "rejected";
  idVerifiedAt: string | null;
}

export const getVerificationStatus = async (): Promise<VerificationStatus> => {
  const res = await api.get<VerificationStatus>("/verification/status");
  return res.data;
};

export const submitVerificationRequest = async (file: File) => {
  const formData = new FormData();
  formData.append("idDocument", file);
  const res = await api.post("/verification/request", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};
