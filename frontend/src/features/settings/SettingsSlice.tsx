import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../../app/store";
import { logger } from "../../app/logging";
import { isRunningAs } from "../misc/Util";

export interface IBugReportPacket {
    bugReportText: string
}

interface ISettingsConfiguration {
    isExpandedNavTree: boolean
    isDarkTheme: boolean
    locale: string

    // TODO: move to its own slice
    //       (does not really belong here)
    isLoggedIn: boolean
}

export interface ISettings {
    config: ISettingsConfiguration
}

const initialState = { config: { 
    isExpandedNavTree: true, 
    isDarkTheme: false, 
    locale: "en",

    isLoggedIn: false,
} } as ISettings

export const sendBugReportAsync = createAsyncThunk(
    'settings/sendBugReport',
    async (bugReportPacket: IBugReportPacket) => {
        try {
            const response = await fetch("https://www.dissec.to/bugs", {
                method: 'POST',
                body: JSON.stringify({"BugReportText": bugReportPacket.bugReportText}),
                headers: {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'}
            })
            return response
        } catch(error) {
            logger.debug(`sendBugReportAsync error: ${error}`)
        }
    }
)

export const settingsSlice = createSlice({
    name: 'settings',
    initialState,
    reducers: {
        toggleNavigationTree(state) {
            state.config.isExpandedNavTree = !state.config.isExpandedNavTree
        },
        toggleTheme(state) {
            state.config.isDarkTheme = !state.config.isDarkTheme
        },
        setDarkTheme(state) {
            state.config.isDarkTheme = true
        },
        setLightTheme(state) {
            state.config.isDarkTheme = false
        },
        changeLocale(state, action: PayloadAction<string>) {
            state.config.locale = action.payload
        },
        setIsLoggedIn(state, action: PayloadAction<boolean>) {
            state.config.isLoggedIn = action.payload
        }
    }
})

export const selectSettings = (state: RootState) => state.settings.config
export const selectIsLoggedIn = (state: RootState) => {
    if (isRunningAs('HydraScope')) {
        // always "logged in" when running as "HydraScope"
        return true
    }
    return state.settings.config.isLoggedIn
}

export const { toggleNavigationTree, toggleTheme, changeLocale, setDarkTheme, setLightTheme, setIsLoggedIn } = settingsSlice.actions
export default settingsSlice.reducer