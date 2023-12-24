import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState, store } from '../../app/store';
import {
    fetchAllUserMessagesViaDCRF,
    patchUserMessageViaDCRF,
    subscribeToUserMessageChangesViaDCRF,
} from './UserMessageAPI';
import objectHash from "object-hash";
import { logger } from '../../app/logging';

type UserMessageState = 'CREATED' | 'PRESENTED' | 'ACKNOWLEDGED'

export interface IBackendUserMessage {
    id: number
    title: string
    message: string
    created_at: string
    state: UserMessageState
}

export interface IUserMessage {
    title: string
    message: string
}

type LastRequestStatus = 'success' | 'busy' | 'failed'

export interface IUserMessages {
    userMessages: IBackendUserMessage[]
    lastRequestStatus: LastRequestStatus
    subscribedToUpdates: boolean
}

const initialState: IUserMessages = {
    userMessages: [],
    subscribedToUpdates: false,
    lastRequestStatus: 'success',
}

export const fetchAllUserMessagesAsync = createAsyncThunk(
    'userMessage/fetchAllUserMessagesAsync',
    async () => {
        const response = await fetchAllUserMessagesViaDCRF()
        return response
    }
)

export interface IUserMessageSetState {
    id: number
    state: UserMessageState
}

export const setUserMessageStateAsync = createAsyncThunk(
    'userMessage/setUserMessageStateAsync',
    async (userMessageSetState: IUserMessageSetState, { dispatch }) => {
        // FIXME: this needs a better solution (local messages)
        if (userMessageSetState.id < 0) {
            // just delete the message
            dispatch(deleteLocalUserMessage(userMessageSetState))
        } else {
            return await patchUserMessageViaDCRF(userMessageSetState.id, {state: userMessageSetState.state})
        }
    }
)

const getUpdatedUserMessages = (currentUserMessages: IBackendUserMessage[], updatedUserMessage: IBackendUserMessage) => {
    return currentUserMessages.map((existingUserMessage: IBackendUserMessage) => {
        if (existingUserMessage.id === updatedUserMessage.id) {
            return updatedUserMessage
        } else {
            return existingUserMessage
        }
    })
}

export const userMessagesSlice = createSlice({
    name: 'userMessages',
    initialState,
    reducers: {
        showUserMessage: (state, action: PayloadAction<IUserMessage>) => {
            // FIXME: this should not misuse the "backend message" handling (haX0ring FTF)
            let localMessage: IBackendUserMessage = {
                id: 0,
                title: action.payload.title,
                message: action.payload.message,
                created_at: 'ZZZZZ',
                state: 'CREATED',
            }
            localMessage.id = Number(`0x${objectHash(localMessage)}`) * -1
            state.userMessages.push(localMessage)
        },
        addLocalUserMessage: (state, action: PayloadAction<IBackendUserMessage>) => {
            state.userMessages.push(action.payload)
        },
        deleteLocalUserMessage: (state, action: PayloadAction<IBackendUserMessage | IUserMessageSetState>) => {
            state.userMessages = state.userMessages.filter( userMessage => userMessage.id !== action.payload.id )
        },
        updateLocalUserMessage: (state, action: PayloadAction<IBackendUserMessage>) => {
            state.userMessages = getUpdatedUserMessages(state.userMessages, action.payload)
        },
        subscribeToUserMessageChanges: (state) => {
            if (state.subscribedToUpdates) {
                return
            }
            const callback = (userMessage: IBackendUserMessage, action: string) => {
                logger.debug(`user message subscription callback (action: ${action})`)
                switch(action) {
                    case 'create':
                        store.dispatch(addLocalUserMessage(userMessage))
                        break
                    case 'update':
                        store.dispatch(updateLocalUserMessage(userMessage))
                        break
                    case 'delete':
                        // NOTE: We get the action.payload with a non null value here. That means,
                        // that this callback and the deleteLocalRemoteJob are responsible for
                        // keeping the state up to date when a remote job gets deleted.
                        // deleteRemoteJobAsync.fulfilled does only get a null value
                        store.dispatch(deleteLocalUserMessage(userMessage))
                        break
                    default:
                        logger.debug('FIXME: unexpected action')
                }
            }
            subscribeToUserMessageChangesViaDCRF(callback)
            state.subscribedToUpdates = true
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAllUserMessagesAsync.pending, (state) => {
                state.lastRequestStatus = 'busy'
            })
            .addCase(fetchAllUserMessagesAsync.fulfilled, (state, action) => {
                state.lastRequestStatus = 'success'
                state.userMessages = action.payload
            })
            .addCase(fetchAllUserMessagesAsync.rejected, (state) => {
                state.lastRequestStatus = 'failed'
            })
            .addCase(setUserMessageStateAsync.fulfilled, (state, action) => {
                state.lastRequestStatus = 'success'
                // there wont be a payload if this is a "local message"
                if (action.payload !== undefined) {
                    state.userMessages = getUpdatedUserMessages(state.userMessages, action.payload)
                }
            })
    },
})

export const { addLocalUserMessage, deleteLocalUserMessage, updateLocalUserMessage, subscribeToUserMessageChanges, showUserMessage } = userMessagesSlice.actions;

export const selectUserMessages = (state: RootState) => state.userMessages.userMessages
export const selectLastRequestStatus = (state: RootState) => state.userMessages.lastRequestStatus
export const selectIsSubscribed = (state: RootState) => state.userMessages.subscribedToUpdates

export default userMessagesSlice.reducer