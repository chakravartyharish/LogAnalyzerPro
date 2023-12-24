import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState, store } from "../../app/store";
import { showUserMessage } from "../user_message/UserMessageSlice";
import { fetchUserDataViaDCRF, patchUserDataViaDCRF, subscribeToUserDataChangesViaDCRF } from "./UserDataAPI";
import { LastRequestStatus } from "../misc/GlobalTypes";
import { logger } from "../../app/logging";

export interface IUserData {
    id: number
    user_data: string
    created_at: string
    updated_at: string
}

export const fetchAllUserDataAsync = createAsyncThunk(
    'UserData/fetchAllUserDataAsync',
    async (_, { dispatch, rejectWithValue }) => {
        try {
            return await fetchUserDataViaDCRF()
        } catch (rejectedValue) {
            // @ts-ignore
            const error_message = JSON.stringify(rejectedValue.errors)
            dispatch(showUserMessage({ title: 'fetchAllUserDataAsync failed', message: error_message }))
            return rejectWithValue(rejectedValue)
        }
    }
)

export interface IUpdateUserDataObject {
    [key: string]: any
}

const backendModelPK_Key = '__backend_model_pk'

export const updateUserDataObjectAsync = createAsyncThunk(
    'UserData/updateUserDataObjectAsync',
    async (updatedUserDataObject: IUpdateUserDataObject, { dispatch, rejectWithValue }) => {
        try {
            const updatedUserData = { user_data: Buffer.from(JSON.stringify(updatedUserDataObject)).toString('base64') }
            return await patchUserDataViaDCRF(updatedUserDataObject[backendModelPK_Key], updatedUserData)
        } catch (rejectedValue) {
            // @ts-ignore
            const error_message = JSON.stringify(rejectedValue.errors)
            dispatch(showUserMessage({ title: 'updateUserDataObjectAsync failed', message: error_message }))
            return rejectWithValue(rejectedValue)
        }
    }
)

export interface IUserDataState {
    userData: IUserData
    subscribedToUpdates: boolean
    lastRequestStatus: LastRequestStatus
}

const initialState: IUserDataState = {
    userData: {} as IUserData,
    subscribedToUpdates: false,
    lastRequestStatus: 'success',
}

export const userDataSlice = createSlice({
    name: 'userData',
    initialState,
    reducers: {
        updateLocalUserData: (state, action: PayloadAction<IUserData>) => {
            state.userData = action.payload
        },
        subscribeToUserDataChanges: (state) => {
            if (state.subscribedToUpdates) {
                return
            }
            const callback = (userData: IUserData, action: string) => {
                logger.debug(`user data subscription callback (action: ${action})`)
                switch(action) {
                    case 'update':
                        store.dispatch(updateLocalUserData(userData))
                        break
                    default:
                        logger.debug('FIXME: unexpected action')
                }
            }
            subscribeToUserDataChangesViaDCRF(callback)
            state.subscribedToUpdates = true
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAllUserDataAsync.pending, (state) => {
                state.lastRequestStatus = 'busy'
            })
            .addCase(fetchAllUserDataAsync.fulfilled, (state, action: PayloadAction<IUserData[]>) => {
                state.lastRequestStatus = 'success'
                state.userData = action.payload[0]
            })
            .addCase(fetchAllUserDataAsync.rejected, (state) => {
                state.lastRequestStatus = 'failed'
            })
            .addCase(updateUserDataObjectAsync.pending, (state) => {
                state.lastRequestStatus = 'busy'
            })
            .addCase(updateUserDataObjectAsync.fulfilled, (state, action: PayloadAction<IUserData>) => {
                state.lastRequestStatus = 'success'
                state.userData = action.payload
            })
            .addCase(updateUserDataObjectAsync.rejected, (state) => {
                state.lastRequestStatus = 'failed'
            })
    }
})

export const { updateLocalUserData, subscribeToUserDataChanges } = userDataSlice.actions
export const selectUserData = (state: RootState) => state.userData.userData.user_data
export const selectUserDataAsObject = (state: RootState): IUpdateUserDataObject | undefined => {
    let userData: IUpdateUserDataObject
    try {
        userData = JSON.parse(Buffer.from(state.userData.userData.user_data, 'base64').toString('binary'))
    } catch {
        return undefined
    }
    userData[backendModelPK_Key] = state.userData.userData.id
    return userData
}

export const selectLastUserDataRequestStatus = (state: RootState) => state.userData.lastRequestStatus
export const selectUserDataIsSubscribed = (state: RootState) => state.userData.subscribedToUpdates

export default userDataSlice.reducer
