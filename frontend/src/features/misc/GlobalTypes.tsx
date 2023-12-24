import { userDataPossibleKeys, tablePageRowCountOptions } from "./Constants"

export type LastRequestStatus = 'success' | 'busy' | 'failed'
export type TSortOrder = 'asc' | 'desc'
export type THeadAlign = "left" | "inherit" | "center" | "right" | "justify" | undefined
export type TPersonalityName = "HydraScope" | "HydraVision"
export type TUserDataKey = typeof userDataPossibleKeys[number]
export type TTablePageRowCount = typeof tablePageRowCountOptions[number]
export type TTestcaseResult = "SUCCESSFULL" | "ERROR" | "WARNING" | "NOT_EXECUTED"