import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState, store } from '../../app/store';
import {
    fetchAllBackendEventsViaDCRF,
    subscribeToBackendEventChangesViaDCRF,
} from './BackendEventAPI';
import { logger } from '../../app/logging';

type BackendEventLevel = 'FATAL_ERROR' | 'ERROR' | 'WARNING' | 'INFO' | 'DEBUG' | 'VERBOSE'
type BackendEventType = 'HWIF' | 'SCANNER' | 'GENERAL'

export interface IBackendBackendEvent {
    id: number
    unique_identifier: string
    level: BackendEventLevel
    type: BackendEventType
    template: string
    extras: any
    timestamp: Date
}

type LastRequestStatus = 'success' | 'busy' | 'failed'

export interface IBackendEvents {
    backendEvents: IBackendBackendEvent[]
    displayedBackendEventId: number | undefined
    lastRequestStatus: LastRequestStatus
    subscribedToUpdates: boolean
}

const initialState: IBackendEvents = {
    backendEvents: [],
    displayedBackendEventId: undefined,
    subscribedToUpdates: false,
    lastRequestStatus: 'success',
}

export const fetchAllBackendEventsAsync = createAsyncThunk(
    'backendEvent/fetchAllBackendEventsAsync',
    async () => {
        const response = await fetchAllBackendEventsViaDCRF()
        return response
    }
)

const getUpdatedBackendEvents = (currentBackendEvents: IBackendBackendEvent[], updatedBackendEvent: IBackendBackendEvent) => {
    return currentBackendEvents.map((existingBackendEvent: IBackendBackendEvent) => {
        if (existingBackendEvent.id === updatedBackendEvent.id) {
            return updatedBackendEvent
        } else {
            return existingBackendEvent
        }
    })
}

export const backendEventsSlice = createSlice({
    name: 'backendEvents',
    initialState,
    reducers: {
        showBackendEvent: (state, action: PayloadAction<number|undefined>) => {
            state.displayedBackendEventId = action.payload
        },
        addLocalBackendEvent: (state, action: PayloadAction<IBackendBackendEvent>) => {
            state.backendEvents.push(action.payload)
        },
        deleteLocalBackendEvent: (state, action: PayloadAction<IBackendBackendEvent>) => {
            state.backendEvents = state.backendEvents.filter( backendEvent => backendEvent.id !== action.payload.id )
        },
        updateLocalBackendEvent: (state, action: PayloadAction<IBackendBackendEvent>) => {
            state.backendEvents = getUpdatedBackendEvents(state.backendEvents, action.payload)
        },
        subscribeToBackendEventChanges: (state) => {
            if (state.subscribedToUpdates) {
                return
            }
            const callback = (backendEvent: IBackendBackendEvent, action: string) => {
                logger.debug(`backend event subscription callback (action: ${action})`)
                switch(action) {
                    case 'create':
                        store.dispatch(addLocalBackendEvent(backendEvent))
                        break
                    case 'update':
                        store.dispatch(updateLocalBackendEvent(backendEvent))
                        break
                    case 'delete':
                        // NOTE: We get the action.payload with a non null value here. That means,
                        // that this callback and the deleteLocalRemoteJob are responsible for
                        // keeping the state up to date when a remote job gets deleted.
                        // deleteRemoteJobAsync.fulfilled does only get a null value
                        store.dispatch(deleteLocalBackendEvent(backendEvent))
                        break
                    default:
                        // TODO: handle all missing actions
                        logger.debug('FIXME')
                }
            }
            subscribeToBackendEventChangesViaDCRF(callback)
            state.subscribedToUpdates = true
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAllBackendEventsAsync.pending, (state) => {
                state.lastRequestStatus = 'busy'
            })
            .addCase(fetchAllBackendEventsAsync.fulfilled, (state, action) => {
                state.lastRequestStatus = 'success'
                state.backendEvents = action.payload
            })
            .addCase(fetchAllBackendEventsAsync.rejected, (state) => {
                state.lastRequestStatus = 'failed'
            })
    },
})

export const { addLocalBackendEvent, deleteLocalBackendEvent, updateLocalBackendEvent, subscribeToBackendEventChanges, showBackendEvent } = backendEventsSlice.actions;

export const selectBackendEvent = (id: number) => (state: RootState) => {
    return state.backendEvents.backendEvents.filter( e => e.id === id).pop() ?? undefined
}
export const selectBackendEvents = (state: RootState) => state.backendEvents.backendEvents
export const selectDisplayedBackendEventId = (state: RootState) => state.backendEvents.displayedBackendEventId
export const selectLastRequestStatus = (state: RootState) => state.backendEvents.lastRequestStatus
export const selectIsSubscribed = (state: RootState) => state.backendEvents.subscribedToUpdates

export default backendEventsSlice.reducer