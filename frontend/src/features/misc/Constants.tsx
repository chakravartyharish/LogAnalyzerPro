import { IStringMapping } from "./Util";

export const fileExtensionToLanguageMapping: IStringMapping = {
    "py": "python",
    "sh": "shell",
    "json": "json",
    "": "plaintext"
}

export const licenseFeatureUnlimitedCountMarker = -1

export const licenseFeatureKeyFreeLicense = "FreeLicense"
export const licenseFeatureKeyMaxAnalyzerResults = "MaxAnalyzerResults"
export const licenseFeatureKeyMaxUDSScanTime = "MaxUDSScanTime"
export const licenseFeatureKeyMaxRemoteRunners = "MaxRemoteRunners"

export const licenseFeatureDefaultValueMaxAnalyzerResults = 10
export const licenseFeatureDefaultValueMaxUDSScanTime = 300

export const userDataEulaAccepted = "EULAAccepted"
export const userDataDarkThemeEnabled = "DarkThemeEnabled"
export const userDataSelectedLocale = "SelectedLocale"
export const userDataExpertModeEnabled = "ExpertModeEnabled"

export const userDataPossibleKeys = [userDataEulaAccepted, userDataDarkThemeEnabled, userDataSelectedLocale, userDataExpertModeEnabled]

export const defaultUserGroupName = "Default"

export const groupsChangedUserMessageTitle = "Groups changed"

export const scannerTimeoutLogLineSmartScanRun = "Finished execution time for scan"
export const scannerTimeoutLogLineNormalScanRun = "Execution time exceeded. Terminating scan!"

export const remoteTestcasesMetadataAllTestcasesKey = "all"

export const remoteJobCSVResultsFileArtifactType = "testcase_results"

export const tablePageRowCountOptions = [25, 50] as const