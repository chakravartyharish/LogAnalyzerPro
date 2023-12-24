import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState, store } from '../../app/store';
import {
    fetchAllUDSScanRunsViaDCRF,
    subscribeToUDSScanRunChangesViaDCRF,
    patchUDSScanRunViaDCRF,
    createUDSScanRunViaDCRF,
    deleteUDSScanRunViaDCRF,
} from './UDSScanRunsAPI';
import {
    showUserMessage,
} from '../user_message/UserMessageSlice';
import { LastRequestStatus } from '../misc/GlobalTypes'
import { logger } from '../../app/logging';

export type TUDSScanRunState = 'CREATED' | 'RUNNING' | 'PAUSED' | 'FINISHED_SUCCESS' | 'FINISHED_ERROR'
export type TUDSScanRunDesiredState = 'RUNNING' | 'PAUSED' | 'FINISHED'

export type TLogFileType = 'SCANNER' | 'UDS' | 'CAN'

export enum AnalyzerResultTypeEnum  {
    INFORMAL = 'INFORMAL',
    WARNING =  'WARNING',
    VULNERABILITY = 'VULNERABILITY'
}
export type TAnalyzerResultType = `${AnalyzerResultTypeEnum}`

export interface IScanRunFindingLogFile {
    id: number
    created_at: string
    log_type: TLogFileType
    log_file: string    // this field holds the full URL and not just the name
}

export interface IAnalyzerResult {
    created_at: string
    name: string
    info: string
    result_type: TAnalyzerResultType
}

export interface IUDSScanRunFinding {
    id: number
    results_file: string    // this field holds the full URL and not just the name
    log_files: IScanRunFindingLogFile[]
    created_at: string
    analyzer_results: IAnalyzerResult[]
}

// TODO: the current "configuration data structure" is a bit messy (too many levels / everything just one big blob), come up with a better solution / "optimize" the current one

export interface IUDSScanRunConfig {
    name: string
    uds_scan_arguments: any     // TODO: add a real type description
    remote_scan_selected_channel?: string
/*
    // TODO: add all the "non dynamic" stuff to the django model (scan_timeout / test_cases / timeout ...)
    scan_timeout: int
    test_cases: List[str]
    timeout: Union[float, int]
    verbose: Optional[bool]
    debug: Optional[bool]
    unittest: Optional[bool]
    UDS_DSCEnumerator_kwargs: UDS_Enumerator_kwargs
    UDS_TPEnumerator_kwargs: UDS_TPEnumerator_kwargs
    UDS_EREnumerator_kwargs: UDS_EREnumerator_kwargs
    UDS_CCEnumerator_kwargs: UDS_CCEnumerator_kwargs
    UDS_RDBPIEnumerator_kwargs: UDS_RDBPIEnumerator_kwargs
    UDS_ServiceEnumerator_kwargs: UDS_ServiceEnumerator_kwargs
    UDS_RDBIEnumerator_kwargs: UDS_RDBIEnumerator_kwargs
    UDS_RDBISelectiveEnumerator_kwargs: UDS_RDBISelectiveEnumerator_kwargs
    UDS_RDBIRandomEnumerator_kwargs: UDS_RDBIRandomEnumerator_kwargs
    UDS_WDBIEnumerator_kwargs: UDS_WDBIEnumerator_kwargs
    UDS_WDBISelectiveEnumerator_kwargs: UDS_WDBISelectiveEnumerator_kwargs
    UDS_SAEnumerator_kwargs: UDS_SAEnumerator_kwargs
    UDS_SA_XOR_Enumerator_kwargs: UDS_SA_XOR_Enumerator_kwargs
    UDS_RCEnumerator_kwargs: UDS_RCEnumerator_kwargs
    UDS_RCStartEnumerator_kwargs: UDS_RCStartEnumerator_kwargs
    UDS_RCSelectiveEnumerator_kwargs: UDS_RCSelectiveEnumerator_kwargs
    UDS_IOCBIEnumerator_kwargs: UDS_IOCBIEnumerator_kwargs
    UDS_RMBARandomEnumerator_kwargs: UDS_RMBARandomEnumerator_kwargs
    UDS_RMBASequentialEnumerator_kwargs: UDS_RMBASequentialEnumerator_kwargs
    UDS_RMBAEnumerator_kwargs: UDS_RMBAEnumerator_kwargs
    UDS_RDEnumerator_kwargs: UDS_RDEnumerator_kwargs
    UDS_TDEnumerator_kwargs: UDS_TDEnumerator_kwargs
*/
}

export interface IUDSScanRun {
    id: number
    hw_interface?: string | null
    remote_runner?: number | null
    remote_job?: number
    isotp_endpoint: number
    scan_run_findings: IUDSScanRunFinding[]
    state: TUDSScanRunState
    desired_state: TUDSScanRunDesiredState
    error_description: string
    created_at: string
    finished_at: string
    config: IUDSScanRunConfig
    smart_scan: boolean
    security_access_key_generation_server_url?: string | null
    scan_was_aborted: boolean
}

export interface IUDSScanRuns {
    scanRuns: IUDSScanRun[]
    lastRequestStatus: LastRequestStatus
    subscribedToUpdates: boolean
}

export const fetchAllUDSScanRunsAsync = createAsyncThunk(
    'udsScanRun/fetchAllUDSScanRunsAsync',
    async (_, { dispatch, rejectWithValue }) => {
        try {
            return await fetchAllUDSScanRunsViaDCRF()
        } catch (rejectedValue) {
            // @ts-ignore
            const error_message = JSON.stringify(rejectedValue.errors)
            dispatch(showUserMessage({ title: 'fetchAllUDSScanRunsAsync failed', message: error_message }))
            return rejectWithValue(rejectedValue)
        }
    }
)

export interface IUpdateUDSScanRun {
   id: number
   data: {
        hw_interface?: string | null
        remote_runner?: number | null
        isotp_endpoint?: number
        state?: TUDSScanRunState
        desired_state?: TUDSScanRunDesiredState
        error_description?: string
        finished_at?: string | null
        config?: IUDSScanRunConfig
        smart_scan?: boolean
   }
}

export const updateUDSScanRunAsync = createAsyncThunk(
    'udsScanRun/updateUDSScanRunAsync',
    async (updatedScanRun: IUpdateUDSScanRun, { dispatch, rejectWithValue }) => {
        try {
            return await patchUDSScanRunViaDCRF(updatedScanRun.id, updatedScanRun.data)
        } catch (rejectedValue) {
            // @ts-ignore
            const error_message = JSON.stringify(rejectedValue.errors)
            dispatch(showUserMessage({ title: 'updateUDSScanRunAsync failed', message: error_message }))
            return rejectWithValue(rejectedValue)
        }
    }
)

export interface ICreateUDSScanRun {
    hw_interface?: string | null
    remote_runner?: number | null
    isotp_endpoint: number
    config: IUDSScanRunConfig
    smart_scan: boolean
}

export const createUDSScanRunAsync = createAsyncThunk(
    'udsScanRun/createUDSScanRunAsync',
    async (newScanRun: ICreateUDSScanRun, { dispatch, rejectWithValue }) => {
        try {
            return await createUDSScanRunViaDCRF(newScanRun)
        } catch (rejectedValue) {
            // @ts-ignore
            const error_message = JSON.stringify(rejectedValue.errors)
            dispatch(showUserMessage({ title: 'createUDSScanRunAsync failed', message: error_message }))
            return rejectWithValue(rejectedValue)
        }
    }
)

export const deleteUDSScanRunAsync = createAsyncThunk(
    'udsScanRun/deleteUDSScanRunAsync',
    async (id: number, { dispatch, rejectWithValue }) => {
        try {
            return await deleteUDSScanRunViaDCRF(id)
        } catch (rejectedValue) {
            // @ts-ignore
            const error_message = JSON.stringify(rejectedValue.errors)
            dispatch(showUserMessage({ title: 'deleteUDSScanRunAsync failed', message: error_message }))
            return rejectWithValue(rejectedValue)
        }
    }
)

const getUpdatedUDSScanRuns = (currentScanRuns: IUDSScanRun[], updatedScanRun: IUDSScanRun) => {
    return currentScanRuns.map((existingScanRun: IUDSScanRun) => {
        if (existingScanRun.id === updatedScanRun.id) {
            return updatedScanRun
        } else {
            return existingScanRun
        }
    })
}

const initialState: IUDSScanRuns = {
    scanRuns: [],
    subscribedToUpdates: false,
    lastRequestStatus: 'success',
}

export const udsScanRunsSlice = createSlice({
    name: 'udsScanRuns',
    initialState,
    reducers: {
        addLocalUDSScanRun: (state: { scanRuns: IUDSScanRun[] }, action: PayloadAction<IUDSScanRun>) => {
            if (!state.scanRuns.some((scanRun: { id: number }) => scanRun.id === action.payload.id)) {
                state.scanRuns.push(action.payload)
            }
        },
        deleteLocalUDSScanRun: (state: { scanRuns: any[] }, action: PayloadAction<IUDSScanRun>) => {
            state.scanRuns = state.scanRuns.filter( (scanRun: { id: number }) => scanRun.id !== action.payload.id )
        },
        updateLocalUDSScanRun: (state: { scanRuns: IUDSScanRun[] }, action: PayloadAction<IUDSScanRun>) => {
            state.scanRuns = getUpdatedUDSScanRuns(state.scanRuns, action.payload)
        },
        subscribeToUDSScanRunChanges: (state: { subscribedToUpdates: boolean }) => {
            if (state.subscribedToUpdates) {
                return
            }
            const callback = (scanRun: IUDSScanRun | undefined, action: string) => {
                logger.debug(`uds scan run subscription callback (action: ${action})`)
                switch(action) {
                    case 'create':
                        store.dispatch(addLocalUDSScanRun(scanRun!))
                        break
                    case 'update':
                        store.dispatch(updateLocalUDSScanRun(scanRun!))
                        break
                    case 'delete':
                        // NOTE: We get the action.payload with a non null value here. That means,
                        // that this callback and the deleteLocalRemoteJob are responsible for
                        // keeping the state up to date when a remote job gets deleted.
                        // deleteRemoteJobAsync.fulfilled does only get a null value
                        store.dispatch(deleteLocalUDSScanRun(scanRun!))
                        break
                    case 'force-refetch':
                        store.dispatch(fetchAllUDSScanRunsAsync())
                        break
                    default:
                        logger.debug('FIXME: unexpected action')
                }
            }
            subscribeToUDSScanRunChangesViaDCRF(callback)
            state.subscribedToUpdates = true
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAllUDSScanRunsAsync.pending, (state) => {
                state.lastRequestStatus = 'busy'
            })
            .addCase(fetchAllUDSScanRunsAsync.fulfilled, (state, action: PayloadAction<IUDSScanRun[]>) => {
                state.lastRequestStatus = 'success'
                state.scanRuns = action.payload
            })
            .addCase(fetchAllUDSScanRunsAsync.rejected, (state, action) => {
                // @ts-ignore
                const error_message = JSON.stringify(action.payload.errors)
                logger.debug(`failed to fetch scan runs - ${error_message}`)
                state.lastRequestStatus = 'failed'
            })
            .addCase(createUDSScanRunAsync.pending, (state) => {
                state.lastRequestStatus = 'busy'
            })
            .addCase(createUDSScanRunAsync.fulfilled, (state, action: PayloadAction<IUDSScanRun>) => {
                state.lastRequestStatus = 'success'
                if (!state.scanRuns.some(scanRun => scanRun.id === action.payload.id)) {
                    state.scanRuns.push(action.payload)
                }
            })
            .addCase(createUDSScanRunAsync.rejected, (state, action) => {
                // @ts-ignore
                const error_message = JSON.stringify(action.payload.errors)
                logger.debug(`failed to create scan run - ${error_message}`)
                state.lastRequestStatus = 'failed'
            })
            .addCase(updateUDSScanRunAsync.pending, (state) => {
                state.lastRequestStatus = 'busy'
            })
            .addCase(updateUDSScanRunAsync.fulfilled, (state, action: PayloadAction<IUDSScanRun>) => {
                state.lastRequestStatus = 'success'
                state.scanRuns = getUpdatedUDSScanRuns(state.scanRuns, action.payload)
            })
            .addCase(updateUDSScanRunAsync.rejected, (state, action) => {
                // @ts-ignore
                const error_message = JSON.stringify(action.payload.errors)
                logger.debug(`failed to update scan run - ${error_message}`)
                state.lastRequestStatus = 'failed'
            })
            .addCase(deleteUDSScanRunAsync.pending, (state) => {
                state.lastRequestStatus = 'busy'
            })
            .addCase(deleteUDSScanRunAsync.fulfilled, (state, action: PayloadAction<IUDSScanRun>) => {
                state.lastRequestStatus = 'success'
                // NOTE: action.payload.id is not available here (null value; update, fetch and create get a non null value) 
                // so just leave the state as it is (the subscription will trigger the deletion).
                // This means we are dependent on a functioning subscription callback
            })
            .addCase(deleteUDSScanRunAsync.rejected, (state) => {
                state.lastRequestStatus = 'failed'
            })
    },
})

export const { addLocalUDSScanRun,
               deleteLocalUDSScanRun,
               updateLocalUDSScanRun,
               subscribeToUDSScanRunChanges } = udsScanRunsSlice.actions

export const selectUDSScanRuns = (state: RootState) => state.udsScanRuns.scanRuns
export const selectUDSScanRunReports = (state: RootState) => state.udsScanRuns.scanRuns.flatMap(scanRun => scanRun.scan_run_findings)
export const selectLastUDSScanRunRequestStatus = (state: RootState) => state.udsScanRuns.lastRequestStatus
export const selectUDSScanRunIsSubscribed = (state: RootState) => state.udsScanRuns.subscribedToUpdates

export default udsScanRunsSlice.reducer