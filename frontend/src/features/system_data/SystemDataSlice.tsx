import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit"
import { RootState } from "../../app/store"
import { fetchSystemDataViaDCRF } from "./SystemDataApi"

//type LastRequestStatus = 'success' | 'busy' | 'failed'

export const fetchSystemDataAsync = createAsyncThunk(
    'systemData/fetchSystemDataAsync',
    async () => {
        const response = await fetchSystemDataViaDCRF()
        return response
    }
)

export type TProductPersonalityName = "HydraVision" | "HydraScope"
export type TAppEnvironment = "production" | "test" | "development"

export interface IInfluxDBEnv {
    use_https: boolean
    port: number
    bucket: string
    org: string
    access_token: string
    url: string
}

export interface IRemoteTestcase {
    name: string
    description: string
    long_description: string
    url: string
}

export interface IRemoteTestcases {
    [category: string]: IRemoteTestcase[]
}

export interface ISystemData {
    influxdb_env: IInfluxDBEnv
    hardware_id: string
    backend_version: string
    license_request: string
    app_environment: TAppEnvironment
    product_personality_name: TProductPersonalityName
    remote_testcases_dict: IRemoteTestcases
}

export interface ISystemDataState {
    systemData: ISystemData
    lastRequestStatus: string
}

const initialState: ISystemDataState = {
    systemData: {} as ISystemData,
    lastRequestStatus: 'success',
}

export const systemDataSlice = createSlice({
    name: 'systemData',
    initialState,
    reducers: {
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchSystemDataAsync.pending, (state) => {
                state.lastRequestStatus = 'busy'
            })
            .addCase(fetchSystemDataAsync.fulfilled, (state, action: PayloadAction<ISystemData[]>) => {
                state.lastRequestStatus = 'success'
                state.systemData = action.payload[0]
            })
            .addCase(fetchSystemDataAsync.rejected, (state) => {
                state.lastRequestStatus = 'failed'
            })
    }
})

export const selectSystemData = (state: RootState) => state.systemData.systemData

export default systemDataSlice.reducer